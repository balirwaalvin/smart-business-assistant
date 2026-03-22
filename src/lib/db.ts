import { Pool } from 'pg';

// Singleton pattern: reuse the same pool across hot reloads in development
// Without this, Next.js dev mode creates a new pool on every file change,
// exhausting database connections and causing timeouts.
const globalForDb = globalThis as unknown as { pool: Pool | undefined };

function getPool(): Pool {
  if (!globalForDb.pool) {
    globalForDb.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      max: 5,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });

    // Handle unexpected errors on idle clients
    globalForDb.pool.on('error', (err) => {
      console.error('Unexpected error on idle database client:', err);
    });
  }
  return globalForDb.pool;
}

const pool = getPool();

// Initialize database tables (safe — uses IF NOT EXISTS, never drops)
export async function initDb() {
  const client = await pool.connect();
  try {
    // Create tables with user_id NOT NULL enforced from the start
    await client.query(`
      CREATE TABLE IF NOT EXISTS transactions (
        id SERIAL PRIMARY KEY,
        user_id TEXT NOT NULL,
        type TEXT NOT NULL,
        product TEXT,
        quantity INTEGER,
        customer TEXT,
        payment_type TEXT,
        amount NUMERIC(12, 2),
        cost_price NUMERIC(12, 2) DEFAULT 0,
        date TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS inventory (
        id SERIAL PRIMARY KEY,
        user_id TEXT NOT NULL,
        product TEXT NOT NULL,
        quantity INTEGER NOT NULL DEFAULT 0,
        price NUMERIC(12, 2) NOT NULL DEFAULT 0,
        cost_price NUMERIC(12, 2) NOT NULL DEFAULT 0,
        low_stock_threshold INTEGER NOT NULL DEFAULT 5,
        UNIQUE(user_id, product)
      );

      CREATE TABLE IF NOT EXISTS credit_ledger (
        id SERIAL PRIMARY KEY,
        user_id TEXT NOT NULL,
        customer TEXT NOT NULL,
        balance NUMERIC(12, 2) NOT NULL DEFAULT 0,
        UNIQUE(user_id, customer)
      );

      -- Create indexes for faster queries
      CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
      CREATE INDEX IF NOT EXISTS idx_inventory_user_id ON inventory(user_id);
      CREATE INDEX IF NOT EXISTS idx_credit_ledger_user_id ON credit_ledger(user_id);
    `);

    // Safe schema migrations — wrapped individually so failures don't cascade
    const migrations = [
      // Enforce NOT NULL on user_id
      `ALTER TABLE transactions ALTER COLUMN user_id SET NOT NULL`,
      `ALTER TABLE inventory ALTER COLUMN user_id SET NOT NULL`,
      `ALTER TABLE credit_ledger ALTER COLUMN user_id SET NOT NULL`,
      // Add new columns to existing tables
      `ALTER TABLE transactions ADD COLUMN IF NOT EXISTS cost_price NUMERIC(12, 2) DEFAULT 0`,
      `ALTER TABLE inventory ADD COLUMN IF NOT EXISTS cost_price NUMERIC(12, 2) NOT NULL DEFAULT 0`,
      `ALTER TABLE inventory ADD COLUMN IF NOT EXISTS low_stock_threshold INTEGER NOT NULL DEFAULT 5`,
    ];

    for (const migration of migrations) {
      try {
        await client.query(migration);
      } catch {
        // Constraint likely already exists — safe to ignore
      }
    }
  } finally {
    client.release();
  }
}

// Helper functions
export async function addTransaction(data: any, userId: string) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const txQuantity = Number(data.quantity) || 0;
    const txAmount = Number(data.amount) || 0;
    let transactionCostPrice = Number(data.cost_price) || 0;

    if (data.type === 'sale' && data.product) {
      const inventoryCostResult = await client.query(
        `SELECT cost_price FROM inventory WHERE user_id = $1 AND product = $2 LIMIT 1`,
        [userId, data.product]
      );
      if (inventoryCostResult.rows.length > 0) {
        transactionCostPrice = Number(inventoryCostResult.rows[0].cost_price) || transactionCostPrice;
      }
    }

    if (data.type === 'purchase' && txQuantity > 0 && txAmount > 0 && transactionCostPrice <= 0) {
      transactionCostPrice = txAmount / txQuantity;
    }

    // Insert the transaction
    const result = await client.query(
      `INSERT INTO transactions (user_id, type, product, quantity, customer, payment_type, amount, cost_price)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id`,
      [userId, data.type, data.product, data.quantity, data.customer, data.payment_type, data.amount, transactionCostPrice]
    );

    const insertedId = result.rows[0].id;

    // Update inventory if applicable
    if (data.product && data.quantity) {
      if (data.type === 'sale') {
        await client.query(
          `INSERT INTO inventory (user_id, product, quantity)
           VALUES ($1, $2, -$3::integer)
           ON CONFLICT(user_id, product) DO UPDATE SET quantity = inventory.quantity - $3::integer`,
          [userId, data.product, data.quantity]
        );
      } else if (data.type === 'purchase') {
        const sellingPrice = Number(data.price) || 0;
        const purchaseQty = Number(data.quantity) || 0;
        const purchaseUnitCost = transactionCostPrice > 0 ? transactionCostPrice : 0;
        await client.query(
          `INSERT INTO inventory (user_id, product, quantity, price, cost_price)
           VALUES ($1, $2, $3::integer, $4, $5)
           ON CONFLICT(user_id, product)
           DO UPDATE SET
             quantity = inventory.quantity + $3::integer,
             price = CASE WHEN $4 > 0 THEN $4 ELSE inventory.price END,
             cost_price = CASE
               WHEN $5 <= 0 THEN inventory.cost_price
               ELSE (
                 (
                   (GREATEST(inventory.quantity, 0) * inventory.cost_price)
                   + ($3::integer * $5)
                 ) / NULLIF((GREATEST(inventory.quantity, 0) + $3::integer), 0)
               )
             END`,
          [userId, data.product, purchaseQty, sellingPrice, purchaseUnitCost]
        );
      }
    }

    // Update credit ledger if applicable
    if (data.customer && data.payment_type === 'credit') {
      if (data.type === 'sale') {
        await client.query(
          `INSERT INTO credit_ledger (user_id, customer, balance)
           VALUES ($1, $2, $3)
           ON CONFLICT(user_id, customer) DO UPDATE SET balance = credit_ledger.balance + $3`,
          [userId, data.customer, data.amount || 0]
        );
      } else if (data.type === 'payment') {
        await client.query(
          `UPDATE credit_ledger SET balance = balance - $3
           WHERE user_id = $1 AND customer = $2`,
          [userId, data.customer, data.amount || 0]
        );
      }
    }

    await client.query('COMMIT');
    return insertedId;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function getDashboardMetrics(userId: string) {
  const client = await pool.connect();
  try {
    // 1. Cash revenue from sales
    const cashRevenueResult = await client.query(
      `SELECT COALESCE(SUM(amount), 0) as total FROM transactions
       WHERE user_id = $1 AND type = 'sale' AND payment_type = 'cash'`,
      [userId]
    );

    // 2. Total credit sales revenue
    const creditSalesResult = await client.query(
      `SELECT COALESCE(SUM(amount), 0) as total FROM transactions
       WHERE user_id = $1 AND type = 'sale' AND payment_type = 'credit'`,
      [userId]
    );

    // 3. Total outstanding credit balances
    const outstandingCreditResult = await client.query(
      `SELECT COALESCE(SUM(balance), 0) as total FROM credit_ledger WHERE user_id = $1`,
      [userId]
    );

    // 4. Total stock purchases (money spent buying inventory)
    const purchasesResult = await client.query(
      `SELECT COALESCE(SUM(amount), 0) as total FROM transactions
       WHERE user_id = $1 AND type = 'purchase'`,
      [userId]
    );

    // 4b. Total business expenses (salary, rent, utilities, etc.)
    const expensesResult = await client.query(
      `SELECT COALESCE(SUM(amount), 0) as total FROM transactions
       WHERE user_id = $1 AND type = 'expense'`,
      [userId]
    );

    // 5. Total transaction count
    const txCountResult = await client.query(
      `SELECT COUNT(*) as total FROM transactions WHERE user_id = $1`,
      [userId]
    );

    // 6. Revenue in the last 7 days
    const weeklyRevenueResult = await client.query(
      `SELECT COALESCE(SUM(amount), 0) as total FROM transactions
       WHERE user_id = $1 AND type = 'sale' AND payment_type = 'cash'
       AND date >= NOW() - INTERVAL '7 days'`,
      [userId]
    );

    // 7. Top products by units sold
    const topProductsResult = await client.query(
      `SELECT product, SUM(quantity) as total_sold, SUM(amount) as total_revenue
       FROM transactions
       WHERE user_id = $1 AND type = 'sale' AND product IS NOT NULL
       GROUP BY product
       ORDER BY total_sold DESC
       LIMIT 5`,
      [userId]
    );

    // 8. Low stock items (below threshold)
    const lowStockResult = await client.query(
      `SELECT product, quantity, low_stock_threshold
       FROM inventory
       WHERE user_id = $1 AND quantity <= low_stock_threshold
       ORDER BY quantity ASC
       LIMIT 5`,
      [userId]
    );

    // 9. Profit per product using sold quantity and estimated unit cost
    const productProfitsResult = await client.query(
      `WITH sales AS (
         SELECT
           product,
           COALESCE(SUM(amount), 0) AS sales_total,
           COALESCE(SUM(quantity), 0) AS sold_qty
         FROM transactions
         WHERE user_id = $1 AND type = 'sale' AND product IS NOT NULL
         GROUP BY product
       ),
       purchases AS (
         SELECT
           product,
           COALESCE(SUM(amount), 0) AS purchase_total,
           COALESCE(SUM(quantity), 0) AS purchased_qty
         FROM transactions
         WHERE user_id = $1 AND type = 'purchase' AND product IS NOT NULL
         GROUP BY product
       ),
       inv AS (
         SELECT product, COALESCE(cost_price, 0) AS inventory_cost_price
         FROM inventory
         WHERE user_id = $1
       ),
       products AS (
         SELECT product FROM sales
         UNION
         SELECT product FROM purchases
         UNION
         SELECT product FROM inv
       ),
       merged AS (
         SELECT
           p.product,
           COALESCE(s.sales_total, 0) AS sales_total,
           COALESCE(s.sold_qty, 0) AS sold_qty,
           COALESCE(pr.purchase_total, 0) AS purchase_total,
           COALESCE(pr.purchased_qty, 0) AS purchased_qty,
           COALESCE(
             CASE WHEN COALESCE(pr.purchased_qty, 0) > 0 THEN pr.purchase_total / NULLIF(pr.purchased_qty, 0) END,
             inv.inventory_cost_price,
             0
           ) AS unit_cost
         FROM products p
         LEFT JOIN sales s ON s.product = p.product
         LEFT JOIN purchases pr ON pr.product = p.product
         LEFT JOIN inv ON inv.product = p.product
       )
       SELECT
         product,
         sales_total,
         sold_qty,
         purchase_total,
         purchased_qty,
         unit_cost,
         (sold_qty * unit_cost) AS estimated_cogs,
         (sales_total - (sold_qty * unit_cost)) AS profit
       FROM merged
       ORDER BY profit DESC, product ASC
       LIMIT 10`,
      [userId]
    );

    // Calculate financials
    const cashRevenue = parseFloat(cashRevenueResult.rows[0].total);
    const creditSalesRevenue = parseFloat(creditSalesResult.rows[0].total);
    const outstandingCredit = parseFloat(outstandingCreditResult.rows[0].total);
    const totalPurchases = parseFloat(purchasesResult.rows[0].total);
    const totalExpenses = parseFloat(expensesResult.rows[0].total);
    const grossRevenue = cashRevenue + creditSalesRevenue;
    const netProfitLoss = cashRevenue - totalPurchases - totalExpenses;
    const weeklyRevenue = parseFloat(weeklyRevenueResult.rows[0].total);

    return {
      cashRevenue,
      creditSalesRevenue,
      grossRevenue,
      outstandingCredit,
      totalPurchases,
      totalExpenses,
      netProfitLoss,              // positive = profit, negative = loss
      isProfit: netProfitLoss >= 0,
      weeklyRevenue,
      totalTransactions: parseInt(txCountResult.rows[0].total, 10),
      topProducts: topProductsResult.rows.map(row => ({
        product: row.product,
        total_sold: parseInt(row.total_sold, 10),
        total_revenue: parseFloat(row.total_revenue),
      })),
      lowStockItems: lowStockResult.rows.map(row => ({
        product: row.product,
        quantity: parseInt(row.quantity, 10),
        threshold: parseInt(row.low_stock_threshold, 10),
      })),
      productProfits: productProfitsResult.rows.map(row => ({
        product: row.product,
        sales: parseFloat(row.sales_total),
        purchases: parseFloat(row.purchase_total),
        soldQty: parseFloat(row.sold_qty),
        unitCost: parseFloat(row.unit_cost),
        cogs: parseFloat(row.estimated_cogs),
        profit: parseFloat(row.profit),
      })),
    };
  } finally {
    client.release();
  }
}

export async function getRecentTransactions(userId: string) {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT * FROM transactions WHERE user_id = $1 ORDER BY date DESC LIMIT 10`,
      [userId]
    );
    return result.rows;
  } finally {
    client.release();
  }
}

export async function clearUserRecords(userId: string) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const transactionsResult = await client.query(
      `DELETE FROM transactions WHERE user_id = $1`,
      [userId]
    );

    const inventoryResult = await client.query(
      `DELETE FROM inventory WHERE user_id = $1`,
      [userId]
    );

    const creditLedgerResult = await client.query(
      `DELETE FROM credit_ledger WHERE user_id = $1`,
      [userId]
    );

    await client.query('COMMIT');

    return {
      transactionsDeleted: transactionsResult.rowCount ?? 0,
      inventoryDeleted: inventoryResult.rowCount ?? 0,
      creditLedgerDeleted: creditLedgerResult.rowCount ?? 0,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function getInventoryItems(userId: string) {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT id, product, quantity, price, cost_price, low_stock_threshold
       FROM inventory
       WHERE user_id = $1
       ORDER BY product ASC`,
      [userId]
    );

    return result.rows.map(row => ({
      id: row.id,
      product: row.product,
      quantity: Number(row.quantity),
      price: Number(row.price),
      cost_price: Number(row.cost_price),
      low_stock_threshold: Number(row.low_stock_threshold),
    }));
  } finally {
    client.release();
  }
}

export async function upsertInventoryItem(
  userId: string,
  data: {
    product: string;
    quantity?: number;
    price?: number;
    cost_price?: number;
    low_stock_threshold?: number;
  }
) {
  const client = await pool.connect();
  try {
    const quantity = Number.isFinite(data.quantity) ? Number(data.quantity) : 0;
    const price = Number.isFinite(data.price) ? Number(data.price) : 0;
    const costPrice = Number.isFinite(data.cost_price) ? Number(data.cost_price) : 0;
    const lowStockThreshold = Number.isFinite(data.low_stock_threshold)
      ? Number(data.low_stock_threshold)
      : 5;

    const result = await client.query(
      `INSERT INTO inventory (user_id, product, quantity, price, cost_price, low_stock_threshold)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT(user_id, product)
       DO UPDATE SET
         quantity = EXCLUDED.quantity,
         price = EXCLUDED.price,
         cost_price = EXCLUDED.cost_price,
         low_stock_threshold = EXCLUDED.low_stock_threshold
       RETURNING id, product, quantity, price, cost_price, low_stock_threshold`,
      [userId, data.product.trim(), quantity, price, costPrice, lowStockThreshold]
    );

    return result.rows[0];
  } finally {
    client.release();
  }
}

export async function getAllRecordsForExport(
  userId: string,
  options?: {
    fromDate?: string;
    toDate?: string;
  }
) {
  const client = await pool.connect();
  try {
    const txFilters = ['user_id = $1'];
    const txParams: Array<string> = [userId];

    if (options?.fromDate) {
      txFilters.push(`date >= $${txParams.length + 1}`);
      txParams.push(options.fromDate);
    }

    if (options?.toDate) {
      txFilters.push(`date <= $${txParams.length + 1}`);
      txParams.push(options.toDate);
    }

    const txWhereClause = txFilters.join(' AND ');

    const [transactionsResult, inventoryResult, creditLedgerResult, productProfitsResult] = await Promise.all([
      client.query(
        `SELECT id, type, product, quantity, customer, payment_type, amount, cost_price, date
         FROM transactions
         WHERE ${txWhereClause}
         ORDER BY date DESC`,
        txParams
      ),
      client.query(
        `SELECT id, product, quantity, price, cost_price, low_stock_threshold
         FROM inventory
         WHERE user_id = $1
         ORDER BY product ASC`,
        [userId]
      ),
      client.query(
        `SELECT id, customer, balance
         FROM credit_ledger
         WHERE user_id = $1
         ORDER BY customer ASC`,
        [userId]
      ),
      client.query(
        `WITH sales AS (
           SELECT
             product,
             COALESCE(SUM(amount), 0) AS sales_total,
             COALESCE(SUM(quantity), 0) AS sold_qty
           FROM transactions
           WHERE ${txWhereClause} AND type = 'sale' AND product IS NOT NULL
           GROUP BY product
         ),
         purchases AS (
           SELECT
             product,
             COALESCE(SUM(amount), 0) AS purchase_total,
             COALESCE(SUM(quantity), 0) AS purchased_qty
           FROM transactions
           WHERE ${txWhereClause} AND type = 'purchase' AND product IS NOT NULL
           GROUP BY product
         ),
         inv AS (
           SELECT product, COALESCE(cost_price, 0) AS inventory_cost_price
           FROM inventory
           WHERE user_id = $1
         ),
         products AS (
           SELECT product FROM sales
           UNION
           SELECT product FROM purchases
           UNION
           SELECT product FROM inv
         ),
         merged AS (
           SELECT
             p.product,
             COALESCE(s.sales_total, 0) AS sales_total,
             COALESCE(s.sold_qty, 0) AS sold_qty,
             COALESCE(pr.purchase_total, 0) AS purchase_total,
             COALESCE(pr.purchased_qty, 0) AS purchased_qty,
             COALESCE(
               CASE WHEN COALESCE(pr.purchased_qty, 0) > 0 THEN pr.purchase_total / NULLIF(pr.purchased_qty, 0) END,
               inv.inventory_cost_price,
               0
             ) AS unit_cost
           FROM products p
           LEFT JOIN sales s ON s.product = p.product
           LEFT JOIN purchases pr ON pr.product = p.product
           LEFT JOIN inv ON inv.product = p.product
         )
         SELECT
           product,
           sales_total,
           sold_qty,
           purchase_total,
           purchased_qty,
           unit_cost,
           (sold_qty * unit_cost) AS estimated_cogs,
           (sales_total - (sold_qty * unit_cost)) AS profit
         FROM merged
         ORDER BY profit DESC, product ASC`,
        txParams
      ),
    ]);

    return {
      transactions: transactionsResult.rows,
      inventory: inventoryResult.rows,
      creditLedger: creditLedgerResult.rows,
      productProfits: productProfitsResult.rows,
    };
  } finally {
    client.release();
  }
}

export default pool;

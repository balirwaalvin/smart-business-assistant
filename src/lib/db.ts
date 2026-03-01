import { Pool } from 'pg';

// Create a connection pool using DATABASE_URL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 10,          // Maximum connections in pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

// Initialize database tables (safe — uses IF NOT EXISTS, never drops)
export async function initDb() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS transactions (
        id SERIAL PRIMARY KEY,
        user_id TEXT,
        type TEXT NOT NULL,
        product TEXT,
        quantity INTEGER,
        customer TEXT,
        payment_type TEXT,
        amount NUMERIC(12, 2),
        date TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS inventory (
        id SERIAL PRIMARY KEY,
        user_id TEXT,
        product TEXT NOT NULL,
        quantity INTEGER NOT NULL DEFAULT 0,
        price NUMERIC(12, 2) NOT NULL DEFAULT 0,
        UNIQUE(user_id, product)
      );

      CREATE TABLE IF NOT EXISTS credit_ledger (
        id SERIAL PRIMARY KEY,
        user_id TEXT,
        customer TEXT NOT NULL,
        balance NUMERIC(12, 2) NOT NULL DEFAULT 0,
        UNIQUE(user_id, customer)
      );

      -- Create indexes for faster queries
      CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
      CREATE INDEX IF NOT EXISTS idx_inventory_user_id ON inventory(user_id);
      CREATE INDEX IF NOT EXISTS idx_credit_ledger_user_id ON credit_ledger(user_id);
    `);
  } finally {
    client.release();
  }
}

// Helper functions
export async function addTransaction(data: any, userId: string) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Insert the transaction
    const result = await client.query(
      `INSERT INTO transactions (user_id, type, product, quantity, customer, payment_type, amount)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id`,
      [userId, data.type, data.product, data.quantity, data.customer, data.payment_type, data.amount]
    );

    const insertedId = result.rows[0].id;

    // Update inventory if applicable
    if (data.product && data.quantity) {
      if (data.type === 'sale') {
        await client.query(
          `INSERT INTO inventory (user_id, product, quantity)
           VALUES ($1, $2, -$3)
           ON CONFLICT(user_id, product) DO UPDATE SET quantity = inventory.quantity - $3`,
          [userId, data.product, data.quantity]
        );
      } else if (data.type === 'purchase') {
        await client.query(
          `INSERT INTO inventory (user_id, product, quantity)
           VALUES ($1, $2, $3)
           ON CONFLICT(user_id, product) DO UPDATE SET quantity = inventory.quantity + $3`,
          [userId, data.product, data.quantity]
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
  const revenueResult = await pool.query(
    `SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE user_id = $1 AND type = 'sale' AND payment_type = 'cash'`,
    [userId]
  );

  const creditResult = await pool.query(
    `SELECT COALESCE(SUM(balance), 0) as total FROM credit_ledger WHERE user_id = $1`,
    [userId]
  );

  const revenue = parseFloat(revenueResult.rows[0].total);
  const outstandingCredit = parseFloat(creditResult.rows[0].total);

  // Simple estimated profit (assuming 20% margin for MVP)
  const estimatedProfit = revenue * 0.2;

  const topProductsResult = await pool.query(
    `SELECT product, SUM(quantity) as total_sold
     FROM transactions
     WHERE user_id = $1 AND type = 'sale' AND product IS NOT NULL
     GROUP BY product
     ORDER BY total_sold DESC
     LIMIT 5`,
    [userId]
  );

  return {
    revenue,
    estimatedProfit,
    outstandingCredit,
    topProducts: topProductsResult.rows.map(row => ({
      product: row.product,
      total_sold: parseInt(row.total_sold, 10)
    }))
  };
}

export async function getRecentTransactions(userId: string) {
  const result = await pool.query(
    `SELECT * FROM transactions WHERE user_id = $1 ORDER BY date DESC LIMIT 10`,
    [userId]
  );
  return result.rows;
}

export default pool;

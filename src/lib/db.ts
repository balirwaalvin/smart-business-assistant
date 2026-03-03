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
        date TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS inventory (
        id SERIAL PRIMARY KEY,
        user_id TEXT NOT NULL,
        product TEXT NOT NULL,
        quantity INTEGER NOT NULL DEFAULT 0,
        price NUMERIC(12, 2) NOT NULL DEFAULT 0,
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

    // Migrate existing tables: enforce NOT NULL on user_id if not already set
    // Each is wrapped separately so one failure doesn't block the others
    const migrations = [
      `ALTER TABLE transactions ALTER COLUMN user_id SET NOT NULL`,
      `ALTER TABLE inventory ALTER COLUMN user_id SET NOT NULL`,
      `ALTER TABLE credit_ledger ALTER COLUMN user_id SET NOT NULL`,
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
           VALUES ($1, $2, -$3::integer)
           ON CONFLICT(user_id, product) DO UPDATE SET quantity = inventory.quantity - $3::integer`,
          [userId, data.product, data.quantity]
        );
      } else if (data.type === 'purchase') {
        await client.query(
          `INSERT INTO inventory (user_id, product, quantity)
           VALUES ($1, $2, $3::integer)
           ON CONFLICT(user_id, product) DO UPDATE SET quantity = inventory.quantity + $3::integer`,
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
  const client = await pool.connect();
  try {
    const revenueResult = await client.query(
      `SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE user_id = $1 AND type = 'sale' AND payment_type = 'cash'`,
      [userId]
    );

    const creditResult = await client.query(
      `SELECT COALESCE(SUM(balance), 0) as total FROM credit_ledger WHERE user_id = $1`,
      [userId]
    );

    const revenue = parseFloat(revenueResult.rows[0].total);
    const outstandingCredit = parseFloat(creditResult.rows[0].total);

    // Simple estimated profit (assuming 20% margin for MVP)
    const estimatedProfit = revenue * 0.2;

    const topProductsResult = await client.query(
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

export default pool;

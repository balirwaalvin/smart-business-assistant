import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'business.db');
const db = new Database(dbPath);

// Initialize database tables
export function initDb() {
  // For MVP, we'll drop and recreate to apply the new schema with user_id
  db.exec(`
    DROP TABLE IF EXISTS transactions;
    DROP TABLE IF EXISTS inventory;
    DROP TABLE IF EXISTS credit_ledger;

    CREATE TABLE transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT,
      type TEXT NOT NULL, -- 'sale', 'purchase', 'payment'
      product TEXT,
      quantity INTEGER,
      customer TEXT,
      payment_type TEXT, -- 'cash', 'credit'
      amount REAL,
      date DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE inventory (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT,
      product TEXT NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 0,
      price REAL NOT NULL DEFAULT 0,
      UNIQUE(user_id, product)
    );

    CREATE TABLE credit_ledger (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT,
      customer TEXT NOT NULL,
      balance REAL NOT NULL DEFAULT 0,
      UNIQUE(user_id, customer)
    );
  `);
}

// Helper functions
export function addTransaction(data: any, userId: string) {
  const stmt = db.prepare(`
    INSERT INTO transactions (user_id, type, product, quantity, customer, payment_type, amount)
    VALUES (@user_id, @type, @product, @quantity, @customer, @payment_type, @amount)
  `);
  
  const info = stmt.run({ ...data, user_id: userId });
  
  // Update inventory if applicable
  if (data.product && data.quantity) {
    if (data.type === 'sale') {
      db.prepare(`
        INSERT INTO inventory (user_id, product, quantity) 
        VALUES (@user_id, @product, -@quantity)
        ON CONFLICT(user_id, product) DO UPDATE SET quantity = quantity - @quantity
      `).run({ user_id: userId, product: data.product, quantity: data.quantity });
    } else if (data.type === 'purchase') {
      db.prepare(`
        INSERT INTO inventory (user_id, product, quantity) 
        VALUES (@user_id, @product, @quantity)
        ON CONFLICT(user_id, product) DO UPDATE SET quantity = quantity + @quantity
      `).run({ user_id: userId, product: data.product, quantity: data.quantity });
    }
  }

  // Update credit ledger if applicable
  if (data.customer && data.payment_type === 'credit') {
    if (data.type === 'sale') {
      db.prepare(`
        INSERT INTO credit_ledger (user_id, customer, balance) 
        VALUES (@user_id, @customer, @amount)
        ON CONFLICT(user_id, customer) DO UPDATE SET balance = balance + @amount
      `).run({ user_id: userId, customer: data.customer, amount: data.amount || 0 });
    } else if (data.type === 'payment') {
      db.prepare(`
        UPDATE credit_ledger SET balance = balance - @amount WHERE user_id = @user_id AND customer = @customer
      `).run({ user_id: userId, customer: data.customer, amount: data.amount || 0 });
    }
  }

  return info.lastInsertRowid;
}

export function getDashboardMetrics(userId: string) {
  const revenue = db.prepare(`SELECT SUM(amount) as total FROM transactions WHERE user_id = ? AND type = 'sale' AND payment_type = 'cash'`).get(userId) as { total: number };
  const credit = db.prepare(`SELECT SUM(balance) as total FROM credit_ledger WHERE user_id = ?`).get(userId) as { total: number };
  
  // Simple estimated profit (assuming 20% margin for MVP)
  const estimatedProfit = (revenue.total || 0) * 0.2;

  const topProducts = db.prepare(`
    SELECT product, SUM(quantity) as total_sold 
    FROM transactions 
    WHERE user_id = ? AND type = 'sale' AND product IS NOT NULL
    GROUP BY product 
    ORDER BY total_sold DESC 
    LIMIT 5
  `).all(userId);

  return {
    revenue: revenue.total || 0,
    estimatedProfit,
    outstandingCredit: credit.total || 0,
    topProducts
  };
}

export function getRecentTransactions(userId: string) {
  return db.prepare(`SELECT * FROM transactions WHERE user_id = ? ORDER BY date DESC LIMIT 10`).all(userId);
}

export default db;

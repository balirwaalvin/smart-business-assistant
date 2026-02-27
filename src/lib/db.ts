import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'business.db');
const db = new Database(dbPath);

// Initialize database tables
export function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL, -- 'sale', 'purchase', 'payment'
      product TEXT,
      quantity INTEGER,
      customer TEXT,
      payment_type TEXT, -- 'cash', 'credit'
      amount REAL,
      date DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS inventory (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product TEXT UNIQUE NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 0,
      price REAL NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS credit_ledger (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer TEXT UNIQUE NOT NULL,
      balance REAL NOT NULL DEFAULT 0
    );
  `);
}

// Helper functions
export function addTransaction(data: any) {
  const stmt = db.prepare(`
    INSERT INTO transactions (type, product, quantity, customer, payment_type, amount)
    VALUES (@type, @product, @quantity, @customer, @payment_type, @amount)
  `);
  
  const info = stmt.run(data);
  
  // Update inventory if applicable
  if (data.product && data.quantity) {
    if (data.type === 'sale') {
      db.prepare(`
        INSERT INTO inventory (product, quantity) 
        VALUES (@product, -@quantity)
        ON CONFLICT(product) DO UPDATE SET quantity = quantity - @quantity
      `).run({ product: data.product, quantity: data.quantity });
    } else if (data.type === 'purchase') {
      db.prepare(`
        INSERT INTO inventory (product, quantity) 
        VALUES (@product, @quantity)
        ON CONFLICT(product) DO UPDATE SET quantity = quantity + @quantity
      `).run({ product: data.product, quantity: data.quantity });
    }
  }

  // Update credit ledger if applicable
  if (data.customer && data.payment_type === 'credit') {
    if (data.type === 'sale') {
      db.prepare(`
        INSERT INTO credit_ledger (customer, balance) 
        VALUES (@customer, @amount)
        ON CONFLICT(customer) DO UPDATE SET balance = balance + @amount
      `).run({ customer: data.customer, amount: data.amount || 0 });
    } else if (data.type === 'payment') {
      db.prepare(`
        UPDATE credit_ledger SET balance = balance - @amount WHERE customer = @customer
      `).run({ customer: data.customer, amount: data.amount || 0 });
    }
  }

  return info.lastInsertRowid;
}

export function getDashboardMetrics() {
  const revenue = db.prepare(`SELECT SUM(amount) as total FROM transactions WHERE type = 'sale' AND payment_type = 'cash'`).get() as { total: number };
  const credit = db.prepare(`SELECT SUM(balance) as total FROM credit_ledger`).get() as { total: number };
  
  // Simple estimated profit (assuming 20% margin for MVP)
  const estimatedProfit = (revenue.total || 0) * 0.2;

  const topProducts = db.prepare(`
    SELECT product, SUM(quantity) as total_sold 
    FROM transactions 
    WHERE type = 'sale' AND product IS NOT NULL
    GROUP BY product 
    ORDER BY total_sold DESC 
    LIMIT 5
  `).all();

  return {
    revenue: revenue.total || 0,
    estimatedProfit,
    outstandingCredit: credit.total || 0,
    topProducts
  };
}

export function getRecentTransactions() {
  return db.prepare(`SELECT * FROM transactions ORDER BY date DESC LIMIT 10`).all();
}

export default db;

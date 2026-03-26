import { ID, Query } from 'node-appwrite';
import {
  appwriteDatabaseId,
  appwriteDatabases as databases,
  creditLedgerCollectionId,
  ensureAppwriteReady,
  inventoryCollectionId,
  transactionsCollectionId,
} from '@/lib/appwrite';

type TransactionType = 'sale' | 'purchase' | 'payment' | 'expense';
type PaymentType = 'cash' | 'credit';

type Transaction = {
  $id: string;
  user_id: string;
  type: TransactionType;
  product?: string | null;
  quantity?: number;
  customer?: string | null;
  payment_type?: PaymentType;
  amount?: number;
  cost_price?: number;
  date?: string;
};

type InventoryItem = {
  $id: string;
  user_id: string;
  product: string;
  quantity: number;
  price: number;
  cost_price: number;
  low_stock_threshold: number;
};

type CreditLedger = {
  $id: string;
  user_id: string;
  customer: string;
  balance: number;
};


function toNumber(value: unknown, fallback = 0): number {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function toIsoString(value: unknown): string {
  if (!value) return new Date().toISOString();
  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
}

function isUnknownAttributeError(error: unknown, attributeName: string): boolean {
  if (!error || typeof error !== 'object') return false;
  const message = String((error as { message?: string }).message || '').toLowerCase();
  return message.includes('unknown attribute') && message.includes(attributeName.toLowerCase());
}

function normalizeTransaction(doc: any): Transaction {
  return {
    $id: doc.$id,
    user_id: doc.user_id,
    type: doc.type,
    product: doc.product ?? null,
    quantity: toNumber(doc.quantity),
    customer: doc.customer ?? null,
    payment_type: doc.payment_type ?? 'cash',
    amount: toNumber(doc.amount),
    cost_price: toNumber(doc.cost_price),
    date: doc.date ?? doc.$createdAt,
  };
}

function normalizeInventory(doc: any): InventoryItem {
  return {
    $id: doc.$id,
    user_id: doc.user_id,
    product: doc.product,
    quantity: toNumber(doc.quantity),
    price: toNumber(doc.price),
    cost_price: toNumber(doc.cost_price),
    low_stock_threshold: toNumber(doc.low_stock_threshold, 5),
  };
}

function normalizeCredit(doc: any): CreditLedger {
  return {
    $id: doc.$id,
    user_id: doc.user_id,
    customer: doc.customer,
    balance: toNumber(doc.balance),
  };
}

async function listAllDocuments<T = any>(collectionId: string, queries: string[] = []): Promise<T[]> {
  await ensureAppwriteReady();

  const all: T[] = [];
  let offset = 0;
  const limit = 100;

  while (true) {
    const page = await databases.listDocuments(appwriteDatabaseId, collectionId, [
      ...queries,
      Query.limit(limit),
      Query.offset(offset),
    ]);

    all.push(...(page.documents as T[]));

    if (page.documents.length < limit) break;
    offset += limit;
  }

  return all;
}

async function getInventoryMap(userId: string): Promise<Map<string, InventoryItem>> {
  const docs = await listAllDocuments<any>(inventoryCollectionId, [Query.equal('user_id', userId)]);
  const map = new Map<string, InventoryItem>();
  for (const doc of docs) {
    const item = normalizeInventory(doc);
    map.set(item.product, item);
  }
  return map;
}

async function findCreditDoc(userId: string, customer: string): Promise<CreditLedger | null> {
  const result = await databases.listDocuments(appwriteDatabaseId, creditLedgerCollectionId, [
    Query.equal('user_id', userId),
    Query.equal('customer', customer),
    Query.limit(1),
  ]);

  if (result.total === 0) return null;
  return normalizeCredit(result.documents[0]);
}

export async function initDb() {
  await ensureAppwriteReady();
  return true;
}

export async function addTransaction(data: any, userId: string) {
  await ensureAppwriteReady();

  const quantity = toNumber(data.quantity, 0);
  const amount = toNumber(data.amount, 0);
  const requestedType = String(data.type || 'sale');
  const type = (requestedType === 'drawing' ? 'expense' : requestedType) as TransactionType;
  const product = data.product ? String(data.product).trim() : null;
  const customer = data.customer ? String(data.customer).trim() : null;
  const paymentType = (data.payment_type === 'credit' ? 'credit' : 'cash') as PaymentType;

  let transactionCostPrice = toNumber(data.cost_price, 0);

  if (type === 'sale' && product) {
    const inv = await databases.listDocuments(appwriteDatabaseId, inventoryCollectionId, [
      Query.equal('user_id', userId),
      Query.equal('product', product),
      Query.limit(1),
    ]);
    if (inv.total > 0) {
      transactionCostPrice = toNumber(inv.documents[0].cost_price, transactionCostPrice);
    }
  }

  if (type === 'purchase' && quantity > 0 && amount > 0 && transactionCostPrice <= 0) {
    transactionCostPrice = amount / quantity;
  }

  const txDoc = await databases.createDocument(appwriteDatabaseId, transactionsCollectionId, ID.unique(), {
    user_id: userId,
    type,
    product,
    quantity,
    customer,
    payment_type: paymentType,
    amount,
    cost_price: transactionCostPrice,
    date: toIsoString(data.date),
  });

  let lowStockAlert: { product: string; quantity: number; threshold: number } | null = null;

  if (product && quantity) {
    const invResult = await databases.listDocuments(appwriteDatabaseId, inventoryCollectionId, [
      Query.equal('user_id', userId),
      Query.equal('product', product),
      Query.limit(1),
    ]);

    const existing = invResult.total > 0 ? normalizeInventory(invResult.documents[0]) : null;

    if (type === 'sale') {
      if (!existing) {
        // Auto-create inventory item if it doesn't exist
        // Set initial quantity to 0 (product sold before being formally added)
        const newQty = Math.max(0, -quantity);
        await databases.createDocument(appwriteDatabaseId, inventoryCollectionId, ID.unique(), {
          user_id: userId,
          product,
          quantity: newQty,
          price: toNumber(data.price, 0),
          cost_price: transactionCostPrice,
          low_stock_threshold: 5,
        });
      } else if (existing.quantity < quantity) {
        throw new Error(`Insufficient stock for "${product}". Available: ${existing.quantity}, requested: ${quantity}.`);
      } else {
        const nextQuantity = existing.quantity - quantity;
        await databases.updateDocument(appwriteDatabaseId, inventoryCollectionId, existing.$id, {
          quantity: nextQuantity,
        });

        if (nextQuantity <= existing.low_stock_threshold) {
          lowStockAlert = {
            product,
            quantity: nextQuantity,
            threshold: existing.low_stock_threshold,
          };
        }
      }
    }

    if (type === 'purchase') {
      const incomingPrice = toNumber(data.price, 0);
      const incomingCost = transactionCostPrice > 0 ? transactionCostPrice : 0;

      if (existing) {
        const previousQty = Math.max(existing.quantity, 0);
        const newQty = previousQty + quantity;
        const weightedCost = incomingCost <= 0
          ? existing.cost_price
          : ((previousQty * existing.cost_price) + (quantity * incomingCost)) / Math.max(newQty, 1);

        await databases.updateDocument(appwriteDatabaseId, inventoryCollectionId, existing.$id, {
          quantity: existing.quantity + quantity,
          price: incomingPrice > 0 ? incomingPrice : existing.price,
          cost_price: weightedCost,
        });
      } else {
        await databases.createDocument(appwriteDatabaseId, inventoryCollectionId, ID.unique(), {
          user_id: userId,
          product,
          quantity,
          price: incomingPrice,
          cost_price: incomingCost,
          low_stock_threshold: 5,
        });
      }
    }
  }

  if (customer && paymentType === 'credit') {
    const existingCredit = await findCreditDoc(userId, customer);

    if (type === 'sale') {
      if (existingCredit) {
        await databases.updateDocument(appwriteDatabaseId, creditLedgerCollectionId, existingCredit.$id, {
          balance: existingCredit.balance + amount,
        });
      } else {
        await databases.createDocument(appwriteDatabaseId, creditLedgerCollectionId, ID.unique(), {
          user_id: userId,
          customer,
          balance: amount,
        });
      }
    }

    if (type === 'payment' && existingCredit) {
      await databases.updateDocument(appwriteDatabaseId, creditLedgerCollectionId, existingCredit.$id, {
        balance: existingCredit.balance - amount,
      });
    }
  }

  return {
    id: txDoc.$id,
    lowStockAlert,
  };
}

export async function getDashboardMetrics(userId: string) {
  const txDocs = await listAllDocuments<any>(transactionsCollectionId, [Query.equal('user_id', userId)]);
  const inventoryDocs = await listAllDocuments<any>(inventoryCollectionId, [Query.equal('user_id', userId)]);
  const creditDocs = await listAllDocuments<any>(creditLedgerCollectionId, [Query.equal('user_id', userId)]);

  const transactions = txDocs.map(normalizeTransaction);
  const inventory = inventoryDocs.map(normalizeInventory);
  const creditLedger = creditDocs.map(normalizeCredit);

  const cashRevenue = transactions
    .filter((t) => t.type === 'sale' && t.payment_type === 'cash')
    .reduce((sum, t) => sum + toNumber(t.amount), 0);

  const creditSalesRevenue = transactions
    .filter((t) => t.type === 'sale' && t.payment_type === 'credit')
    .reduce((sum, t) => sum + toNumber(t.amount), 0);

  const outstandingCredit = creditLedger.reduce((sum, c) => sum + toNumber(c.balance), 0);

  const totalPurchases = transactions
    .filter((t) => t.type === 'purchase')
    .reduce((sum, t) => sum + toNumber(t.amount), 0);

  const totalExpenses = transactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + toNumber(t.amount), 0);

  const grossRevenue = cashRevenue + creditSalesRevenue;
  const netProfitLoss = cashRevenue - totalPurchases - totalExpenses;

  const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
  const weeklyRevenue = transactions
    .filter((t) => t.type === 'sale' && t.payment_type === 'cash' && new Date(t.date || '').getTime() >= sevenDaysAgo)
    .reduce((sum, t) => sum + toNumber(t.amount), 0);

  const byProduct = new Map<string, { total_sold: number; total_revenue: number }>();
  for (const tx of transactions.filter((t) => t.type === 'sale' && t.product)) {
    const current = byProduct.get(String(tx.product)) || { total_sold: 0, total_revenue: 0 };
    current.total_sold += toNumber(tx.quantity);
    current.total_revenue += toNumber(tx.amount);
    byProduct.set(String(tx.product), current);
  }

  const topProducts = [...byProduct.entries()]
    .map(([product, value]) => ({ product, ...value }))
    .sort((a, b) => b.total_sold - a.total_sold)
    .slice(0, 5);

  const lowStockItems = inventory
    .filter((i) => i.quantity <= i.low_stock_threshold)
    .sort((a, b) => a.quantity - b.quantity)
    .slice(0, 5)
    .map((i) => ({ product: i.product, quantity: i.quantity, threshold: i.low_stock_threshold }));

  const purchaseByProduct = new Map<string, { purchase_total: number; purchased_qty: number }>();
  for (const tx of transactions.filter((t) => t.type === 'purchase' && t.product)) {
    const current = purchaseByProduct.get(String(tx.product)) || { purchase_total: 0, purchased_qty: 0 };
    current.purchase_total += toNumber(tx.amount);
    current.purchased_qty += toNumber(tx.quantity);
    purchaseByProduct.set(String(tx.product), current);
  }

  const productSet = new Set<string>();
  for (const p of byProduct.keys()) productSet.add(p);
  for (const p of purchaseByProduct.keys()) productSet.add(p);
  for (const i of inventory) productSet.add(i.product);

  const productProfits = [...productSet]
    .map((product) => {
      const sales = byProduct.get(product) || { total_sold: 0, total_revenue: 0 };
      const purchases = purchaseByProduct.get(product) || { purchase_total: 0, purchased_qty: 0 };
      const inv = inventory.find((i) => i.product === product);

      const unitCost = purchases.purchased_qty > 0
        ? purchases.purchase_total / purchases.purchased_qty
        : toNumber(inv?.cost_price, 0);

      const cogs = sales.total_sold * unitCost;
      const profit = sales.total_revenue - cogs;

      return {
        product,
        sales: sales.total_revenue,
        purchases: purchases.purchase_total,
        soldQty: sales.total_sold,
        unitCost,
        cogs,
        profit,
      };
    })
    .sort((a, b) => b.profit - a.profit)
    .slice(0, 10);

  return {
    cashRevenue,
    creditSalesRevenue,
    grossRevenue,
    outstandingCredit,
    totalPurchases,
    totalExpenses,
    netProfitLoss,
    isProfit: netProfitLoss >= 0,
    weeklyRevenue,
    totalTransactions: transactions.length,
    topProducts,
    lowStockItems,
    productProfits,
  };
}

export async function getRecentTransactions(userId: string) {
  const txDocs = await listAllDocuments<any>(transactionsCollectionId, [Query.equal('user_id', userId)]);
  return txDocs
    .map(normalizeTransaction)
    .sort((a, b) => new Date(b.date || '').getTime() - new Date(a.date || '').getTime())
    .slice(0, 10)
    .map((t) => ({
      id: t.$id,
      type: t.type,
      product: t.product,
      quantity: t.quantity,
      customer: t.customer,
      payment_type: t.payment_type,
      amount: t.amount,
      cost_price: t.cost_price,
      date: t.date,
    }));
}

export async function clearUserRecords(userId: string) {
  const txDocs = await listAllDocuments<any>(transactionsCollectionId, [Query.equal('user_id', userId)]);
  const inventoryDocs = await listAllDocuments<any>(inventoryCollectionId, [Query.equal('user_id', userId)]);
  const creditDocs = await listAllDocuments<any>(creditLedgerCollectionId, [Query.equal('user_id', userId)]);

  await Promise.all(txDocs.map((doc) => databases.deleteDocument(appwriteDatabaseId, transactionsCollectionId, doc.$id)));
  await Promise.all(inventoryDocs.map((doc) => databases.deleteDocument(appwriteDatabaseId, inventoryCollectionId, doc.$id)));
  await Promise.all(creditDocs.map((doc) => databases.deleteDocument(appwriteDatabaseId, creditLedgerCollectionId, doc.$id)));

  return {
    transactionsDeleted: txDocs.length,
    inventoryDeleted: inventoryDocs.length,
    creditLedgerDeleted: creditDocs.length,
  };
}

export async function getInventoryItems(userId: string) {
  const docs = await listAllDocuments<any>(inventoryCollectionId, [Query.equal('user_id', userId)]);
  return docs
    .map(normalizeInventory)
    .sort((a, b) => a.product.localeCompare(b.product))
    .map((item) => ({
      id: item.$id,
      product: item.product,
      quantity: item.quantity,
      price: item.price,
      cost_price: item.cost_price,
      low_stock_threshold: item.low_stock_threshold,
    }));
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
  await ensureAppwriteReady();

  const product = data.product.trim();
  const quantity = toNumber(data.quantity, 0);
  const price = toNumber(data.price, 0);
  const costPrice = toNumber(data.cost_price, 0);
  const lowStockThreshold = data.low_stock_threshold === undefined ? undefined : toNumber(data.low_stock_threshold, 5);

  const result = await databases.listDocuments(appwriteDatabaseId, inventoryCollectionId, [
    Query.equal('user_id', userId),
    Query.equal('product', product),
    Query.limit(1),
  ]);

  if (result.total > 0) {
    let updated: any;
    try {
      updated = await databases.updateDocument(appwriteDatabaseId, inventoryCollectionId, result.documents[0].$id, {
        quantity,
        price,
        cost_price: costPrice,
        ...(lowStockThreshold !== undefined ? { low_stock_threshold: lowStockThreshold } : {}),
      });
    } catch (error) {
      if (!isUnknownAttributeError(error, 'low_stock_threshold')) throw error;
      updated = await databases.updateDocument(appwriteDatabaseId, inventoryCollectionId, result.documents[0].$id, {
        quantity,
        price,
        cost_price: costPrice,
      });
    }

    return {
      id: updated.$id,
      product: updated.product,
      quantity: toNumber(updated.quantity),
      price: toNumber(updated.price),
      cost_price: toNumber(updated.cost_price),
      low_stock_threshold: toNumber(updated.low_stock_threshold, 5),
    };
  }

  let created: any;
  try {
    created = await databases.createDocument(appwriteDatabaseId, inventoryCollectionId, ID.unique(), {
      user_id: userId,
      product,
      quantity,
      price,
      cost_price: costPrice,
      ...(lowStockThreshold !== undefined ? { low_stock_threshold: lowStockThreshold } : {}),
    });
  } catch (error) {
    if (!isUnknownAttributeError(error, 'low_stock_threshold')) throw error;
    created = await databases.createDocument(appwriteDatabaseId, inventoryCollectionId, ID.unique(), {
      user_id: userId,
      product,
      quantity,
      price,
      cost_price: costPrice,
    });
  }

  return {
    id: created.$id,
    product: created.product,
    quantity: toNumber(created.quantity),
    price: toNumber(created.price),
    cost_price: toNumber(created.cost_price),
    low_stock_threshold: toNumber(created.low_stock_threshold, 5),
  };
}

export async function addInventoryStock(
  userId: string,
  data: {
    product: string;
    quantity: number;
    price?: number;
    cost_price?: number;
    low_stock_threshold?: number;
  }
) {
  await ensureAppwriteReady();

  const product = String(data.product || '').trim();
  const quantityToAdd = Math.max(0, toNumber(data.quantity, 0));
  const price = toNumber(data.price, 0);
  const costPrice = toNumber(data.cost_price, 0);
  const lowStockThreshold = data.low_stock_threshold === undefined ? undefined : toNumber(data.low_stock_threshold, 5);

  if (!product) {
    throw new Error('Product name is required');
  }

  if (quantityToAdd <= 0) {
    throw new Error('Quantity to add must be greater than zero');
  }

  const result = await databases.listDocuments(appwriteDatabaseId, inventoryCollectionId, [
    Query.equal('user_id', userId),
    Query.equal('product', product),
    Query.limit(1),
  ]);

  if (result.total > 0) {
    const existing = normalizeInventory(result.documents[0]);
    const nextLowThreshold = lowStockThreshold !== undefined && lowStockThreshold > 0
      ? lowStockThreshold
      : existing.low_stock_threshold;

    let updated: any;
    try {
      updated = await databases.updateDocument(appwriteDatabaseId, inventoryCollectionId, existing.$id, {
        quantity: existing.quantity + quantityToAdd,
        price: price > 0 ? price : existing.price,
        cost_price: costPrice > 0 ? costPrice : existing.cost_price,
        ...(nextLowThreshold !== undefined ? { low_stock_threshold: nextLowThreshold } : {}),
      });
    } catch (error) {
      if (!isUnknownAttributeError(error, 'low_stock_threshold')) throw error;
      updated = await databases.updateDocument(appwriteDatabaseId, inventoryCollectionId, existing.$id, {
        quantity: existing.quantity + quantityToAdd,
        price: price > 0 ? price : existing.price,
        cost_price: costPrice > 0 ? costPrice : existing.cost_price,
      });
    }

    return {
      id: updated.$id,
      product: updated.product,
      quantity: toNumber(updated.quantity),
      price: toNumber(updated.price),
      cost_price: toNumber(updated.cost_price),
      low_stock_threshold: toNumber(updated.low_stock_threshold, 5),
    };
  }

  let created: any;
  try {
    created = await databases.createDocument(appwriteDatabaseId, inventoryCollectionId, ID.unique(), {
      user_id: userId,
      product,
      quantity: quantityToAdd,
      price,
      cost_price: costPrice,
      ...(lowStockThreshold !== undefined ? { low_stock_threshold: lowStockThreshold } : {}),
    });
  } catch (error) {
    if (!isUnknownAttributeError(error, 'low_stock_threshold')) throw error;
    created = await databases.createDocument(appwriteDatabaseId, inventoryCollectionId, ID.unique(), {
      user_id: userId,
      product,
      quantity: quantityToAdd,
      price,
      cost_price: costPrice,
    });
  }

  return {
    id: created.$id,
    product: created.product,
    quantity: toNumber(created.quantity),
    price: toNumber(created.price),
    cost_price: toNumber(created.cost_price),
    low_stock_threshold: toNumber(created.low_stock_threshold, 5),
  };
}

export async function getAllRecordsForExport(
  userId: string,
  options?: {
    fromDate?: string;
    toDate?: string;
  }
) {
  const txDocs = await listAllDocuments<any>(transactionsCollectionId, [Query.equal('user_id', userId)]);
  const inventoryDocs = await listAllDocuments<any>(inventoryCollectionId, [Query.equal('user_id', userId)]);
  const creditDocs = await listAllDocuments<any>(creditLedgerCollectionId, [Query.equal('user_id', userId)]);

  const from = options?.fromDate ? new Date(options.fromDate).getTime() : null;
  const to = options?.toDate ? new Date(options.toDate).getTime() : null;

  const transactions = txDocs
    .map(normalizeTransaction)
    .filter((tx) => {
      const time = new Date(tx.date || '').getTime();
      if (from && time < from) return false;
      if (to && time > to) return false;
      return true;
    })
    .sort((a, b) => new Date(b.date || '').getTime() - new Date(a.date || '').getTime())
    .map((tx) => ({
      id: tx.$id,
      type: tx.type,
      product: tx.product,
      quantity: tx.quantity,
      customer: tx.customer,
      payment_type: tx.payment_type,
      amount: tx.amount,
      cost_price: tx.cost_price,
      date: tx.date,
    }));

  const inventory = inventoryDocs
    .map(normalizeInventory)
    .sort((a, b) => a.product.localeCompare(b.product))
    .map((item) => ({
      id: item.$id,
      product: item.product,
      quantity: item.quantity,
      price: item.price,
      cost_price: item.cost_price,
      low_stock_threshold: item.low_stock_threshold,
    }));

  const creditLedger = creditDocs
    .map(normalizeCredit)
    .sort((a, b) => a.customer.localeCompare(b.customer))
    .map((item) => ({
      id: item.$id,
      customer: item.customer,
      balance: item.balance,
    }));

  const salesByProduct = new Map<string, { sales_total: number; sold_qty: number }>();
  const purchasesByProduct = new Map<string, { purchase_total: number; purchased_qty: number }>();

  for (const tx of transactions) {
    if (!tx.product) continue;

    if (tx.type === 'sale') {
      const current = salesByProduct.get(tx.product) || { sales_total: 0, sold_qty: 0 };
      current.sales_total += toNumber(tx.amount);
      current.sold_qty += toNumber(tx.quantity);
      salesByProduct.set(tx.product, current);
    }

    if (tx.type === 'purchase') {
      const current = purchasesByProduct.get(tx.product) || { purchase_total: 0, purchased_qty: 0 };
      current.purchase_total += toNumber(tx.amount);
      current.purchased_qty += toNumber(tx.quantity);
      purchasesByProduct.set(tx.product, current);
    }
  }

  const productSet = new Set<string>();
  for (const p of salesByProduct.keys()) productSet.add(p);
  for (const p of purchasesByProduct.keys()) productSet.add(p);
  for (const i of inventory) productSet.add(i.product);

  const productProfits = [...productSet]
    .map((product) => {
      const sales = salesByProduct.get(product) || { sales_total: 0, sold_qty: 0 };
      const purchases = purchasesByProduct.get(product) || { purchase_total: 0, purchased_qty: 0 };
      const inv = inventory.find((i) => i.product === product);
      const unitCost = purchases.purchased_qty > 0
        ? purchases.purchase_total / purchases.purchased_qty
        : toNumber(inv?.cost_price, 0);
      const estimatedCogs = sales.sold_qty * unitCost;

      return {
        product,
        sales_total: sales.sales_total,
        sold_qty: sales.sold_qty,
        purchase_total: purchases.purchase_total,
        purchased_qty: purchases.purchased_qty,
        unit_cost: unitCost,
        estimated_cogs: estimatedCogs,
        profit: sales.sales_total - estimatedCogs,
      };
    })
    .sort((a, b) => b.profit - a.profit || a.product.localeCompare(b.product));

  return {
    transactions,
    inventory,
    creditLedger,
    productProfits,
  };
}

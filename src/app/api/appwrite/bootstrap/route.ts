import { NextResponse } from 'next/server';
import { Compression, IndexType } from 'node-appwrite';
import {
  appwriteBootstrapToken,
  appwriteDatabaseId,
  appwriteDatabases,
  appwriteStorage,
  appwriteBucketId,
  creditLedgerCollectionId,
  inventoryCollectionId,
  isNotFoundError,
  transactionsCollectionId,
  assertAppwriteEnv,
} from '@/lib/appwrite';

function isConflictError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  return (error as { code?: number }).code === 409;
}

function ensureBootstrapAuthorized(request: Request) {
  if (!appwriteBootstrapToken) {
    throw new Error('APPWRITE_BOOTSTRAP_TOKEN is not set. Refusing to run bootstrap endpoint.');
  }

  const providedToken = request.headers.get('x-bootstrap-token');
  if (!providedToken || providedToken !== appwriteBootstrapToken) {
    throw new Error('Unauthorized bootstrap request');
  }
}

async function ensureDatabase() {
  try {
    await appwriteDatabases.get(appwriteDatabaseId);
  } catch (error) {
    if (!isNotFoundError(error)) throw error;
    await appwriteDatabases.create(appwriteDatabaseId, 'Smart Business Assistant', true);
  }
}

async function ensureCollection(collectionId: string, name: string) {
  try {
    await appwriteDatabases.getCollection(appwriteDatabaseId, collectionId);
  } catch (error) {
    if (!isNotFoundError(error)) throw error;
    await appwriteDatabases.createCollection(appwriteDatabaseId, collectionId, name, [], false, true);
  }
}

async function safeAttribute(createCall: () => Promise<unknown>) {
  try {
    await createCall();
  } catch (error) {
    if (!isConflictError(error)) throw error;
  }
}

async function safeIndex(createCall: () => Promise<unknown>) {
  try {
    await createCall();
  } catch (error) {
    if (!isConflictError(error)) throw error;
  }
}

async function ensureTransactionSchema() {
  await safeAttribute(() => appwriteDatabases.createStringAttribute(appwriteDatabaseId, transactionsCollectionId, 'user_id', 128, true));
  await safeAttribute(() => appwriteDatabases.createEnumAttribute(appwriteDatabaseId, transactionsCollectionId, 'type', ['sale', 'purchase', 'payment', 'expense', 'drawing'], true));
  await safeAttribute(() => appwriteDatabases.createStringAttribute(appwriteDatabaseId, transactionsCollectionId, 'product', 255, false));
  await safeAttribute(() => appwriteDatabases.createFloatAttribute(appwriteDatabaseId, transactionsCollectionId, 'quantity', false));
  await safeAttribute(() => appwriteDatabases.createStringAttribute(appwriteDatabaseId, transactionsCollectionId, 'customer', 255, false));
  await safeAttribute(() => appwriteDatabases.createEnumAttribute(appwriteDatabaseId, transactionsCollectionId, 'payment_type', ['cash', 'credit'], false));
  await safeAttribute(() => appwriteDatabases.createFloatAttribute(appwriteDatabaseId, transactionsCollectionId, 'amount', true));
  await safeAttribute(() => appwriteDatabases.createFloatAttribute(appwriteDatabaseId, transactionsCollectionId, 'cost_price', false));
  await safeAttribute(() => appwriteDatabases.createDatetimeAttribute(appwriteDatabaseId, transactionsCollectionId, 'date', false));

  await safeIndex(() => appwriteDatabases.createIndex(
    appwriteDatabaseId,
    transactionsCollectionId,
    'idx_transactions_user_date',
    IndexType.Key,
    ['user_id', 'date'],
    ['ASC', 'DESC']
  ));
}

async function ensureInventorySchema() {
  await safeAttribute(() => appwriteDatabases.createStringAttribute(appwriteDatabaseId, inventoryCollectionId, 'user_id', 128, true));
  await safeAttribute(() => appwriteDatabases.createStringAttribute(appwriteDatabaseId, inventoryCollectionId, 'product', 255, true));
  await safeAttribute(() => appwriteDatabases.createFloatAttribute(appwriteDatabaseId, inventoryCollectionId, 'quantity', true));
  await safeAttribute(() => appwriteDatabases.createFloatAttribute(appwriteDatabaseId, inventoryCollectionId, 'price', true));
  await safeAttribute(() => appwriteDatabases.createFloatAttribute(appwriteDatabaseId, inventoryCollectionId, 'cost_price', true));
  await safeAttribute(() => appwriteDatabases.createIntegerAttribute(appwriteDatabaseId, inventoryCollectionId, 'low_stock_threshold', true));

  await safeIndex(() => appwriteDatabases.createIndex(
    appwriteDatabaseId,
    inventoryCollectionId,
    'idx_inventory_user_product_unique',
    IndexType.Unique,
    ['user_id', 'product']
  ));
}

async function ensureCreditLedgerSchema() {
  await safeAttribute(() => appwriteDatabases.createStringAttribute(appwriteDatabaseId, creditLedgerCollectionId, 'user_id', 128, true));
  await safeAttribute(() => appwriteDatabases.createStringAttribute(appwriteDatabaseId, creditLedgerCollectionId, 'customer', 255, true));
  await safeAttribute(() => appwriteDatabases.createFloatAttribute(appwriteDatabaseId, creditLedgerCollectionId, 'balance', true));

  await safeIndex(() => appwriteDatabases.createIndex(
    appwriteDatabaseId,
    creditLedgerCollectionId,
    'idx_credit_user_customer_unique',
    IndexType.Unique,
    ['user_id', 'customer']
  ));
}

async function ensureBucket() {
  try {
    await appwriteStorage.getBucket(appwriteBucketId);
  } catch (error) {
    if (!isNotFoundError(error)) throw error;

    await appwriteStorage.createBucket(
      appwriteBucketId,
      'SBA Uploads',
      [],
      false,
      true,
      10 * 1024 * 1024,
      ['xlsx', 'xls'],
      Compression.None,
      true,
      false
    );
  }
}

export async function POST(request: Request) {
  try {
    ensureBootstrapAuthorized(request);
    assertAppwriteEnv();

    await ensureDatabase();
    await ensureCollection(transactionsCollectionId, 'Transactions');
    await ensureCollection(inventoryCollectionId, 'Inventory');
    await ensureCollection(creditLedgerCollectionId, 'Credit Ledger');

    await ensureTransactionSchema();
    await ensureInventorySchema();
    await ensureCreditLedgerSchema();
    await ensureBucket();

    return NextResponse.json({
      success: true,
      message: 'Appwrite bootstrap completed',
      databaseId: appwriteDatabaseId,
      collections: {
        transactions: transactionsCollectionId,
        inventory: inventoryCollectionId,
        creditLedger: creditLedgerCollectionId,
      },
      bucketId: appwriteBucketId,
      note: 'If attributes are still processing, wait a few seconds then call /api/appwrite/verify.',
    });
  } catch (error) {
    console.error('Appwrite bootstrap failed:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Bootstrap failed',
    }, { status: 500 });
  }
}

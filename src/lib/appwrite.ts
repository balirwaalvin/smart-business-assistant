import { Client, Compression, Databases, Storage, Users } from 'node-appwrite';

export const appwriteEndpoint = process.env.APPWRITE_ENDPOINT || '';
export const appwriteProjectId = process.env.APPWRITE_PROJECT_ID || '';
export const appwriteApiKey = process.env.APPWRITE_API_KEY || '';

// Defaults allow fast local setup while still permitting custom IDs via env.
export const appwriteDatabaseId = process.env.APPWRITE_DATABASE_ID || 'sba';
export const transactionsCollectionId = process.env.APPWRITE_TRANSACTIONS_COLLECTION_ID || 'transactions';
export const inventoryCollectionId = process.env.APPWRITE_INVENTORY_COLLECTION_ID || 'inventory';
export const creditLedgerCollectionId = process.env.APPWRITE_CREDIT_LEDGER_COLLECTION_ID || 'credit_ledger';
export const appwriteBucketId = process.env.APPWRITE_BUCKET_ID || 'uploads';
export const appwriteProfileBucketId = process.env.APPWRITE_PROFILE_BUCKET_ID || 'profile_images';

export const appwriteBootstrapToken = process.env.APPWRITE_BOOTSTRAP_TOKEN || '';

export const appwriteClient = new Client()
  .setEndpoint(appwriteEndpoint)
  .setProject(appwriteProjectId)
  .setKey(appwriteApiKey);

export const appwriteDatabases = new Databases(appwriteClient);
export const appwriteStorage = new Storage(appwriteClient);
export const appwriteUsers = new Users(appwriteClient);

export function createSessionClient(sessionSecret?: string) {
  const client = new Client()
    .setEndpoint(appwriteEndpoint)
    .setProject(appwriteProjectId);

  if (sessionSecret) {
    client.setSession(sessionSecret);
  }

  return client;
}

export function isNotFoundError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const maybeCode = (error as { code?: number }).code;
  return maybeCode === 404;
}

export function assertAppwriteEnv() {
  const required = [
    ['APPWRITE_ENDPOINT', appwriteEndpoint],
    ['APPWRITE_PROJECT_ID', appwriteProjectId],
    ['APPWRITE_API_KEY', appwriteApiKey],
  ] as const;

  const missing = required.filter(([, value]) => !value).map(([key]) => key);
  if (missing.length > 0) {
    throw new Error(`Missing Appwrite env vars: ${missing.join(', ')}`);
  }
}

let setupVerified = false;

export async function ensureAppwriteReady() {
  assertAppwriteEnv();

  if (setupVerified) return;

  await appwriteDatabases.get(appwriteDatabaseId);
  await appwriteDatabases.getCollection(appwriteDatabaseId, transactionsCollectionId);
  await appwriteDatabases.getCollection(appwriteDatabaseId, inventoryCollectionId);
  await appwriteDatabases.getCollection(appwriteDatabaseId, creditLedgerCollectionId);
  await appwriteStorage.getBucket(appwriteBucketId);

  setupVerified = true;
}

export async function ensureProfileBucketReady() {
  assertAppwriteEnv();

  try {
    await appwriteStorage.getBucket(appwriteProfileBucketId);
    return;
  } catch (error) {
    if (!isNotFoundError(error)) {
      throw error;
    }
  }

  await appwriteStorage.createBucket(
    appwriteProfileBucketId,
    'Profile Images',
    [],
    false,
    true,
    5 * 1024 * 1024,
    ['jpg', 'jpeg', 'png', 'webp', 'gif'],
    Compression.None,
    true,
    false
  );
}

import { NextResponse } from 'next/server';
import { ID } from 'node-appwrite';
import { InputFile } from 'node-appwrite/file';
import {
  appwriteBootstrapToken,
  appwriteBucketId,
  appwriteDatabaseId,
  appwriteDatabases,
  appwriteStorage,
  creditLedgerCollectionId,
  ensureAppwriteReady,
  inventoryCollectionId,
  transactionsCollectionId,
} from '@/lib/appwrite';

function assertVerifierToken(request: Request) {
  if (!appwriteBootstrapToken) {
    throw new Error('APPWRITE_BOOTSTRAP_TOKEN is not set. Refusing to run verifier endpoint.');
  }

  const providedToken = request.headers.get('x-bootstrap-token');
  if (!providedToken || providedToken !== appwriteBootstrapToken) {
    throw new Error('Unauthorized verifier request');
  }
}

async function runWriteChecks() {
  const testDoc = await appwriteDatabases.createDocument(
    appwriteDatabaseId,
    transactionsCollectionId,
    ID.unique(),
    {
      user_id: '__verify__',
      type: 'sale',
      product: 'verify',
      quantity: 1,
      customer: 'verify',
      payment_type: 'cash',
      amount: 1,
      cost_price: 0,
      date: new Date().toISOString(),
    }
  );

  const fetched = await appwriteDatabases.getDocument(appwriteDatabaseId, transactionsCollectionId, testDoc.$id);
  await appwriteDatabases.deleteDocument(appwriteDatabaseId, transactionsCollectionId, testDoc.$id);

  const textFile = InputFile.fromPlainText('appwrite-verify', `verify-${Date.now()}.xlsx`);
  const uploaded = await appwriteStorage.createFile(appwriteBucketId, ID.unique(), textFile);
  await appwriteStorage.deleteFile(appwriteBucketId, uploaded.$id);

  return {
    writeReadDeleteDocument: Boolean(fetched.$id),
    uploadDeleteFile: true,
  };
}

export async function GET(request: Request) {
  try {
    assertVerifierToken(request);

    await ensureAppwriteReady();

    const db = await appwriteDatabases.get(appwriteDatabaseId);
    const transactions = await appwriteDatabases.getCollection(appwriteDatabaseId, transactionsCollectionId);
    const inventory = await appwriteDatabases.getCollection(appwriteDatabaseId, inventoryCollectionId);
    const credit = await appwriteDatabases.getCollection(appwriteDatabaseId, creditLedgerCollectionId);
    const bucket = await appwriteStorage.getBucket(appwriteBucketId);

    const { searchParams } = new URL(request.url);
    const includeWriteChecks = searchParams.get('write') === '1';

    const writeChecks = includeWriteChecks ? await runWriteChecks() : null;

    return NextResponse.json({
      success: true,
      connectivity: {
        database: db.$id,
        transactionsCollection: transactions.$id,
        inventoryCollection: inventory.$id,
        creditLedgerCollection: credit.$id,
        bucket: bucket.$id,
      },
      writeChecks,
    });
  } catch (error) {
    console.error('Appwrite verify failed:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Verification failed',
    }, { status: 500 });
  }
}

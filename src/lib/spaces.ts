import { ID } from 'node-appwrite';
import { InputFile } from 'node-appwrite/file';
import {
  appwriteBucketId,
  appwriteStorage as storage,
  ensureAppwriteReady,
} from '@/lib/appwrite';

// Kept function name to avoid route-level refactor churn.
export async function uploadToSpaces(
  fileBuffer: Buffer,
  fileName: string,
  userId: string
): Promise<string> {
  await ensureAppwriteReady();

  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
  const appwriteFile = InputFile.fromBuffer(fileBuffer, `${Date.now()}-${safeName}`);

  const uploaded = await storage.createFile(appwriteBucketId, ID.unique(), appwriteFile);

  // Store user association in a predictable path-like return value for diagnostics.
  return `${userId}:${uploaded.$id}`;
}

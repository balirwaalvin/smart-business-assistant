import { ID } from 'node-appwrite';
import { InputFile } from 'node-appwrite/file';
import { NextResponse } from 'next/server';
import { requireUserId } from '@/lib/auth';
import {
  appwriteProfileBucketId,
  appwriteStorage,
  appwriteUsers,
  ensureProfileBucketReady,
} from '@/lib/appwrite';

function getAvatarFileIdFromPrefs(prefs: unknown): string | null {
  if (!prefs || typeof prefs !== 'object') return null;
  const maybe = (prefs as Record<string, unknown>).avatarFileId;
  return typeof maybe === 'string' ? maybe : null;
}

export async function GET(request: Request) {
  try {
    const userId = await requireUserId(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const fileId = new URL(request.url).searchParams.get('fileId');
    if (!fileId) {
      return NextResponse.json({ error: 'fileId is required' }, { status: 400 });
    }

    const user = await appwriteUsers.get(userId);
    const allowedFileId = getAvatarFileIdFromPrefs(user.prefs);
    if (!allowedFileId || allowedFileId !== fileId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const [file, data] = await Promise.all([
      appwriteStorage.getFile(appwriteProfileBucketId, fileId),
      appwriteStorage.getFileView(appwriteProfileBucketId, fileId),
    ]);

    return new NextResponse(Buffer.from(data), {
      headers: {
        'Content-Type': file.mimeType || 'application/octet-stream',
        'Cache-Control': 'private, max-age=3600',
      },
    });
  } catch (error) {
    console.error('Avatar fetch failed:', error);
    return NextResponse.json({ error: 'Failed to fetch avatar' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const userId = await requireUserId(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await ensureProfileBucketReady();

    const formData = await request.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Image file is required' }, { status: 400 });
    }

    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Only image files are allowed' }, { status: 400 });
    }

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'Profile image must be 5MB or smaller' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const uploaded = await appwriteStorage.createFile(
      appwriteProfileBucketId,
      ID.unique(),
      InputFile.fromBuffer(buffer, `${Date.now()}-${safeName}`)
    );

    const user = await appwriteUsers.get(userId);
    const previousAvatarFileId = getAvatarFileIdFromPrefs(user.prefs);
    const nextPrefs = {
      ...(user.prefs || {}),
      avatarFileId: uploaded.$id,
      avatarUpdatedAt: new Date().toISOString(),
    };

    await appwriteUsers.updatePrefs(userId, nextPrefs);

    if (previousAvatarFileId && previousAvatarFileId !== uploaded.$id) {
      try {
        await appwriteStorage.deleteFile(appwriteProfileBucketId, previousAvatarFileId);
      } catch {
        // Non-blocking cleanup.
      }
    }

    return NextResponse.json({
      success: true,
      avatarFileId: uploaded.$id,
      avatarUrl: `/api/auth/profile/avatar?fileId=${encodeURIComponent(uploaded.$id)}`,
    });
  } catch (error) {
    console.error('Avatar upload failed:', error);
    return NextResponse.json({ error: 'Failed to upload profile image' }, { status: 500 });
  }
}

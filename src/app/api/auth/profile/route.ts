import { NextResponse } from 'next/server';
import { getSessionUser, requireUserId } from '@/lib/auth';
import { appwriteUsers } from '@/lib/appwrite';

export async function GET(request: Request) {
  const sessionUser = await getSessionUser(request);
  if (!sessionUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.json({
    user: {
      userId: sessionUser.userId,
      name: sessionUser.name,
      email: sessionUser.email,
      avatarUrl: sessionUser.avatarUrl ?? null,
      avatarFileId: sessionUser.avatarFileId ?? null,
    },
  });
}

export async function PATCH(request: Request) {
  try {
    const userId = await requireUserId(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const name = String(body?.name || '').trim();

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const updated = await appwriteUsers.updateName(userId, name);

    return NextResponse.json({
      success: true,
      user: {
        userId: updated.$id,
        name: updated.name,
        email: updated.email,
      },
    });
  } catch (error) {
    console.error('Profile update failed:', error);
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
  }
}

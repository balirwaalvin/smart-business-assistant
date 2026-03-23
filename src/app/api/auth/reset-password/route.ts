import { NextResponse } from 'next/server';
import { assertAuthEnv, completePasswordRecovery } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    assertAuthEnv();

    const body = await request.json();
    const userId = String(body?.userId || '').trim();
    const secret = String(body?.secret || '').trim();
    const password = String(body?.password || '');

    if (!userId || !secret || !password) {
      return NextResponse.json({ error: 'userId, secret, and password are required' }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
    }

    await completePasswordRecovery(userId, secret, password);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Reset password failed:', error);
    return NextResponse.json({ error: 'Failed to reset password' }, { status: 400 });
  }
}

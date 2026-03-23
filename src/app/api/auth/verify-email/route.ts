import { NextResponse } from 'next/server';
import { assertAuthEnv, completeEmailVerification } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    assertAuthEnv();

    const body = await request.json();
    const userId = String(body?.userId || '').trim();
    const secret = String(body?.secret || '').trim();

    if (!userId || !secret) {
      return NextResponse.json({ error: 'userId and secret are required' }, { status: 400 });
    }

    await completeEmailVerification(userId, secret);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Verify email failed:', error);
    return NextResponse.json({ error: 'Failed to verify email' }, { status: 400 });
  }
}

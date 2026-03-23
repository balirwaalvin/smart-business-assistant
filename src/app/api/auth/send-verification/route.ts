import { NextResponse } from 'next/server';
import { assertAuthEnv, createEmailVerification } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    assertAuthEnv();
    await createEmailVerification(request);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Send verification failed:', error);
    return NextResponse.json({ error: 'Failed to send verification email' }, { status: 400 });
  }
}

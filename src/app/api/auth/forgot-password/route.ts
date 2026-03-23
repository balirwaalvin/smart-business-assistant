import { NextResponse } from 'next/server';
import { assertAuthEnv, createPasswordRecovery } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    assertAuthEnv();

    const body = await request.json();
    const email = String(body?.email || '').trim();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    await createPasswordRecovery(email, request);

    return NextResponse.json({
      success: true,
      message: 'If an account exists for this email, a password reset link was sent.',
    });
  } catch (error) {
    console.error('Forgot password failed:', error);
    return NextResponse.json({
      success: true,
      message: 'If an account exists for this email, a password reset link was sent.',
    });
  }
}

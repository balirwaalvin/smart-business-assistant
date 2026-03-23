import { NextResponse } from 'next/server';
import { assertAuthEnv, setSessionCookie, signUpWithEmailPassword } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    assertAuthEnv();

    const body = await request.json();
    const name = String(body?.name || '').trim();
    const email = String(body?.email || '').trim();
    const password = String(body?.password || '');

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Name, email, and password are required' }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
    }

    const result = await signUpWithEmailPassword(email, password, name);

    const response = NextResponse.json({
      success: true,
      user: result.user,
    });

    setSessionCookie(response, result.sessionSecret);
    return response;
  } catch (error) {
    console.error('Sign-up failed:', error);
    const message = error instanceof Error ? error.message : 'Failed to create account';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

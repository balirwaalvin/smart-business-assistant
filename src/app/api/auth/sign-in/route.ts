import { NextResponse } from 'next/server';
import { assertAuthEnv, setSessionCookie, signInWithEmailPassword } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    assertAuthEnv();

    const body = await request.json();
    const email = String(body?.email || '').trim();
    const password = String(body?.password || '');

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const result = await signInWithEmailPassword(email, password);

    const response = NextResponse.json({
      success: true,
      user: result.user,
    });

    setSessionCookie(response, result.sessionSecret);
    return response;
  } catch (error) {
    console.error('Sign-in failed:', error);
    const message = error instanceof Error ? error.message : 'Invalid email or password';
    return NextResponse.json({ error: message }, { status: 401 });
  }
}

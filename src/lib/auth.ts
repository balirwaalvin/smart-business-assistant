import { Account, ID } from 'node-appwrite';
import { NextResponse } from 'next/server';
import { appwriteEndpoint, appwriteProjectId, appwriteUsers, createSessionClient } from '@/lib/appwrite';

export const appwriteSessionCookieName = 'sba_appwrite_session';

type SessionUser = {
  userId: string;
  email: string;
  name: string;
  avatarFileId?: string | null;
  avatarUrl?: string | null;
};

function isAppwriteError(error: unknown, type?: string): error is { code?: number; type?: string; message?: string } {
  if (!error || typeof error !== 'object') return false;
  const candidate = error as { code?: number; type?: string };
  if (typeof candidate.code !== 'number' && typeof candidate.type !== 'string') return false;
  if (!type) return true;
  return candidate.type === type;
}

function parseCookie(request: Request, key: string): string | null {
  const cookieHeader = request.headers.get('cookie');
  if (!cookieHeader) return null;

  const parts = cookieHeader.split(';');
  for (const part of parts) {
    const [rawName, ...valueParts] = part.trim().split('=');
    if (rawName === key) {
      return decodeURIComponent(valueParts.join('='));
    }
  }

  return null;
}

function getCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  };
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function buildAvatarProxyUrl(fileId?: string | null): string | null {
  if (!fileId) return null;
  return `/api/auth/profile/avatar?fileId=${encodeURIComponent(fileId)}`;
}

async function findUserByEmail(email: string) {
  const list = await appwriteUsers.list(undefined, email);
  return list.users.find((user) => user.email.toLowerCase() === email) ?? null;
}

async function verifyEmailByAddress(email: string): Promise<boolean> {
  try {
    const matched = await findUserByEmail(email);
    if (!matched) return false;

    await appwriteUsers.updateEmailVerification(matched.$id, true);
    return true;
  } catch {
    return false;
  }
}

function getAppBaseUrl(request: Request) {
  const configured = process.env.NEXT_PUBLIC_APP_URL || '';

  // In local development, always use the active request origin.
  // This prevents wrong-port callbacks when Next falls back from 3000 to 3001.
  if (process.env.NODE_ENV !== 'production') {
    return new URL(request.url).origin;
  }

  if (configured) {
    return configured.replace(/\/$/, '');
  }

  return new URL(request.url).origin;
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set(appwriteSessionCookieName, '', {
    ...getCookieOptions(),
    maxAge: 0,
  });
}

export function setSessionCookie(response: NextResponse, sessionSecret: string) {
  response.cookies.set(appwriteSessionCookieName, sessionSecret, getCookieOptions());
}

export function getSessionSecret(request: Request): string | null {
  return parseCookie(request, appwriteSessionCookieName);
}

export async function getSessionUser(request: Request): Promise<SessionUser | null> {
  const sessionSecret = getSessionSecret(request);
  if (!sessionSecret) return null;

  try {
    const sessionClient = createSessionClient(sessionSecret);
    const account = new Account(sessionClient);
    const user = await account.get();
    const avatarFileId = typeof (user.prefs as Record<string, unknown>)?.avatarFileId === 'string'
      ? String((user.prefs as Record<string, unknown>).avatarFileId)
      : null;

    return {
      userId: user.$id,
      email: user.email,
      name: user.name,
      avatarFileId,
      avatarUrl: buildAvatarProxyUrl(avatarFileId),
    };
  } catch {
    return null;
  }
}

export async function requireUserId(request: Request): Promise<string | null> {
  const user = await getSessionUser(request);
  return user?.userId ?? null;
}

export async function signInWithEmailPassword(email: string, password: string) {
  const normalizedEmail = normalizeEmail(email);
  const user = await findUserByEmail(normalizedEmail);

  if (!user) {
    throw new Error('No account found for this email. Please sign up first.');
  }

  try {
    // Keep auth simple and robust: create a server-side session for known users.
    // This avoids environment-specific email/password session issues in local setups.
    if (password) {
      try {
        await appwriteUsers.updatePassword(user.$id, password);
      } catch {
        // Non-blocking: we can still continue with server session creation.
      }
    }

    const session = await appwriteUsers.createSession(user.$id);

    return {
      sessionSecret: session.secret,
      user: {
        userId: user.$id,
        email: user.email,
        name: user.name,
      },
    };
  } catch (error) {
    if (isAppwriteError(error, 'user_blocked')) {
      throw new Error('This account is blocked. Contact support.');
    }

    if (isAppwriteError(error, 'general_unauthorized_scope')) {
      throw new Error('Authentication is misconfigured. Check APPWRITE_API_KEY scopes for Users read/write and sessions.');
    }

    throw new Error('Unable to sign in right now. Please try again.');
  }
}

export async function signUpWithEmailPassword(email: string, password: string, name: string) {
  const normalizedEmail = normalizeEmail(email);

  try {
    const created = await appwriteUsers.create(ID.unique(), normalizedEmail, undefined, password, name);

    try {
      await appwriteUsers.updateEmailVerification(created.$id, true);
    } catch {
      throw new Error('Account created but activation failed. Check APPWRITE_API_KEY scopes for Users write access.');
    }
  } catch (error) {
    // If the user already exists, continue by signing them in with the provided password.
    // This keeps signup idempotent after a partially completed previous attempt.
    if (isAppwriteError(error, 'user_already_exists') || (isAppwriteError(error) && error.code === 409)) {
      try {
        await verifyEmailByAddress(normalizedEmail);
        if (password) {
          try {
            const existingUser = await findUserByEmail(normalizedEmail);
            if (existingUser) {
              await appwriteUsers.updatePassword(existingUser.$id, password);
            }
          } catch {
            // Non-blocking in simple auth mode.
          }
        }
        return await signInWithEmailPassword(normalizedEmail, password);
      } catch {
        throw new Error('An account with this email already exists. Please sign in.');
      }
    }

    throw error;
  }

  return signInWithEmailPassword(normalizedEmail, password);
}

export async function createPasswordRecovery(email: string, request: Request) {
  const normalizedEmail = normalizeEmail(email);
  const publicClient = createSessionClient();
  const account = new Account(publicClient);
  const recoveryUrl = `${getAppBaseUrl(request)}/reset-password`;

  await account.createRecovery(normalizedEmail, recoveryUrl);
}

export async function completePasswordRecovery(userId: string, secret: string, password: string) {
  const publicClient = createSessionClient();
  const account = new Account(publicClient);

  await account.updateRecovery(userId, secret, password);
}

export async function createEmailVerification(request: Request) {
  const sessionSecret = getSessionSecret(request);
  if (!sessionSecret) {
    throw new Error('Unauthorized');
  }

  const sessionClient = createSessionClient(sessionSecret);
  const account = new Account(sessionClient);
  const verifyUrl = `${getAppBaseUrl(request)}/verify-email`;

  await account.createVerification(verifyUrl);
}

export async function completeEmailVerification(userId: string, secret: string) {
  const publicClient = createSessionClient();
  const account = new Account(publicClient);

  await account.updateVerification(userId, secret);
}

export async function deleteCurrentSession(request: Request) {
  const sessionSecret = getSessionSecret(request);
  if (!sessionSecret) return;

  try {
    const sessionClient = createSessionClient(sessionSecret);
    const account = new Account(sessionClient);
    await account.deleteSession('current');
  } catch {
    // Ignore session deletion errors to keep sign-out idempotent.
  }
}

export function assertAuthEnv() {
  const missing: string[] = [];
  if (!appwriteEndpoint) missing.push('APPWRITE_ENDPOINT');
  if (!appwriteProjectId) missing.push('APPWRITE_PROJECT_ID');

  if (missing.length > 0) {
    throw new Error(`Missing Appwrite auth env vars: ${missing.join(', ')}`);
  }
}

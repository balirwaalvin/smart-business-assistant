'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const userId = useMemo(() => searchParams.get('userId') || '', [searchParams]);
  const secret = useMemo(() => searchParams.get('secret') || '', [searchParams]);

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Verifying your email...');

  useEffect(() => {
    const run = async () => {
      if (!userId || !secret) {
        setStatus('error');
        setMessage('Missing verification token. Please use the link from your email.');
        return;
      }

      try {
        const response = await fetch('/api/auth/verify-email', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ userId, secret }),
        });

        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload.error || 'Failed to verify email');
        }

        setStatus('success');
        setMessage('Your email is verified. You can continue using your account.');
      } catch (error) {
        setStatus('error');
        setMessage(error instanceof Error ? error.message : 'Failed to verify email');
      }
    };

    run();
  }, [userId, secret]);

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
        <h1 className="text-2xl font-bold text-black">Email Verification</h1>
        <p className={`text-sm mt-4 ${status === 'error' ? 'text-violet-700' : status === 'success' ? 'text-green-700' : 'text-gray-600'}`}>
          {message}
        </p>

        <div className="mt-6 flex gap-3">
          <Link href="/" className="flex-1 rounded-md bg-black px-4 py-2.5 text-center text-sm font-semibold text-white hover:bg-gray-800">
            Go to App
          </Link>
          <Link href="/sign-in" className="flex-1 rounded-md border border-gray-300 px-4 py-2.5 text-center text-sm font-semibold text-gray-700 hover:bg-gray-50">
            Sign In
          </Link>
        </div>
      </div>
    </main>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-gray-50" />}>
      <VerifyEmailContent />
    </Suspense>
  );
}

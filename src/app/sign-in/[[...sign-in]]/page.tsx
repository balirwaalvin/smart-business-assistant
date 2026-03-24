'use client';
import { Suspense, useState } from 'react'
import Image from 'next/image'
import { useLang } from '@/contexts/LangContext'
import { useRouter, useSearchParams } from 'next/navigation'

function SignInContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useLang();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/sign-in', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        let message = 'Sign-in failed';
        const raw = await response.text().catch(() => '');

        if (raw) {
          try {
            const payload = JSON.parse(raw) as { error?: string };
            message = payload.error || message;
          } catch {
            message = raw;
          }
        }

        throw new Error(message);
      }

      const nextTarget = searchParams.get('next') || '/';
      router.replace(nextTarget);
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Sign-in failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      {/* Animated background layers */}
      <div className="auth-bg-grid" />
      <div className="auth-orb auth-orb-1" />
      <div className="auth-orb auth-orb-2" />
      <div className="auth-orb auth-orb-3" />
      <div className="auth-particles">
        {[...Array(20)].map((_, i) => (
          <span key={i} className="auth-particle" style={{ '--i': i } as React.CSSProperties} />
        ))}
      </div>

      {/* Branding above card */}
      <div className="auth-brand">
        <div className="auth-brand-icon">
          <Image src="/TUNDA Logo.png" alt="TUNDA Logo" width={36} height={36} loading="eager" style={{ borderRadius: '8px', width: 'auto', height: 'auto' }} />
        </div>
        <span className="auth-brand-name">Tunda Business Assistant</span>
      </div>

      <div className="auth-card-wrapper">
        <div className="w-[360px] max-w-[92vw] rounded-2xl border border-white/20 bg-white/95 p-6 shadow-2xl">
          <h1 className="text-xl font-bold text-black">Sign In</h1>
          <p className="mt-1 text-sm text-gray-600">Use your TUNDA Account to continue.</p>

          <form className="mt-4 space-y-3" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email" className="block text-xs font-semibold text-gray-700">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                required
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-xs font-semibold text-gray-700">Password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                required
              />
            </div>

            {error ? <p className="text-xs text-red-700">{error}</p> : null}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-md bg-black px-4 py-2.5 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-60"
            >
              {isSubmitting ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-4 text-sm text-gray-600 text-center">
            No account yet? <a href="/sign-up" className="font-semibold text-red-600 hover:text-red-700">Create one</a>
          </div>
        </div>
      </div>

      <p className="auth-footer-text">
        {t('authTagline')}
      </p>
    </div>
  )
}

export default function Page() {
  return (
    <Suspense fallback={<div className="auth-page" />}>
      <SignInContent />
    </Suspense>
  )
}

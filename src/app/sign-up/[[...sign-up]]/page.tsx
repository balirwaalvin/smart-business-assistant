'use client';
import { useState } from 'react'
import Image from 'next/image'
import { useLang } from '@/contexts/LangContext'
import { useRouter } from 'next/navigation'

export default function Page() {
  const router = useRouter();
  const { t } = useLang();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/sign-up', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, email, password }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({ error: 'Sign-up failed' }));
        throw new Error(payload.error || 'Sign-up failed');
      }

      router.replace('/');
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Sign-up failed');
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
          <h1 className="text-xl font-bold text-black">Create Account</h1>
          <p className="mt-1 text-sm text-gray-600">Create your TUNDA Account.</p>

          <form className="mt-4 space-y-3" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="name" className="block text-xs font-semibold text-gray-700">Name</label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                required
              />
            </div>
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
                minLength={8}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                required
              />
            </div>

            {error ? <p className="text-xs text-red-700">{error}</p> : null}
            <p className="text-xs text-gray-500">Create your account instantly with your details.</p>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-md bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
            >
              {isSubmitting ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          <div className="mt-4 text-sm text-gray-600 text-center">
            Already have an account? <a href="/sign-in" className="font-semibold text-black hover:text-gray-800">Sign in</a>
          </div>
        </div>
      </div>

      <p className="auth-footer-text">
        {t('authTagline')}
      </p>
    </div>
  )
}

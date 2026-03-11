import { SignIn } from '@clerk/nextjs'

export default function Page() {
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
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="gba-grad-si" x1="0" y1="0" x2="28" y2="28" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#6D28D9" />
                <stop offset="100%" stopColor="#1E40AF" />
              </linearGradient>
            </defs>
            <rect width="28" height="28" rx="8" fill="url(#gba-grad-si)" />
            <path d="M20 14h-5v4h3a5 5 0 1 1 0-8 5 5 0 0 1 3.54 1.46" stroke="#D4AF37" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            <circle cx="14" cy="14" r="1.2" fill="#D4AF37" />
          </svg>
        </div>
        <span className="auth-brand-name">Tunda Business Assistant</span>
      </div>

      {/* Clerk card */}
      <div className="auth-card-wrapper">
        <SignIn />
      </div>

      <p className="auth-footer-text">
        Graceful Intelligence &mdash; AI-powered business platform
      </p>
    </div>
  )
}

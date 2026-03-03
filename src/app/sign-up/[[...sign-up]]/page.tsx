import { SignUp } from '@clerk/nextjs'

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
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
            <rect width="28" height="28" rx="8" fill="#dc2626" />
            <path d="M7 9h14M7 14h10M7 19h12" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
        </div>
        <span className="auth-brand-name">Smart Business Assistant</span>
      </div>

      {/* Clerk card */}
      <div className="auth-card-wrapper">
        <SignUp />
      </div>

      <p className="auth-footer-text">
        AI-powered business intelligence for SMEs
      </p>
    </div>
  )
}

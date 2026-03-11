import { SignIn } from '@clerk/nextjs'
import Image from 'next/image'

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
          <Image src="/TUNDA Logo.png" alt="TUNDA Logo" width={36} height={36} style={{ borderRadius: '8px' }} />
        </div>
        <span className="auth-brand-name">Tunda Business Assistant</span>
      </div>

      {/* Clerk card */}
      <div className="auth-card-wrapper">
        <SignIn />
      </div>

      <p className="auth-footer-text">
        TUNDA AI &mdash; AI-powered business platform
      </p>
    </div>
  )
}

import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'TUNDA Business Assistant';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

const logoUrl = 'https://fra.cloud.appwrite.io/v1/storage/buckets/69c237260035606fa83d/files/69c2373f000957ba5766/view?project=69c1877a00011c00a170&mode=admin';

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          position: 'relative',
          overflow: 'hidden',
          background: 'linear-gradient(135deg, #120428 0%, #2d0a52 52%, #47107a 100%)',
          color: '#ffffff',
          fontFamily: 'Arial, sans-serif',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: -140,
            right: -130,
            width: 420,
            height: 420,
            borderRadius: 9999,
            background: 'radial-gradient(circle, rgba(196,181,253,0.5) 0%, rgba(196,181,253,0) 72%)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: -130,
            bottom: -180,
            width: 520,
            height: 520,
            borderRadius: 9999,
            background: 'radial-gradient(circle, rgba(167,139,250,0.55) 0%, rgba(167,139,250,0) 72%)',
          }}
        />

        <div
          style={{
            zIndex: 2,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            width: '100%',
            padding: '52px 64px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
            <img
              src={logoUrl}
              alt="TUNDA Logo"
              width={96}
              height={96}
              style={{
                borderRadius: 22,
                boxShadow: '0 0 24px rgba(192,132,252,0.75)',
              }}
            />
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                lineHeight: 1.05,
              }}
            >
              <span
                style={{
                  fontSize: 62,
                  fontWeight: 800,
                  letterSpacing: -1,
                }}
              >
                TUNDA Business Assistant
              </span>
              <span
                style={{
                  marginTop: 10,
                  fontSize: 30,
                  color: '#ddd6fe',
                }}
              >
                AI-powered business intelligence for SMEs
              </span>
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: 24,
              color: '#e9d5ff',
            }}
          >
            <span>Track sales • Manage stock • Understand profit</span>
            <span style={{ fontWeight: 700, color: '#ffffff' }}>tunda.ai</span>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}

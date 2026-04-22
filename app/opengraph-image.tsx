import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const contentType = 'image/png'
export const size = { width: 1200, height: 630 }
export const alt = 'Olivator — největší srovnávač olivových olejů v ČR'

export default async function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: 'linear-gradient(135deg, #ffffff 0%, #d8f3dc 100%)',
          padding: '80px',
          fontFamily: 'serif',
        }}
      >
        {/* Top — brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: '#2d6a4f',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '32px',
            }}
          >
            🫒
          </div>
          <div
            style={{
              fontSize: '32px',
              fontWeight: 500,
              color: '#1b4332',
              letterSpacing: '-0.5px',
            }}
          >
            Olivator
          </div>
        </div>

        {/* Middle — headline */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div
            style={{
              fontSize: '76px',
              fontWeight: 400,
              color: '#1d1d1f',
              letterSpacing: '-2px',
              lineHeight: 1.05,
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <span>Najdi svůj</span>
            <span style={{ fontStyle: 'italic', color: '#2d6a4f' }}>dokonalý olivový olej</span>
          </div>
          <div
            style={{
              fontSize: '28px',
              color: '#6e6e73',
              fontWeight: 300,
              maxWidth: '900px',
            }}
          >
            Objektivní Olivator Score &middot; Reálné ceny ze 18 prodejců &middot; Aktualizováno denně
          </div>
        </div>

        {/* Bottom — trust badges */}
        <div style={{ display: 'flex', gap: '14px' }}>
          {['✓ Nezávislé hodnocení', '✓ Reálná data', '✓ Žádná reklama'].map(t => (
            <div
              key={t}
              style={{
                fontSize: '20px',
                color: '#2d6a4f',
                background: '#ffffff',
                border: '1px solid #b7e4c7',
                padding: '10px 20px',
                borderRadius: '30px',
                fontWeight: 500,
              }}
            >
              {t}
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size }
  )
}

import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'

export const runtime = 'edge'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code = (
    searchParams.get('code') || 
    'JOIN'
  ).toString().toUpperCase()

  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#020420',
          backgroundImage: 'radial-gradient(circle at top right, #3de10022, transparent), radial-gradient(circle at bottom left, #3de10011, transparent)',
          fontFamily: 'sans-serif',
          padding: '60px',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            border: '2px solid rgba(61, 225, 0, 0.3)',
            borderRadius: '40px',
            padding: '60px 80px',
            boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
          }}
        >
          <div
            style={{
              fontSize: '24px',
              fontWeight: 900,
              color: '#3de100',
              textTransform: 'uppercase',
              letterSpacing: '0.2em',
              marginBottom: '20px',
            }}
          >
            Exclusive Invitation
          </div>
          
          <div
            style={{
              fontSize: '80px',
              fontWeight: 900,
              color: 'white',
              textAlign: 'center',
              lineHeight: 1,
              marginBottom: '40px',
              textTransform: 'uppercase',
            }}
          >
            DraftIQ <span style={{ color: '#3de100', fontStyle: 'italic', marginLeft: '16px' }}>Playoffs</span>
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              backgroundColor: 'rgba(61, 225, 0, 0.1)',
              border: '2px dashed rgba(61, 225, 0, 0.5)',
              borderRadius: '24px',
              padding: '30px 60px',
            }}
          >
            <div style={{ fontSize: '20px', color: '#888', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '10px' }}>
              Access Code
            </div>
            <div style={{ fontSize: '100px', fontWeight: 900, color: '#3de100', letterSpacing: '-0.02em' }}>
              {code}
            </div>
          </div>

          <div style={{ marginTop: '40px', fontSize: '20px', color: '#666', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Trade NFL Markets • Win Daily Prizes
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  )
}

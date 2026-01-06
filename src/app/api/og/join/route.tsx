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
          backgroundImage: 'radial-gradient(circle at 0% 0%, #3de10015 0%, transparent 50%), radial-gradient(circle at 100% 100%, #3de10010 0%, transparent 50%), linear-gradient(180deg, #020420 0%, #050a30 100%)',
          fontFamily: 'sans-serif',
          padding: '40px',
        }}
      >
        {/* Main Card */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            width: '900px',
            backgroundColor: 'rgba(2, 4, 32, 0.8)',
            border: '1px solid rgba(61, 225, 0, 0.3)',
            borderRadius: '32px',
            padding: '60px',
            position: 'relative',
            boxShadow: '0 40px 100px rgba(0,0,0,0.8)',
          }}
        >
          {/* Decorative Corner Borders */}
          <div style={{ position: 'absolute', top: '20px', left: '20px', width: '40px', height: '40px', borderTop: '4px solid #3de100', borderLeft: '4px solid #3de100', borderRadius: '8px 0 0 0' }} />
          <div style={{ position: 'absolute', top: '20px', right: '20px', width: '40px', height: '40px', borderTop: '4px solid #3de100', borderRight: '4px solid #3de100', borderRadius: '0 8px 0 0' }} />
          <div style={{ position: 'absolute', bottom: '20px', left: '20px', width: '40px', height: '40px', borderBottom: '4px solid #3de100', borderLeft: '4px solid #3de100', borderRadius: '0 0 0 8px' }} />
          <div style={{ position: 'absolute', bottom: '20px', right: '20px', width: '40px', height: '40px', borderBottom: '4px solid #3de100', borderRight: '4px solid #3de100', borderRadius: '0 0 8px 0' }} />

          {/* Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              marginBottom: '30px',
            }}
          >
            <div
              style={{
                width: '60px',
                height: '60px',
                backgroundColor: '#3de100',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: '20px',
                transform: 'rotate(-10deg)',
              }}
            >
              <div style={{ fontSize: '40px', color: '#020420', fontWeight: 'bold' }}>D</div>
            </div>
            <div
              style={{
                fontSize: '48px',
                fontWeight: 900,
                color: 'white',
                letterSpacing: '-0.03em',
              }}
            >
              DraftIQ <span style={{ color: '#3de100', fontStyle: 'italic' }}>Playoffs</span>
            </div>
          </div>

          <div
            style={{
              fontSize: '24px',
              fontWeight: 600,
              color: '#3de100',
              textTransform: 'uppercase',
              letterSpacing: '0.4em',
              marginBottom: '40px',
              opacity: 0.8,
            }}
          >
            Official Invitation
          </div>

          {/* Invitation Text */}
          <div
            style={{
              fontSize: '32px',
              color: 'white',
              textAlign: 'center',
              marginBottom: '50px',
              fontWeight: 400,
              lineHeight: 1.4,
            }}
          >
            You have been granted exclusive access to <br />
            <span style={{ fontWeight: 800 }}>DraftIQ Trading Markets</span>
          </div>

          {/* Code Section */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              backgroundColor: 'rgba(61, 225, 0, 0.05)',
              border: '2px solid rgba(61, 225, 0, 0.5)',
              borderRadius: '24px',
              padding: '40px 80px',
              backgroundImage: 'linear-gradient(135deg, rgba(61, 225, 0, 0.1), transparent)',
            }}
          >
            <div style={{ fontSize: '18px', color: '#3de100', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: '16px' }}>
              Your Access Code
            </div>
            <div style={{ fontSize: '110px', fontWeight: 900, color: 'white', letterSpacing: '0.05em', textShadow: '0 0 30px rgba(61, 225, 0, 0.4)' }}>
              {code}
            </div>
          </div>

          {/* Footer Info */}
          <div
            style={{
              marginTop: '50px',
              display: 'flex',
              alignItems: 'center',
              color: '#888',
              fontSize: '20px',
              fontWeight: 600,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', marginRight: '30px' }}>
              <div style={{ width: '8px', height: '8px', backgroundColor: '#3de100', borderRadius: '50%', marginRight: '10px' }} />
              Trade Projections
            </div>
            <div style={{ display: 'flex', alignItems: 'center', marginRight: '30px' }}>
              <div style={{ width: '8px', height: '8px', backgroundColor: '#3de100', borderRadius: '50%', marginRight: '10px' }} />
              Beat the Market
            </div>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{ width: '8px', height: '8px', backgroundColor: '#3de100', borderRadius: '50%', marginRight: '10px' }} />
              Win Daily
            </div>
          </div>
        </div>

        {/* URL at bottom */}
        <div style={{ marginTop: '30px', fontSize: '18px', color: '#444', fontWeight: 700, letterSpacing: '0.1em' }}>
          WWW.DRAFTIQ.APP/JOIN
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  )
}

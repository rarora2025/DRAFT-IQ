import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'

export const runtime = 'edge'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const code = (
      searchParams.get('code') || 
      'JOIN'
    ).toString().toUpperCase()

    const origin = req.nextUrl.origin
    const draftiqLogo = `${origin}/logo.png`

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
            padding: '40px',
          }}
        >
          {/* Main Card */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              width: '1000px',
              height: '500px',
              backgroundColor: '#050a30',
              border: '4px solid #3de100',
              borderRadius: '40px',
              padding: '40px',
              justifyContent: 'center',
            }}
          >
            {/* Logo */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                marginBottom: '20px',
              }}
            >
              <img 
                src={draftiqLogo} 
                width="120" 
                height="120" 
                style={{ borderRadius: '24px' }} 
              />
            </div>

            {/* Title */}
            <div
              style={{
                display: 'flex',
                fontSize: '84px',
                fontWeight: 'bold',
                color: 'white',
                marginBottom: '30px',
              }}
            >
              DraftIQ
            </div>

            {/* Invitation Text */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                fontSize: '32px',
                color: 'white',
                textAlign: 'center',
                marginBottom: '30px',
                alignItems: 'center',
              }}
            >
              <div style={{ display: 'flex' }}>You're invited to join the market</div>
            </div>

            {/* Code Section */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                backgroundColor: '#020420',
                border: '2px solid #3de100',
                borderRadius: '20px',
                padding: '20px 60px',
              }}
            >
              <div style={{ display: 'flex', fontSize: '18px', color: '#3de100', fontWeight: 'bold', marginBottom: '5px' }}>
                ACCESS CODE
              </div>
              <div style={{ display: 'flex', fontSize: '100px', fontWeight: 'bold', color: 'white' }}>
                {code}
              </div>
            </div>
          </div>

          {/* URL at bottom */}
          <div style={{ display: 'flex', marginTop: '30px', fontSize: '24px', color: '#3de100', fontWeight: 'bold' }}>
            WWW.DRAFTIQ.APP/JOIN
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    )
  } catch (e: any) {
    console.error(e)
    return new Response(`Failed to generate image`, { status: 500 })
  }
}

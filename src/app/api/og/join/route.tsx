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

    // Fetch fonts
    const [interBold, interRegular] = await Promise.all([
      fetch(new URL('https://github.com/google/fonts/raw/main/ofl/inter/static/Inter-Bold.ttf')).then((res) => res.arrayBuffer()),
      fetch(new URL('https://github.com/google/fonts/raw/main/ofl/inter/static/Inter-Regular.ttf')).then((res) => res.arrayBuffer()),
    ])

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
            fontFamily: 'Inter',
          }}
        >
          {/* Main Card */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              width: '1000px',
              height: '520px',
              backgroundColor: '#050a30',
              border: '4px solid #3de100',
              borderRadius: '40px',
              padding: '40px',
              justifyContent: 'center',
              boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
            }}
          >
            {/* Header section with logo and name */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                marginBottom: '20px',
              }}
            >
              <img 
                src={draftiqLogo} 
                width="100" 
                height="100" 
                style={{ borderRadius: '20px', marginBottom: '15px' }} 
              />
              <div
                style={{
                  display: 'flex',
                  fontSize: '72px',
                  fontWeight: 'bold',
                  color: 'white',
                  letterSpacing: '-2px',
                }}
              >
                DraftIQ
              </div>
            </div>

            {/* Invitation Text */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                fontSize: '28px',
                color: 'rgba(255,255,255,0.8)',
                textAlign: 'center',
                marginBottom: '30px',
                alignItems: 'center',
                fontWeight: 500,
              }}
            >
              <div style={{ display: 'flex' }}>YOU ARE INVITED TO JOIN DRAFTIQ</div>
            </div>

            {/* Code Section */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                backgroundColor: 'rgba(2, 4, 32, 0.8)',
                border: '2px solid rgba(61, 225, 0, 0.5)',
                borderRadius: '24px',
                padding: '15px 80px',
              }}
            >
              <div style={{ display: 'flex', fontSize: '14px', color: '#3de100', fontWeight: 'bold', letterSpacing: '4px', marginBottom: '5px' }}>
                ACCESS CODE
              </div>
              <div style={{ display: 'flex', fontSize: '110px', fontWeight: 'bold', color: 'white', letterSpacing: '8px' }}>
                {code}
              </div>
            </div>
          </div>

          {/* URL at bottom */}
          <div style={{ display: 'flex', marginTop: '25px', fontSize: '20px', color: 'rgba(61, 225, 0, 0.7)', fontWeight: 'bold', letterSpacing: '2px' }}>
            WWW.DRAFTIQ.APP/JOIN
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
        fonts: [
          {
            name: 'Inter',
            data: interRegular,
            style: 'normal',
            weight: 400,
          },
          {
            name: 'Inter',
            data: interBold,
            style: 'normal',
            weight: 700,
          },
        ],
      }
    )
  } catch (e: any) {
    console.error(e)
    return new Response(`Failed to generate image`, { status: 500 })
  }
}

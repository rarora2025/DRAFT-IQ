import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { VisualEditsMessenger } from "orchids-visual-edits";
import { AuthSecurity } from "@/components/AuthSecurity";
import { OnboardingProvider } from "@/components/OnboardingProvider";
import { AuthProvider } from "@/components/AuthProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "DraftIQ",
  description: "Live player projections and trading",
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/favicon.png", type: "image/png" },
    ],
  apple: [
        { url: "/favicon.png", type: "image/png" },
      ],
    },
    manifest: "/manifest.json",
  };

  import { Toaster } from "@/components/ui/sonner";
  import { NotificationListener } from "@/components/NotificationListener";
  import { Ticker } from "@/components/Ticker";
  import NavbarTop from "@/components/sections/navbar-top";
  import { Navbar } from "@/components/Navbar";
  import Script from "next/script";
      
      export default function RootLayout({
      children,
    }: Readonly<{
      children: React.ReactNode;
    }>) {
      return (
        <html lang="en">
            <head>
              <script dangerouslySetInnerHTML={{ __html: `
                (function() {
                  var originalError = console.error;
                  var originalWarn = console.warn;
                  console.error = function(msg) {
                    if (msg && typeof msg === 'string' && (msg.indexOf('[Vercel Web Analytics]') !== -1 || msg.indexOf('/_vercel/insights/script.js') !== -1)) {
                      return;
                    }
                    originalError.apply(console, arguments);
                  };
                  console.warn = function(msg) {
                    if (msg && typeof msg === 'string' && (msg.indexOf('[Vercel Web Analytics]') !== -1 || msg.indexOf('/_vercel/insights/script.js') !== -1)) {
                      return;
                    }
                    originalWarn.apply(console, arguments);
                  };
                })();
              ` }} />
            </head>
            <body
              className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-white pt-[104px] sm:pt-[104px]`}
            >
            <Script
              id="orchids-browser-logs"
              src="https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/scripts/orchids-browser-logs.js"
              strategy="afterInteractive"
              data-orchids-project-id="200e45b4-6171-4b26-b381-aa6678867b18"
            />

            <AuthProvider>
                <OnboardingProvider>
                  <AuthSecurity />
                  <NotificationListener />
                  <Ticker />
                  <NavbarTop />
                  {children}
                  <Navbar />
                  <Toaster position="top-center" richColors />
                  <VisualEditsMessenger />
                </OnboardingProvider>
              </AuthProvider>
            </body>
          </html>
        );
      }



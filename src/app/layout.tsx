import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { VisualEditsMessenger } from "orchids-visual-edits";
import { AuthSecurity } from "@/components/AuthSecurity";
import { OnboardingProvider } from "@/components/OnboardingProvider";

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
};

import { Toaster } from "@/components/ui/sonner";
  
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
          className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-white`}
        >

        <OnboardingProvider>
          <AuthSecurity />
          {children}
          <Toaster position="top-center" richColors />
          <VisualEditsMessenger />
        </OnboardingProvider>
      </body>
    </html>
  );
}

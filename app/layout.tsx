import type { Metadata, Viewport } from 'next'
import { Plus_Jakarta_Sans } from 'next/font/google'
import './globals.css'
import { Nav } from '@/components/nav'
import { BottomNav } from '@/components/bottom-nav'
import { SessionGuard } from '@/components/session-guard'
import { createClient } from '@/lib/supabase/server'

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
  variable: '--font-jakarta',
  display: 'swap',
})

export const viewport: Viewport = {
  themeColor: '#0f1629',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
}

export const metadata: Metadata = {
  title: 'JAX — Life OS',
  description: 'Tu sistema operativo personal',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'JAX',
  },
  icons: {
    icon: '/icon.svg',
    apple: '/apple-touch-icon.png',
  },
  formatDetection: {
    telephone: false,
  },
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <html lang="es" className={jakarta.variable}>
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </head>
      <body className="bg-background text-on-surface antialiased" style={{ fontFamily: 'var(--font-jakarta), sans-serif' }}>
        {user ? (
          <div className="min-h-screen">
            <SessionGuard />
            <div className="flex">
              <Nav />
              <main
                className="flex-1 md:ml-56 px-4 md:px-10 md:py-8 overflow-x-hidden min-h-screen pb-28 md:pb-0"
                style={{ paddingTop: 'max(env(safe-area-inset-top, 20px), 20px)' }}
              >
                {children}
              </main>
            </div>
            <BottomNav />
          </div>
        ) : (
          <main>{children}</main>
        )}
      </body>
    </html>
  )
}

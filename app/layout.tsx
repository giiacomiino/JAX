import type { Metadata } from 'next'
import './globals.css'
import { Nav } from '@/components/nav'
import { TopNav } from '@/components/top-nav'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = {
  title: 'JAX — Life OS',
  description: 'Personal life operating system',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <html lang="es">
      <body className="bg-background text-on-surface antialiased">
        {user ? (
          <div className="min-h-screen">
            <TopNav />
            <div className="flex pt-16">
              <Nav />
              <main className="flex-1 md:ml-64 p-margin-mobile md:p-margin-desktop overflow-x-hidden min-h-[calc(100vh-64px)]">
                {children}
              </main>
            </div>
          </div>
        ) : (
          <main>{children}</main>
        )}
      </body>
    </html>
  )
}

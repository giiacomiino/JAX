import type { Metadata } from 'next'
import './globals.css'
import { Nav } from '@/components/nav'
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
          <div className="flex">
            <Nav />
            <main className="ml-64 flex-1 p-gutter min-h-screen">{children}</main>
          </div>
        ) : (
          <main>{children}</main>
        )}
      </body>
    </html>
  )
}

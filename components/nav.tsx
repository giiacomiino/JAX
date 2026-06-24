'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
  { href: '/tasks', label: 'Tareas', icon: 'check_circle' },
  { href: '/agenda', label: 'Agenda', icon: 'calendar_today' },
  { href: '/finanzas', label: 'Finanzas', icon: 'payments' },
  { href: '/portfolio', label: 'Portfolio', icon: 'trending_up' },
]

export function Nav() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <>
      <link
        href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap"
        rel="stylesheet"
      />
      <aside className="hidden md:flex flex-col h-screen bg-surface/80 backdrop-blur-xl shadow-sm z-50 w-64 fixed left-0 top-0 p-4 gap-2">
        <div className="flex items-center gap-3 px-4 py-6 mb-4">
          <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
            <span className="text-on-primary font-bold text-label-md">J</span>
          </div>
          <div>
            <h1 className="text-headline-md font-bold text-primary">Jax</h1>
            <p className="text-label-sm text-on-surface-variant/70">Life OS</p>
          </div>
        </div>

        <nav className="flex flex-col gap-1 flex-grow">
          {navItems.map(({ href, label, icon }) => {
            const isActive = pathname === href || pathname.startsWith(href + '/')
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-label-md transition-all ${
                  isActive
                    ? 'bg-secondary-container text-on-secondary-container font-semibold'
                    : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
                }`}
              >
                <span className="material-symbols-outlined text-[20px]">{icon}</span>
                {label}
              </Link>
            )
          })}
        </nav>

        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-3 text-label-md text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface rounded-xl transition-all"
        >
          <span className="material-symbols-outlined text-[20px]">logout</span>
          Salir
        </button>
      </aside>
    </>
  )
}

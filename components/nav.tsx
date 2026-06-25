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
  { href: '/pillars', label: 'Pilares', icon: 'workspaces' },
  { href: '/calendar', label: 'Calendario', icon: 'calendar_month' },
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
      <aside className="hidden md:flex flex-col h-[calc(100vh-64px)] w-64 fixed left-0 top-16 bg-surface-container-low border-r border-outline-variant p-4 gap-2 z-40">
        <nav className="space-y-1 flex-1">
          {navItems.map(({ href, label, icon }) => {
            const isActive = pathname === href || pathname.startsWith(href + '/')
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-3 py-3 rounded-lg text-label-md transition-all ${
                  isActive
                    ? 'bg-secondary-container text-on-secondary-container font-bold translate-x-1'
                    : 'text-on-surface-variant hover:bg-surface-container-high hover:translate-x-1'
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
          className="w-full bg-primary text-on-primary py-3 rounded-xl text-label-md font-bold flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 transition-transform"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          Quick Add
        </button>

        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2 text-label-md text-on-surface-variant hover:bg-surface-container-high rounded-lg transition-colors"
        >
          <span className="material-symbols-outlined text-[18px]">logout</span>
          Salir
        </button>
      </aside>
    </>
  )
}

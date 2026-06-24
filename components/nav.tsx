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
      <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
      <aside className="hidden md:flex flex-col h-screen p-md gap-sm bg-surface-container-low border-r border-outline-variant w-64 fixed left-0 top-0 z-40">
        <div className="mb-lg px-2">
          <h1 className="text-headline-lg font-bold text-primary">JAX</h1>
          <p className="text-on-surface-variant text-label-md">Life OS</p>
        </div>

        <nav className="flex flex-col gap-xs flex-grow">
          {navItems.map(({ href, label, icon }) => {
            const isActive = pathname === href
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-sm px-4 py-3 rounded-lg transition-all ${
                  isActive
                    ? 'bg-secondary-container text-on-secondary-container font-bold translate-x-1'
                    : 'text-on-surface-variant hover:bg-surface-container-high hover:translate-x-1'
                }`}
              >
                <span className="material-symbols-outlined text-[20px]">{icon}</span>
                <span className="text-label-md">{label}</span>
              </Link>
            )
          })}
        </nav>

        <button
          onClick={handleLogout}
          className="flex items-center gap-sm px-4 py-3 text-label-md text-on-surface-variant hover:bg-surface-container-high rounded-lg transition-colors"
        >
          <span className="material-symbols-outlined text-[20px]">logout</span>
          Salir
        </button>
      </aside>
    </>
  )
}

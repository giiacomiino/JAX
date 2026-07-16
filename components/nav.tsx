'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { JaxLogo } from '@/components/jax-logo'

const navItems = [
  { href: '/dashboard', label: 'Dashboard',     icon: 'dashboard' },
  { href: '/finanzas',  label: 'Finanzas',      icon: 'payments' },
  { href: '/tasks',     label: 'Tareas',         icon: 'check_circle' },
  { href: '/pillars',   label: 'Pilares',        icon: 'workspaces' },
  { href: '/calendar',  label: 'Calendario',    icon: 'calendar_month' },
  { href: '/settings',  label: 'Configuración', icon: 'settings' },
]

export function Nav() {
  const pathname = usePathname()
  const router   = useRouter()
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
      <aside className="hidden md:flex flex-col h-screen w-56 fixed left-0 top-0 bg-surface border-r border-outline-variant p-3 gap-1.5 z-40">
        {/* Logo */}
        <Link href="/dashboard" className="flex items-center gap-2.5 px-1 py-3 mb-2">
          <JaxLogo size={30} />
          <span className="text-[20px] font-extrabold text-primary" style={{ letterSpacing: '-0.04em' }}>JAX</span>
        </Link>

        <nav className="space-y-0.5 flex-1">
          {navItems.map(({ href, label, icon }) => {
            const isActive = pathname === href || pathname.startsWith(href + '/')
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-label-md font-semibold transition-all ${
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
                }`}
              >
                <span
                  className="material-symbols-outlined text-[20px]"
                  style={{ fontVariationSettings: isActive ? "'FILL' 1, 'wght' 500" : "'FILL' 0, 'wght' 400" }}
                >
                  {icon}
                </span>
                {label}
              </Link>
            )
          })}
        </nav>

        <div className="h-px bg-outline-variant mx-1 mb-1" />

        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-label-md text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors"
        >
          <span className="material-symbols-outlined text-[18px]">logout</span>
          Salir
        </button>
      </aside>
    </>
  )
}

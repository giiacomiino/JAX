'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { JaxLogo } from '@/components/jax-logo'

const navLinks = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/tasks', label: 'Tareas' },
  { href: '/finanzas', label: 'Finanzas' },
  { href: '/portfolio', label: 'Portfolio' },
  { href: '/agenda', label: 'Agenda' },
]

export function TopNav() {
  const pathname = usePathname()
  return (
    <header className="fixed top-0 w-full z-50 flex justify-between items-center px-4 md:px-gutter h-16 bg-surface/80 backdrop-blur-xl border-b border-outline-variant">
      <div className="flex items-center gap-4">
        <Link href="/dashboard" className="flex items-center gap-2">
          <JaxLogo size={28} />
          <span className="text-[20px] font-extrabold text-primary" style={{ letterSpacing: '-0.04em' }}>JAX</span>
        </Link>
      </div>
      <nav className="hidden md:flex items-center gap-6">
        {navLinks.map(link => (
          <Link
            key={link.href}
            href={link.href}
            className={`text-label-md transition-colors ${
              pathname === link.href || pathname.startsWith(link.href + '/')
                ? 'text-primary font-bold'
                : 'text-on-surface-variant hover:text-primary'
            }`}
          >
            {link.label}
          </Link>
        ))}
      </nav>
      <div className="flex items-center gap-3">
        <span className="material-symbols-outlined text-on-surface-variant hover:text-primary transition-colors cursor-pointer text-[22px]">notifications</span>
        <span className="material-symbols-outlined text-on-surface-variant hover:text-primary transition-colors cursor-pointer text-[22px]">settings</span>
        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
          <span className="text-label-sm font-bold text-primary">G</span>
        </div>
      </div>
    </header>
  )
}

'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, CheckSquare, Calendar, CreditCard, TrendingUp, LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/tasks', label: 'Tareas', icon: CheckSquare },
  { href: '/agenda', label: 'Agenda', icon: Calendar },
  { href: '/finanzas', label: 'Finanzas', icon: CreditCard },
  { href: '/portfolio', label: 'Portfolio', icon: TrendingUp },
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
    <nav className="w-56 min-h-screen bg-slate-900 border-r border-slate-800 flex flex-col p-4 fixed left-0 top-0">
      <div className="mb-8 px-2">
        <span className="text-white font-bold text-xl">JAX</span>
        <p className="text-slate-500 text-xs">Life OS</p>
      </div>
      <div className="flex-1 space-y-1">
        {navItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
              pathname === href
                ? 'bg-slate-700 text-white'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Icon size={16} />
            {label}
          </Link>
        ))}
      </div>
      <button
        onClick={handleLogout}
        className="flex items-center gap-3 px-3 py-2 text-sm text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
      >
        <LogOut size={16} />
        Salir
      </button>
    </nav>
  )
}

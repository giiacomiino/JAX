'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

const PRIMARY_NAV = [
  { href: '/dashboard', label: 'Inicio',     icon: 'home' },
  { href: '/tasks',     label: 'Tareas',     icon: 'check_circle' },
  { href: '/calendar',  label: 'Calendario', icon: 'calendar_month' },
]

const MORE_NAV = [
  { href: '/finanzas',  label: 'Finanzas',   icon: 'payments' },
  { href: '/pillars',   label: 'Pilares',    icon: 'workspaces' },
  { href: '/settings',  label: 'Config',     icon: 'settings' },
]

export function BottomNav() {
  const pathname = usePathname()
  const [moreOpen, setMoreOpen] = useState(false)

  const isMoreActive = MORE_NAV.some(n => pathname === n.href || pathname.startsWith(n.href + '/'))

  return (
    <>
      {/* Backdrop */}
      {moreOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={() => setMoreOpen(false)} />
      )}

      {/* More drawer */}
      {moreOpen && (
        <div className="md:hidden fixed bottom-[calc(64px+env(safe-area-inset-bottom))] left-4 right-4 z-50 bg-surface rounded-2xl border border-outline-variant shadow-2xl overflow-hidden">
          <div className="p-3 grid grid-cols-4 gap-1">
            {MORE_NAV.map(({ href, label, icon }) => {
              const active = pathname === href || pathname.startsWith(href + '/')
              return (
                <Link key={href} href={href} onClick={() => setMoreOpen(false)}
                  className={`flex flex-col items-center gap-1 py-3 px-2 rounded-xl transition-all ${
                    active ? 'bg-primary/10 text-primary' : 'text-on-surface-variant hover:bg-surface-container'
                  }`}>
                  <span className={`material-symbols-outlined text-[22px] ${active ? 'font-variation-settings-filled' : ''}`}
                    style={active ? { fontVariationSettings: "'FILL' 1" } : {}}>
                    {icon}
                  </span>
                  <span className="text-[10px] font-semibold">{label}</span>
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {/* Bottom bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-surface/95 backdrop-blur-xl border-t border-outline-variant"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="flex items-center h-16">
          {PRIMARY_NAV.map(({ href, label, icon }) => {
            const active = pathname === href || pathname.startsWith(href + '/')
            return (
              <Link key={href} href={href}
                className={`flex-1 flex flex-col items-center justify-center gap-0.5 h-full transition-all active:scale-95 ${
                  active ? 'text-primary' : 'text-on-surface-variant'
                }`}>
                <div className={`relative flex items-center justify-center w-10 h-6 rounded-full transition-all ${
                  active ? 'bg-primary/15' : ''
                }`}>
                  <span className="material-symbols-outlined text-[22px]"
                    style={active ? { fontVariationSettings: "'FILL' 1" } : {}}>
                    {icon}
                  </span>
                </div>
                <span className={`text-[10px] font-semibold transition-all ${active ? 'opacity-100' : 'opacity-70'}`}>
                  {label}
                </span>
              </Link>
            )
          })}

          {/* Más */}
          <button onClick={() => setMoreOpen(v => !v)}
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 h-full transition-all active:scale-95 ${
              isMoreActive || moreOpen ? 'text-primary' : 'text-on-surface-variant'
            }`}>
            <div className={`relative flex items-center justify-center w-10 h-6 rounded-full transition-all ${
              isMoreActive || moreOpen ? 'bg-primary/15' : ''
            }`}>
              <span className="material-symbols-outlined text-[22px]"
                style={isMoreActive ? { fontVariationSettings: "'FILL' 1" } : {}}>
                {moreOpen ? 'close' : 'grid_view'}
              </span>
            </div>
            <span className="text-[10px] font-semibold opacity-70">Más</span>
          </button>
        </div>
      </nav>
    </>
  )
}

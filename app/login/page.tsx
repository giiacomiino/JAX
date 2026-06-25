'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { JaxLogo } from '@/components/jax-logo'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    if (!remember) {
      localStorage.setItem('jax_remember', 'false')
      sessionStorage.setItem('jax_session_active', '1')
    } else {
      localStorage.removeItem('jax_remember')
      sessionStorage.removeItem('jax_session_active')
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-sm">
        {/* Logo + título */}
        <div className="text-center mb-10 space-y-3">
          <div className="flex justify-center">
            <JaxLogo size={72} />
          </div>
          <div>
            <h1 className="font-display text-[48px] font-extrabold text-primary leading-none" style={{ letterSpacing: '-0.04em' }}>JAX</h1>
            <p className="text-on-surface-variant text-body-md mt-1.5">Tu Life OS personal</p>
          </div>
        </div>

        {/* Card */}
        <div className="bg-surface rounded-3xl border border-outline-variant zen-shadow p-8 space-y-5">
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-label-sm text-on-surface-variant font-semibold block">Email</label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)} required
                placeholder="tu@email.com"
                className="w-full px-4 py-3 rounded-2xl bg-surface-container border border-outline-variant text-on-surface text-body-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-outline"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-label-sm text-on-surface-variant font-semibold block">Contraseña</label>
              <input
                type="password" value={password} onChange={e => setPassword(e.target.value)} required
                placeholder="••••••••"
                className="w-full px-4 py-3 rounded-2xl bg-surface-container border border-outline-variant text-on-surface text-body-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-outline"
              />
            </div>

            {/* Keep me signed in */}
            <button
              type="button"
              onClick={() => setRemember(r => !r)}
              className="flex items-center gap-3 w-full group"
            >
              <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                remember
                  ? 'bg-primary border-primary'
                  : 'border-outline-variant group-hover:border-primary'
              }`}>
                {remember && <span className="material-symbols-outlined text-[13px] text-on-primary">check</span>}
              </div>
              <span className="text-label-md text-on-surface-variant group-hover:text-on-surface transition-colors">
                Mantener sesión iniciada
              </span>
            </button>

            {error && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-error/10 border border-error/20">
                <span className="material-symbols-outlined text-[16px] text-error">error</span>
                <p className="text-label-sm text-error">{error}</p>
              </div>
            )}

            <button
              type="submit" disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-primary text-on-primary py-3.5 rounded-2xl text-label-md font-bold hover:opacity-90 active:scale-95 transition-all disabled:opacity-50 mt-2"
            >
              {loading && <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>}
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>
        </div>

        <p className="text-center text-label-sm text-on-surface-variant mt-6">
          JAX · Sistema personal de vida
        </p>
      </div>
    </div>
  )
}

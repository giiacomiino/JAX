'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
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
    } else {
      router.push('/dashboard')
      router.refresh()
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <h1 className="font-display text-[56px] font-bold text-primary leading-none tracking-tight">JAX</h1>
          <p className="text-on-surface-variant text-body-md mt-2">Tu Life OS personal</p>
        </div>

        <div className="bg-surface-container-lowest rounded-3xl border border-outline-variant zen-shadow p-8 space-y-5">
          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-label-sm text-on-surface-variant font-medium block">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-2xl bg-surface-container border border-outline-variant text-on-surface text-body-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                placeholder="tu@email.com"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-label-sm text-on-surface-variant font-medium block">Contraseña</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-2xl bg-surface-container border border-outline-variant text-on-surface text-body-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-error/10 border border-error/20">
                <span className="material-symbols-outlined text-[16px] text-error">error</span>
                <p className="text-label-sm text-error">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-primary text-on-primary py-3.5 rounded-2xl text-label-md font-bold hover:opacity-90 active:scale-95 transition-all disabled:opacity-50"
            >
              {loading && <span className="material-symbols-outlined text-[16px]">progress_activity</span>}
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

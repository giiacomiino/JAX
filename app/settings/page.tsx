'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'

interface GoogleAccount {
  id: string
  email: string
  label: string
  color: string
  token_expiry: string | null
  created_at: string
}

const ACCOUNT_COLORS = [
  { value: '#0891b2', label: 'Azul' },
  { value: '#7c3aed', label: 'Morado' },
  { value: '#059669', label: 'Verde' },
  { value: '#d97706', label: 'Naranja' },
  { value: '#dc2626', label: 'Rojo' },
  { value: '#0f172a', label: 'Oscuro' },
]

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function ConnectForm({ onConnect }: { onConnect: () => void }) {
  const [label, setLabel] = useState('')
  const [color, setColor] = useState('#0891b2')
  const [open, setOpen] = useState(false)

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-on-primary text-label-md font-semibold hover:opacity-90 transition-opacity"
      >
        <span className="material-symbols-outlined text-[18px]">add</span>
        Conectar cuenta
      </button>
    )
  }

  return (
    <div className="bg-surface border border-outline-variant rounded-2xl p-5 space-y-4">
      <p className="text-label-md font-semibold text-on-surface">Nueva cuenta de Google</p>

      <div className="space-y-1">
        <label className="text-label-sm text-on-surface-variant">Nombre o etiqueta</label>
        <input
          type="text"
          placeholder="ej. Trabajo, Personal, QiORA..."
          value={label}
          onChange={e => setLabel(e.target.value)}
          autoFocus
          className="w-full px-3 py-2 rounded-xl bg-surface-container border border-outline-variant text-on-surface text-label-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
        />
      </div>

      <div className="space-y-1">
        <label className="text-label-sm text-on-surface-variant">Color en el calendario</label>
        <div className="flex gap-2">
          {ACCOUNT_COLORS.map(c => (
            <button
              key={c.value}
              onClick={() => setColor(c.value)}
              title={c.label}
              className={`w-7 h-7 rounded-full border-2 transition-all ${color === c.value ? 'border-on-surface scale-110' : 'border-transparent hover:scale-105'}`}
              style={{ backgroundColor: c.value }}
            />
          ))}
        </div>
      </div>

      <div className="flex gap-3 justify-end">
        <button
          onClick={() => setOpen(false)}
          className="px-4 py-2 rounded-xl text-label-md text-on-surface-variant hover:bg-surface-container transition-colors"
        >
          Cancelar
        </button>
        <a
          href={`/api/google/auth?label=${encodeURIComponent(label || 'Google Account')}&color=${encodeURIComponent(color)}`}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-on-primary text-label-md font-semibold hover:opacity-90 transition-opacity ${!label.trim() ? 'pointer-events-none opacity-50' : ''}`}
        >
          <span className="material-symbols-outlined text-[16px]">open_in_new</span>
          Autorizar con Google
        </a>
      </div>
    </div>
  )
}

export default function SettingsPage() {
  const searchParams = useSearchParams()
  const [accounts, setAccounts] = useState<GoogleAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<{ created: number; accounts: number } | null>(null)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)

  const connectedEmail = searchParams.get('connected')
  const errorParam = searchParams.get('error')

  useEffect(() => {
    if (connectedEmail) setToast({ type: 'success', msg: `Cuenta ${connectedEmail} conectada` })
    if (errorParam) setToast({ type: 'error', msg: `Error al conectar: ${errorParam}` })
  }, [connectedEmail, errorParam])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 4000)
    return () => clearTimeout(t)
  }, [toast])

  function fetchAccounts() {
    fetch('/api/google/accounts')
      .then(r => r.json())
      .then(data => { setAccounts(Array.isArray(data) ? data : []); setLoading(false) })
      .catch(() => setLoading(false))
  }

  useEffect(() => { fetchAccounts() }, [])

  async function handleDisconnect(id: string, email: string) {
    if (!confirm(`¿Desconectar ${email}?`)) return
    const res = await fetch(`/api/google/accounts/${id}`, { method: 'DELETE' })
    if (res.ok) setAccounts(prev => prev.filter(a => a.id !== id))
  }

  async function handleSync() {
    setSyncing(true)
    setSyncResult(null)
    try {
      const res = await fetch('/api/google/sync', { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        setSyncResult(data)
        setToast({ type: 'success', msg: `${data.created} eventos creados en ${data.accounts} cuenta(s)` })
      } else {
        setToast({ type: 'error', msg: data.error ?? 'Error al sincronizar' })
      }
    } finally {
      setSyncing(false)
    }
  }

  const isExpired = (expiry: string | null) =>
    !expiry || new Date(expiry) < new Date()

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-20 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-2xl shadow-lg text-label-md font-medium transition-all ${
          toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-error text-white'
        }`}>
          <span className="material-symbols-outlined text-[18px]">
            {toast.type === 'success' ? 'check_circle' : 'error'}
          </span>
          {toast.msg}
        </div>
      )}

      <div>
        <h1 className="font-display text-display-sm font-extrabold text-on-surface" style={{ letterSpacing: '-0.03em' }}>
          Configuración
        </h1>
        <p className="text-label-md text-on-surface-variant mt-1">Integraciones y preferencias</p>
      </div>

      {/* Google Calendar */}
      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-surface-container border border-outline-variant flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
          </div>
          <div>
            <h2 className="font-display font-bold text-title-md text-on-surface">Google Calendar</h2>
            <p className="text-label-sm text-on-surface-variant">Conecta tus cuentas para ver eventos en JAX y exportar pagos</p>
          </div>
        </div>

        {/* Connected accounts */}
        {loading ? (
          <div className="flex items-center gap-2 py-4 text-label-md text-on-surface-variant">
            <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
            Cargando cuentas...
          </div>
        ) : accounts.length === 0 ? (
          <div className="bg-surface-container rounded-2xl border border-outline-variant border-dashed p-6 text-center">
            <span className="material-symbols-outlined text-[36px] text-outline-variant block mb-2">calendar_month</span>
            <p className="text-label-md text-on-surface-variant">Sin cuentas conectadas</p>
            <p className="text-label-sm text-on-surface-variant/70 mt-1">Conecta tu Google Calendar para ver todos tus eventos en un solo lugar</p>
          </div>
        ) : (
          <div className="space-y-2">
            {accounts.map(account => {
              const expired = isExpired(account.token_expiry)
              return (
                <div key={account.id} className="flex items-center gap-3 p-4 bg-surface rounded-2xl border border-outline-variant">
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: account.color }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-label-md font-semibold text-on-surface">{account.label}</p>
                      {expired && (
                        <span className="text-label-sm px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200">
                          Token expirado
                        </span>
                      )}
                    </div>
                    <p className="text-label-sm text-on-surface-variant truncate">{account.email}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {expired && (
                      <a
                        href={`/api/google/auth?label=${encodeURIComponent(account.label)}&color=${encodeURIComponent(account.color)}`}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-label-sm font-medium bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition-colors"
                      >
                        <span className="material-symbols-outlined text-[14px]">refresh</span>
                        Reconectar
                      </a>
                    )}
                    <button
                      onClick={() => handleDisconnect(account.id, account.email)}
                      className="w-8 h-8 flex items-center justify-center rounded-xl text-on-surface-variant hover:text-error hover:bg-error/10 transition-colors"
                    >
                      <span className="material-symbols-outlined text-[16px]">link_off</span>
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <ConnectForm onConnect={fetchAccounts} />

        {/* Sync to Google */}
        {accounts.length > 0 && (
          <div className="bg-surface-container rounded-2xl border border-outline-variant p-5 space-y-3">
            <div>
              <p className="text-label-md font-semibold text-on-surface">Exportar pagos FinWise → Google Calendar</p>
              <p className="text-label-sm text-on-surface-variant mt-0.5">
                Crea eventos en tu Google Calendar con los pagos de tarjetas y deudas de los próximos 3 meses.
                Los eventos se agregan a tu calendario principal.
              </p>
            </div>

            {syncResult && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-green-50 border border-green-200 text-label-sm text-green-700">
                <span className="material-symbols-outlined text-[15px]">check_circle</span>
                {syncResult.created} eventos creados en {syncResult.accounts} cuenta(s)
              </div>
            )}

            <button
              onClick={handleSync}
              disabled={syncing}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-surface border border-outline-variant text-label-md font-semibold text-on-surface hover:bg-surface-container disabled:opacity-50 transition-colors"
            >
              {syncing
                ? <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>
                : <span className="material-symbols-outlined text-[16px]">sync</span>
              }
              {syncing ? 'Sincronizando...' : 'Sincronizar pagos ahora'}
            </button>
          </div>
        )}
      </section>

      {/* Setup instructions */}
      {!process.env.NEXT_PUBLIC_GOOGLE_CONFIGURED && (
        <section className="bg-amber-50 border border-amber-200 rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px] text-amber-600">info</span>
            <p className="text-label-md font-semibold text-amber-800">Configuración requerida</p>
          </div>
          <p className="text-label-sm text-amber-700">
            Para activar Google Calendar, agrega estas variables de entorno en Vercel:
          </p>
          <div className="bg-amber-100 rounded-xl p-3 space-y-1 font-mono text-label-sm text-amber-900">
            <p>GOOGLE_CLIENT_ID=<span className="text-amber-600">tu_client_id</span></p>
            <p>GOOGLE_CLIENT_SECRET=<span className="text-amber-600">tu_client_secret</span></p>
            <p>NEXT_PUBLIC_APP_URL=<span className="text-amber-600">https://tu-dominio.vercel.app</span></p>
          </div>
          <p className="text-label-sm text-amber-700">
            Crea las credenciales en{' '}
            <span className="font-semibold">Google Cloud Console → APIs & Services → Credentials → OAuth 2.0 Client ID (Web application)</span>.
            URI de redirección autorizada:{' '}
            <span className="font-mono bg-amber-100 px-1 rounded">https://tu-dominio.vercel.app/api/google/callback</span>
          </p>
        </section>
      )}
    </div>
  )
}

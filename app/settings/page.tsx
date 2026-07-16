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

interface Pillar {
  id: string
  name: string
  color: string
  google_account_id: string | null
}

const ACCOUNT_COLORS = [
  { value: '#0891b2', label: 'Azul' },
  { value: '#7c3aed', label: 'Morado' },
  { value: '#059669', label: 'Verde' },
  { value: '#d97706', label: 'Naranja' },
  { value: '#dc2626', label: 'Rojo' },
  { value: '#0f172a', label: 'Oscuro' },
]

function GoogleLogo() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  )
}

function ConnectForm({ onConnect }: { onConnect: () => void }) {
  const [label, setLabel] = useState('')
  const [color, setColor] = useState('#0891b2')
  const [open, setOpen] = useState(false)

  if (!open) {
    return (
      <button onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-on-primary text-label-md font-semibold hover:opacity-90 transition-opacity">
        <span className="material-symbols-outlined text-[18px]">add</span>
        Conectar cuenta
      </button>
    )
  }

  return (
    <div className="bg-surface-container rounded-2xl border border-outline-variant p-5 space-y-4">
      <p className="text-label-md font-semibold text-on-surface">Nueva cuenta de Google</p>

      <div className="space-y-1">
        <label className="text-label-sm text-on-surface-variant">Etiqueta</label>
        <input type="text" placeholder="ej. Personal, QiORA, Trabajo..."
          value={label} onChange={e => setLabel(e.target.value)} autoFocus
          className="w-full px-3 py-2 rounded-xl bg-surface border border-outline-variant text-on-surface text-label-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
        />
      </div>

      <div className="space-y-1">
        <label className="text-label-sm text-on-surface-variant">Color en el calendario</label>
        <div className="flex gap-2">
          {ACCOUNT_COLORS.map(c => (
            <button key={c.value} onClick={() => setColor(c.value)} title={c.label}
              className={`w-7 h-7 rounded-full border-2 transition-all ${color === c.value ? 'border-on-surface scale-110' : 'border-transparent hover:scale-105'}`}
              style={{ backgroundColor: c.value }}
            />
          ))}
        </div>
      </div>

      <div className="flex gap-3 justify-end">
        <button onClick={() => setOpen(false)}
          className="px-4 py-2 rounded-xl text-label-md text-on-surface-variant hover:bg-surface transition-colors">
          Cancelar
        </button>
        <a href={`/api/google/auth?label=${encodeURIComponent(label || 'Google Account')}&color=${encodeURIComponent(color)}`}
          onClick={() => onConnect()}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-on-primary text-label-md font-semibold hover:opacity-90 transition-opacity ${!label.trim() ? 'pointer-events-none opacity-50' : ''}`}>
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
  const [pillars, setPillars] = useState<Pillar[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<{ created: number; accounts: number } | null>(null)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)
  const [disconnecting, setDisconnecting] = useState<string | null>(null)

  const connectedEmail = searchParams.get('connected')
  const errorParam = searchParams.get('error')

  useEffect(() => {
    if (connectedEmail) {
      setToast({ type: 'success', msg: `✓ ${connectedEmail} conectada` })
      // Re-fetch after a short delay to ensure the DB write is visible
      const t = setTimeout(() => fetchAccounts(), 800)
      return () => clearTimeout(t)
    }
    if (errorParam) setToast({ type: 'error', msg: `Error: ${errorParam}` })
  }, [connectedEmail, errorParam])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 5000)
    return () => clearTimeout(t)
  }, [toast])

  function fetchAccounts() {
    setLoading(true)
    Promise.all([
      fetch('/api/google/accounts').then(r => r.json()).catch(() => []),
      fetch('/api/pillars').then(r => r.json()).catch(() => []),
    ]).then(([accs, pils]) => {
      setAccounts(Array.isArray(accs) ? accs : [])
      setPillars(Array.isArray(pils) ? pils : [])
    }).finally(() => setLoading(false))
  }

  useEffect(() => { fetchAccounts() }, [])

  async function handlePillarLink(pillarId: string, accountId: string | null) {
    const res = await fetch(`/api/pillars/${pillarId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ google_account_id: accountId || null }),
    })
    if (res.ok) {
      setPillars(prev => prev.map(p => p.id === pillarId ? { ...p, google_account_id: accountId } : p))
      setToast({ type: 'success', msg: accountId ? 'Pilar vinculado' : 'Pilar desvinculado' })
    }
  }

  async function handleDisconnect(id: string, email: string) {
    if (!confirm(`¿Desconectar ${email}?`)) return
    setDisconnecting(id)
    const res = await fetch(`/api/google/accounts/${id}`, { method: 'DELETE' })
    if (res.ok) setAccounts(prev => prev.filter(a => a.id !== id))
    setDisconnecting(null)
  }

  async function handleSync() {
    setSyncing(true)
    setSyncResult(null)
    try {
      const res = await fetch('/api/google/sync', { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        setSyncResult(data)
        setToast({ type: 'success', msg: `${data.created} eventos exportados a Google Calendar` })
      } else {
        setToast({ type: 'error', msg: data.error ?? 'Error al sincronizar' })
      }
    } finally {
      setSyncing(false)
    }
  }

  // Access tokens expire in 1h but are auto-refreshed via refresh_token — only
  // show as "expired" when the account has no refresh_token (needs reconnect)
  const needsReconnect = (account: GoogleAccount) => !account.token_expiry

  const activeAccounts = accounts.filter(a => !needsReconnect(a))
  const expiredAccounts = accounts.filter(a => needsReconnect(a))

  return (
    <div className="max-w-2xl mx-auto space-y-8 pb-8">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-20 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-2xl shadow-lg text-label-md font-medium ${
          toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
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

      {/* ── Google Calendar ── */}
      <section className="space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-surface-container border border-outline-variant flex items-center justify-center">
              <GoogleLogo />
            </div>
            <div>
              <h2 className="font-bold text-title-sm text-on-surface">Google Calendar</h2>
              <p className="text-label-sm text-on-surface-variant">
                {loading ? 'Cargando...' : `${accounts.length} cuenta${accounts.length !== 1 ? 's' : ''} conectada${accounts.length !== 1 ? 's' : ''}`}
              </p>
            </div>
          </div>
          {!loading && <ConnectForm onConnect={() => {}} />}
        </div>

        {/* Account list */}
        {loading ? (
          <div className="flex items-center gap-2 py-6 justify-center text-on-surface-variant">
            <span className="material-symbols-outlined text-[20px] animate-spin">progress_activity</span>
            <span className="text-label-md">Cargando cuentas...</span>
          </div>
        ) : accounts.length === 0 ? (
          <div className="bg-surface-container rounded-2xl border border-dashed border-outline-variant p-8 text-center space-y-2">
            <span className="material-symbols-outlined text-[40px] text-outline-variant block">calendar_month</span>
            <p className="text-label-md font-medium text-on-surface-variant">Sin cuentas conectadas</p>
            <p className="text-label-sm text-on-surface-variant/70">Conecta tu Google Calendar para centralizar todos tus eventos en JAX</p>
          </div>
        ) : (
          <div className="space-y-2">
            {/* Active accounts */}
            {activeAccounts.length > 0 && (
              <div className="space-y-2">
                {activeAccounts.map(account => (
                  <div key={account.id}
                    className="flex items-center gap-3 p-4 bg-surface rounded-2xl border border-outline-variant hover:border-primary/30 transition-colors">
                    {/* Color dot */}
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 border-2"
                      style={{ borderColor: account.color, backgroundColor: account.color + '15' }}>
                      <span className="material-symbols-outlined text-[18px]" style={{ color: account.color }}>
                        calendar_month
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-label-md font-bold text-on-surface">{account.label}</p>
                        <span className="flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
                          Activa
                        </span>
                      </div>
                      <p className="text-label-sm text-on-surface-variant truncate">{account.email}</p>
                      <p className="text-[10px] text-on-surface-variant/60 mt-0.5">
                        Se renueva automáticamente
                      </p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: account.color }} />
                      <button onClick={() => handleDisconnect(account.id, account.email)}
                        disabled={disconnecting === account.id}
                        className="w-8 h-8 flex items-center justify-center rounded-xl text-on-surface-variant hover:text-red-500 hover:bg-red-50 transition-colors ml-1">
                        <span className="material-symbols-outlined text-[16px]">
                          {disconnecting === account.id ? 'progress_activity' : 'link_off'}
                        </span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Expired accounts */}
            {expiredAccounts.length > 0 && (
              <div className="space-y-2">
                <p className="text-label-sm font-semibold text-on-surface-variant px-1">Token expirado — reconectar</p>
                {expiredAccounts.map(account => (
                  <div key={account.id}
                    className="flex items-center gap-3 p-4 bg-amber-50 rounded-2xl border border-amber-200">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-amber-100 border border-amber-200">
                      <span className="material-symbols-outlined text-[18px] text-amber-600">warning</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-label-md font-bold text-amber-800">{account.label}</p>
                      <p className="text-label-sm text-amber-700 truncate">{account.email}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <a href={`/api/google/auth?label=${encodeURIComponent(account.label)}&color=${encodeURIComponent(account.color)}`}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-label-sm font-semibold bg-amber-100 text-amber-800 border border-amber-300 hover:bg-amber-200 transition-colors">
                        <span className="material-symbols-outlined text-[14px]">refresh</span>
                        Reconectar
                      </a>
                      <button onClick={() => handleDisconnect(account.id, account.email)}
                        className="w-8 h-8 flex items-center justify-center rounded-xl text-amber-600 hover:text-red-500 hover:bg-red-50 transition-colors">
                        <span className="material-symbols-outlined text-[16px]">link_off</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Pillars → Google Calendar */}
        {activeAccounts.length > 0 && pillars.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-primary">link</span>
              <p className="text-label-md font-semibold text-on-surface">Pilares → Google Calendar</p>
            </div>
            <p className="text-label-sm text-on-surface-variant -mt-1">
              Al crear tareas o eventos con un pilar, se agendan automáticamente en el calendario vinculado.
            </p>
            <div className="space-y-2">
              {pillars.map(pillar => (
                <div key={pillar.id} className="flex items-center gap-3 p-3 bg-surface rounded-xl border border-outline-variant">
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: pillar.color }} />
                  <span className="text-label-md font-medium text-on-surface flex-1 min-w-0 truncate">{pillar.name}</span>
                  <select
                    value={pillar.google_account_id ?? ''}
                    onChange={e => handlePillarLink(pillar.id, e.target.value || null)}
                    className="text-label-sm text-on-surface bg-surface-container border border-outline-variant rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all max-w-[160px]">
                    <option value="">Sin vincular</option>
                    {activeAccounts.map(acc => (
                      <option key={acc.id} value={acc.id}>{acc.label}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Sync payments to Google */}
        {activeAccounts.length > 0 && (
          <div className="bg-surface-container rounded-2xl border border-outline-variant p-5 space-y-3">
            <div className="flex items-start gap-3">
              <span className="material-symbols-outlined text-[20px] text-primary mt-0.5">sync</span>
              <div>
                <p className="text-label-md font-semibold text-on-surface">Exportar pagos → Google Calendar</p>
                <p className="text-label-sm text-on-surface-variant mt-0.5">
                  Crea eventos en tu Google Calendar con los pagos de tarjetas y deudas de los próximos 3 meses.
                </p>
              </div>
            </div>

            {syncResult && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-green-50 border border-green-200 text-label-sm text-green-700">
                <span className="material-symbols-outlined text-[15px]">check_circle</span>
                {syncResult.created} eventos exportados a {syncResult.accounts} cuenta(s)
              </div>
            )}

            <button onClick={handleSync} disabled={syncing}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-surface border border-outline-variant text-label-md font-semibold text-on-surface hover:bg-white disabled:opacity-50 transition-colors">
              <span className={`material-symbols-outlined text-[16px] ${syncing ? 'animate-spin' : ''}`}>
                {syncing ? 'progress_activity' : 'upload_2'}
              </span>
              {syncing ? 'Exportando...' : 'Exportar pagos ahora'}
            </button>
          </div>
        )}
      </section>
    </div>
  )
}

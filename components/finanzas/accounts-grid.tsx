import type { Base44Account } from '@/types'

function fmt(n: number, currency = 'MXN') {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency, maximumFractionDigits: 0 }).format(n)
}

const typeIcon: Record<string, string> = {
  Debit: 'account_balance',
  Cash: 'payments',
  Savings: 'savings',
}

export function AccountsGrid({ accounts }: { accounts: Base44Account[] }) {
  const total = accounts.reduce((s, a) => s + a.balance, 0)
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-label-md font-semibold text-on-surface">Cuentas</h2>
        <span className="text-label-md font-bold text-primary">{fmt(total)}</span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {accounts.map(a => (
          <div key={a.id} className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <span className="material-symbols-outlined text-[20px] text-primary">{typeIcon[a.type] ?? 'account_balance_wallet'}</span>
            </div>
            <div className="min-w-0">
              <p className="text-label-md font-medium text-on-surface truncate">{a.name}</p>
              <p className="text-body-md font-bold text-on-surface">{fmt(a.balance, a.currency)}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

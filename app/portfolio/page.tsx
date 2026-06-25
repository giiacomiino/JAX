import { PositionsTable } from '@/components/portfolio/positions-table'

export default function PortfolioPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-headline-lg font-bold text-on-surface">Portfolio</h1>
        <p className="text-on-surface-variant text-label-md mt-1">Inversiones GBM — precios en tiempo real</p>
      </div>
      <PositionsTable />
    </div>
  )
}

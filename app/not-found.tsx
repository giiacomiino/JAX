import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <span className="material-symbols-outlined text-[48px] text-on-surface-variant">search_off</span>
        <p className="text-on-surface-variant text-body-md">Página no encontrada</p>
        <Link href="/dashboard" className="px-4 py-2 rounded-xl bg-primary text-on-primary text-label-md inline-block">
          Ir al inicio
        </Link>
      </div>
    </div>
  )
}

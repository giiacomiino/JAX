import { NextResponse } from 'next/server'
import { getRawEntities, writeToSupabaseCache, invalidateCache } from '@/lib/base44'

// POST /api/finanzas/refresh — manual cache bust, triggers fresh base44 fetch
export async function POST() {
  try {
    await invalidateCache()
    const fresh = await getRawEntities()
    await writeToSupabaseCache(fresh)

    const counts: Record<string, number> = {}
    for (const [k, v] of Object.entries(fresh)) counts[k] = v.length

    return NextResponse.json({
      ok: true,
      counts,
      synced_at: new Date().toISOString(),
    })
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}

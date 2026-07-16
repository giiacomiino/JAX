import { NextResponse } from 'next/server'
import { invalidateCache, getRawEntities, writeToSupabaseCache } from '@/lib/base44'

// Called by Vercel Cron every 5 min — warms the shared Supabase cache
export async function GET() {
  try {
    const start = Date.now()

    // Invalidate first so getRawEntities fetches fresh from base44
    await invalidateCache()
    const fresh = await getRawEntities()
    await writeToSupabaseCache(fresh)

    const counts: Record<string, number> = {}
    for (const [k, v] of Object.entries(fresh)) counts[k] = v.length

    return NextResponse.json({
      ok: true,
      ms: Date.now() - start,
      counts,
      synced_at: new Date().toISOString(),
    })
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}

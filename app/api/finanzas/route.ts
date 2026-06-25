import { NextResponse } from 'next/server'
import { getRawEntities } from '@/lib/base44'

export async function GET() {
  try {
    const data = await getRawEntities()
    return NextResponse.json(data, {
      headers: { 'Cache-Control': 's-maxage=300, stale-while-revalidate=60' },
    })
  } catch {
    return NextResponse.json({ error: 'Error al conectar con base44' }, { status: 502 })
  }
}

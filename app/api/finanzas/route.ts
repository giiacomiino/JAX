import { NextResponse } from 'next/server'
import { getFinanzasData } from '@/lib/base44'

export async function GET() {
  try {
    const data = await getFinanzasData()
    return NextResponse.json(data, {
      headers: { 'Cache-Control': 's-maxage=300, stale-while-revalidate=60' },
    })
  } catch {
    return NextResponse.json({ error: 'Error al conectar con base44' }, { status: 502 })
  }
}

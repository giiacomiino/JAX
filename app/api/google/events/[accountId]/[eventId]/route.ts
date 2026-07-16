import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getValidToken, updateCalendarEvent, deleteCalendarEvent, type GoogleAccount } from '@/lib/google-calendar'

async function getToken(accountId: string): Promise<string | null> {
  const supabase = createAdminClient()
  const { data: account } = await supabase
    .from('google_accounts')
    .select('*')
    .eq('id', accountId)
    .single()
  if (!account) return null
  return getValidToken(account as GoogleAccount)
}

export async function PATCH(
  request: Request,
  { params }: { params: { accountId: string; eventId: string } }
) {
  const token = await getToken(params.accountId)
  if (!token) return NextResponse.json({ error: 'Token inválido' }, { status: 401 })

  const body = await request.json() as {
    calendarId?: string
    title?: string
    date?: string
    time?: string
    description?: string | null
  }

  const ok = await updateCalendarEvent(token, body.calendarId ?? 'primary', params.eventId, {
    summary: body.title,
    description: body.description,
    date: body.date,
    time: body.time,
  })

  if (!ok) return NextResponse.json({ error: 'Error al actualizar en Google Calendar' }, { status: 502 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(
  request: Request,
  { params }: { params: { accountId: string; eventId: string } }
) {
  const token = await getToken(params.accountId)
  if (!token) return NextResponse.json({ error: 'Token inválido' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const calendarId = searchParams.get('calendarId') ?? 'primary'

  const ok = await deleteCalendarEvent(token, calendarId, params.eventId)
  if (!ok) return NextResponse.json({ error: 'Error al eliminar en Google Calendar' }, { status: 502 })
  return new NextResponse(null, { status: 204 })
}

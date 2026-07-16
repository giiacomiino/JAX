import { createAdminClient } from './supabase/admin'
import { getValidToken, createCalendarEvent, updateCalendarEvent, deleteCalendarEvent } from './google-calendar'

interface GCalEventInput {
  title: string
  date: string       // yyyy-MM-dd
  time?: string      // HH:mm (optional — if present, creates timed event)
  description?: string
}

async function getAccountAndToken(googleAccountId: string) {
  const supabase = createAdminClient()
  const { data: account } = await supabase
    .from('google_accounts')
    .select('*')
    .eq('id', googleAccountId)
    .single()
  if (!account) return null
  const token = await getValidToken(account)
  if (!token) return null
  return { account, token }
}

async function getPillarAccount(pillarId: string) {
  const supabase = createAdminClient()
  const { data: pillar } = await supabase
    .from('pillars')
    .select('google_account_id, name')
    .eq('id', pillarId)
    .single()
  if (!pillar?.google_account_id) return null
  return getAccountAndToken(pillar.google_account_id).then(r => r ? { ...r, googleAccountId: pillar.google_account_id as string } : null)
}

export async function scheduleInGCal(
  pillarId: string | null | undefined,
  event: GCalEventInput
): Promise<{ googleEventId: string | null; googleAccountId: string | null }> {
  if (!pillarId) return { googleEventId: null, googleAccountId: null }

  const result = await getPillarAccount(pillarId)
  if (!result) return { googleEventId: null, googleAccountId: null }

  const { eventId: googleEventId } = await createCalendarEvent(result.token, {
    summary: event.title,
    description: event.description,
    date: event.date,
    time: event.time,
    calendarId: 'primary',
  })

  return { googleEventId, googleAccountId: result.googleAccountId }
}

export async function updateInGCal(
  googleAccountId: string,
  googleEventId: string,
  event: { title?: string; date?: string; time?: string; description?: string | null },
  calendarId = 'primary'
): Promise<void> {
  const result = await getAccountAndToken(googleAccountId)
  if (!result) return
  await updateCalendarEvent(result.token, calendarId, googleEventId, {
    summary: event.title,
    description: event.description,
    date: event.date,
    time: event.time,
  })
}

export async function deleteInGCal(
  googleAccountId: string,
  googleEventId: string,
  calendarId = 'primary'
): Promise<void> {
  const result = await getAccountAndToken(googleAccountId)
  if (!result) return
  await deleteCalendarEvent(result.token, calendarId, googleEventId)
}

// Resolve pillar_id from a project_id
export async function pillarIdFromProject(projectId: string | null | undefined): Promise<string | null> {
  if (!projectId) return null
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('projects')
    .select('pillar_id')
    .eq('id', projectId)
    .single()
  return (data as { pillar_id?: string | null } | null)?.pillar_id ?? null
}

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const { name, content } = await request.json()
  if (!name?.trim() || !content?.trim())
    return NextResponse.json({ error: 'Nombre y contenido requeridos' }, { status: 400 })

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('project_files')
    .insert({ project_id: params.id, name: name.trim(), content: content.trim() })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const { fileId } = await request.json()
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('project_files')
    .delete()
    .eq('id', fileId)
    .eq('project_id', params.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

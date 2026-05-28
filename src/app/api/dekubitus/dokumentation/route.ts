import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const limit = parseInt(searchParams.get('limit') ?? '30')
  const planId = searchParams.get('plan_id')

  let query = supabase
    .from('lagerungsdokumentation')
    .select('*')
    .eq('user_id', user.id)
    .order('durchgefuehrt_am', { ascending: false })
    .limit(limit)

  if (planId) query = query.eq('plan_id', planId)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ dokumentationen: data })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { id: _id, user_id: _u, ...fields } = body

  const { data, error } = await supabase
    .from('lagerungsdokumentation')
    .insert({ ...fields, user_id: user.id })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ dokumentation: data })
}

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { atualizarFipeVeiculos } from '@/lib/frota/fipe'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// Robô da FIPE dos veículos da frota (busca o valor atual na API FIPE).
// Disparado por:
//  - Vercel Cron no dia 1 de cada mês — ver vercel.json
//  - Manualmente por um usuário logado (para testar): abrir a URL.
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  const auth = request.headers.get('authorization') || ''
  const ua = (request.headers.get('user-agent') || '').toLowerCase()

  let autorizado = false
  if (secret && auth === `Bearer ${secret}`) autorizado = true
  else if (!secret && ua.includes('vercel-cron')) autorizado = true

  if (!autorizado) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) autorizado = true
  }

  if (!autorizado) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  try {
    const resultado = await atualizarFipeVeiculos()
    return NextResponse.json(resultado)
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}

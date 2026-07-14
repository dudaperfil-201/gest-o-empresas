import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { processarLembretes } from '@/lib/lembretes'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// Lembretes de vencimento do aluguel (5 dias antes).
// Disparado por:
//  - Vercel Cron (diariamente) — ver vercel.json
//  - Manualmente por um usuário logado (para testar): abrir a URL.
// ?teste=1 → envia só o RESUMO para o e-mail da conta (não manda aos inquilinos).
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

  const teste = request.nextUrl.searchParams.get('teste') === '1'
  const destinatarioTeste = teste ? (process.env.EMAIL_USER || undefined) : undefined

  try {
    const resultado = await processarLembretes(destinatarioTeste ? { destinatarioTeste } : undefined)
    return NextResponse.json(resultado)
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}

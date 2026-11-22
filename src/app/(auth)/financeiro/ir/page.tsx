import { createClient } from '@/lib/supabase/server'
import { exigirFinanceiro } from '@/lib/auth'
import Link from 'next/link'
import IRCalculadora from './IRCalculadora'

export const dynamic = 'force-dynamic'

export default async function IRPage({ searchParams }: { searchParams: Promise<{ ano?: string }> }) {
  await exigirFinanceiro()
  const sb = await createClient()
  const sp = await searchParams
  const ano = sp.ano ? parseInt(sp.ano, 10) : 2026

  const [fRes, pRes, dRes, oRes] = await Promise.all([
    sb.from('ir_fontes').select('id, nome, trilha, ordem').order('ordem').order('created_at'),
    sb.from('ir_pessoas').select('id, nome, tipo, ordem').order('ordem').order('created_at'),
    sb.from('ir_distribuicoes').select('fonte_id, pessoa_id, valor').eq('ano', ano),
    sb.from('ir_pessoa_ano').select('pessoa_id, outros_rendimentos').eq('ano', ano),
  ])

  const semTabela =
    (!!fRes.error && /does not exist|schema cache|could not find the table/i.test(fRes.error.message)) ||
    (!!pRes.error && /does not exist|schema cache|could not find the table/i.test(pRes.error.message))

  const fontes = (fRes.data ?? []) as { id: string; nome: string; trilha: string; ordem: number }[]
  const pessoas = (pRes.data ?? []) as { id: string; nome: string; tipo: string; ordem: number }[]
  const distrib = (dRes.data ?? []) as { fonte_id: string; pessoa_id: string; valor: number }[]
  const outros = (oRes.data ?? []) as { pessoa_id: string; outros_rendimentos: number }[]

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
        <Link href="/" className="hover:text-blue-600">Início</Link><span>/</span>
        <Link href="/financeiro" className="hover:text-blue-600">Financeiro</Link><span>/</span>
        <span className="text-gray-900 font-medium">IR {ano}</span>
      </div>

      <IRCalculadora
        ano={ano}
        fontes={fontes}
        pessoas={pessoas}
        distrib={distrib}
        outros={outros}
        semTabela={semTabela}
      />
    </div>
  )
}

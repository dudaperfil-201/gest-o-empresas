'use server'

import { createClient } from '@/lib/supabase/server'
import { getSessao } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

const P = '/financeiro/ir'
type R = { ok: true } | { ok: false; erro: string }

async function pode(): Promise<boolean> {
  const s = await getSessao()
  return !!s?.podeFinanceiro
}
const msgTabela = (m: string) =>
  /does not exist|schema cache|could not find the table/i.test(m)
    ? 'As tabelas do IR ainda não existem — rode a migration 019_ir_distribuicao.sql no SQL Editor do Supabase.'
    : m

export async function addPessoa(nome: string, tipo: string): Promise<R> {
  if (!(await pode())) return { ok: false, erro: 'Sem permissão.' }
  const n = (nome || '').trim()
  if (!n) return { ok: false, erro: 'Informe o nome.' }
  const sb = await createClient()
  const { error } = await sb.from('ir_pessoas').insert({ nome: n, tipo: tipo === 'pj' ? 'pj' : 'pf' })
  if (error) return { ok: false, erro: msgTabela(error.message) }
  revalidatePath(P)
  return { ok: true }
}

export async function atualizarPessoa(id: string, nome: string, tipo: string): Promise<R> {
  if (!(await pode())) return { ok: false, erro: 'Sem permissão.' }
  const n = (nome || '').trim()
  if (!n) return { ok: false, erro: 'Informe o nome.' }
  const sb = await createClient()
  const { error } = await sb.from('ir_pessoas').update({ nome: n, tipo: tipo === 'pj' ? 'pj' : 'pf' }).eq('id', id)
  if (error) return { ok: false, erro: error.message }
  revalidatePath(P)
  return { ok: true }
}

export async function removerPessoa(id: string): Promise<R> {
  if (!(await pode())) return { ok: false, erro: 'Sem permissão.' }
  const sb = await createClient()
  const { error } = await sb.from('ir_pessoas').delete().eq('id', id)
  if (error) return { ok: false, erro: error.message }
  revalidatePath(P)
  return { ok: true }
}

export async function setDistribuicao(ano: number, empresaId: string, pessoaId: string, valorMensal: number): Promise<R> {
  if (!(await pode())) return { ok: false, erro: 'Sem permissão.' }
  const sb = await createClient()
  const { error } = await sb.from('ir_distribuicoes').upsert(
    { ano, empresa_id: empresaId, pessoa_id: pessoaId, valor_mensal: valorMensal > 0 ? valorMensal : 0 },
    { onConflict: 'ano,empresa_id,pessoa_id' },
  )
  if (error) return { ok: false, erro: msgTabela(error.message) }
  revalidatePath(P)
  return { ok: true }
}

export async function setOutrosRendimentos(ano: number, pessoaId: string, valor: number): Promise<R> {
  if (!(await pode())) return { ok: false, erro: 'Sem permissão.' }
  const sb = await createClient()
  const { error } = await sb.from('ir_pessoa_ano').upsert(
    { ano, pessoa_id: pessoaId, outros_rendimentos: valor > 0 ? valor : 0 },
    { onConflict: 'ano,pessoa_id' },
  )
  if (error) return { ok: false, erro: msgTabela(error.message) }
  revalidatePath(P)
  return { ok: true }
}

'use server'

import { createClient } from '@/lib/supabase/server'
import { getSessao } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

const P = '/financeiro/ir'
type R = { ok: true } | { ok: false; erro: string }
const TRILHAS = ['holding', 'direta', 'offshore', 'fundo', 'intermediaria']

async function pode(): Promise<boolean> {
  const s = await getSessao()
  return !!s?.podeFinanceiro
}
const msgTabela = (m: string) =>
  /does not exist|schema cache|could not find the table/i.test(m)
    ? 'As tabelas do IR ainda não existem — rode a migration 020_ir_trilhas.sql (e a 019) no SQL Editor do Supabase.'
    : m

// ── Pessoas ──
export async function addPessoa(nome: string, tipo: string, ativo = true, grupo: string | null = null): Promise<R> {
  if (!(await pode())) return { ok: false, erro: 'Sem permissão.' }
  const n = (nome || '').trim()
  if (!n) return { ok: false, erro: 'Informe o nome.' }
  const sb = await createClient()
  const g = (grupo || '').trim() || null
  const { error } = await sb.from('ir_pessoas').insert({ nome: n, tipo: tipo === 'pj' ? 'pj' : 'pf', ativo, grupo: g })
  if (error) return { ok: false, erro: msgTabela(error.message) }
  revalidatePath(P)
  return { ok: true }
}

// Pausar/ativar uma pessoa. Inativa aparece no card mas sai dos cálculos e tabelas.
export async function setPessoaAtiva(id: string, ativo: boolean): Promise<R> {
  if (!(await pode())) return { ok: false, erro: 'Sem permissão.' }
  const sb = await createClient()
  const { error } = await sb.from('ir_pessoas').update({ ativo }).eq('id', id)
  if (error) return { ok: false, erro: msgTabela(error.message) }
  revalidatePath(P)
  return { ok: true }
}

// Trocar o grupo da pessoa (família se PF, holding se PJ). null = sem grupo.
export async function setPessoaGrupo(id: string, grupo: string | null): Promise<R> {
  if (!(await pode())) return { ok: false, erro: 'Sem permissão.' }
  const sb = await createClient()
  const g = (grupo || '').trim() || null
  const { error } = await sb.from('ir_pessoas').update({ grupo: g }).eq('id', id)
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

// ── Fontes (empresas/veículos classificados por trilha) ──
export async function addFonte(nome: string, trilha: string): Promise<R> {
  if (!(await pode())) return { ok: false, erro: 'Sem permissão.' }
  const n = (nome || '').trim()
  if (!n) return { ok: false, erro: 'Informe o nome da fonte.' }
  const t = TRILHAS.includes(trilha) ? trilha : 'direta'
  const sb = await createClient()
  const { error } = await sb.from('ir_fontes').insert({ nome: n, trilha: t, ordem: 999 })
  if (error) return { ok: false, erro: msgTabela(error.message) }
  revalidatePath(P)
  return { ok: true }
}

export async function atualizarFonte(id: string, nome: string, trilha: string): Promise<R> {
  if (!(await pode())) return { ok: false, erro: 'Sem permissão.' }
  const n = (nome || '').trim()
  if (!n) return { ok: false, erro: 'Informe o nome da fonte.' }
  const t = TRILHAS.includes(trilha) ? trilha : 'direta'
  const sb = await createClient()
  const { error } = await sb.from('ir_fontes').update({ nome: n, trilha: t }).eq('id', id)
  if (error) return { ok: false, erro: error.message }
  revalidatePath(P)
  return { ok: true }
}

export async function removerFonte(id: string): Promise<R> {
  if (!(await pode())) return { ok: false, erro: 'Sem permissão.' }
  const sb = await createClient()
  const { error } = await sb.from('ir_fontes').delete().eq('id', id)
  if (error) return { ok: false, erro: error.message }
  revalidatePath(P)
  return { ok: true }
}

// ── Lançamentos ──
export async function setDistribuicao(ano: number, fonteId: string, pessoaId: string, valor: number): Promise<R> {
  if (!(await pode())) return { ok: false, erro: 'Sem permissão.' }
  const sb = await createClient()
  const { error } = await sb.from('ir_distribuicoes').upsert(
    { ano, fonte_id: fonteId, pessoa_id: pessoaId, valor: valor > 0 ? valor : 0 },
    { onConflict: 'ano,fonte_id,pessoa_id' },
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

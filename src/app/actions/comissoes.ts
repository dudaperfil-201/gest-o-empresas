'use server'

import { createClient } from '@/lib/supabase/server'
import { getSessao } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

// Comissões do funcionário responsável pela gestão dos imóveis. Comissão = 60% do 1º
// aluguel. Pagamentos abatem do saldo. Só quem vê o Financeiro pode mexer.

export type Comissao = { id: string; descricao: string | null; valor_aluguel: number; percentual: number; valor_comissao: number; created_at: string }
export type PagamentoComissao = { id: string; descricao: string | null; valor: number; data_pagamento: string | null; created_at: string }
type Resultado = { ok: true } | { ok: false; erro: string }

const PERCENTUAL = 60 // % da comissão sobre o 1º aluguel

// Comissão liberada para TODOS os usuários logados (até segunda ordem).
async function usuarioLogado(): Promise<boolean> {
  const s = await getSessao()
  return !!s
}

// Carrega comissões e pagamentos. Tolerante: se as tabelas ainda não existirem
// (migração não rodada), retorna listas vazias sem quebrar a tela.
export async function getComissoes(): Promise<{ comissoes: Comissao[]; pagamentos: PagamentoComissao[] }> {
  try {
    const supabase = await createClient()
    const [{ data: comissoes }, { data: pagamentos }] = await Promise.all([
      supabase.from('comissoes').select('*').order('created_at', { ascending: false }),
      supabase.from('comissoes_pagamentos').select('*').order('created_at', { ascending: false }),
    ])
    return { comissoes: (comissoes as Comissao[]) ?? [], pagamentos: (pagamentos as PagamentoComissao[]) ?? [] }
  } catch {
    return { comissoes: [], pagamentos: [] }
  }
}

export async function adicionarComissao(descricao: string, valorAluguel: number): Promise<Resultado> {
  if (!(await usuarioLogado())) return { ok: false, erro: 'Sem permissão.' }
  const aluguel = Number(valorAluguel) || 0
  if (aluguel <= 0) return { ok: false, erro: 'Informe o valor do aluguel.' }
  const supabase = await createClient()
  const { error } = await supabase.from('comissoes').insert({
    descricao: (descricao ?? '').trim() || null,
    valor_aluguel: aluguel,
    percentual: PERCENTUAL,
    valor_comissao: Math.round(aluguel * (PERCENTUAL / 100) * 100) / 100,
  })
  if (error) return { ok: false, erro: error.message }
  revalidatePath('/comissao')
  return { ok: true }
}

export async function excluirComissao(id: string): Promise<Resultado> {
  if (!(await usuarioLogado())) return { ok: false, erro: 'Sem permissão.' }
  const supabase = await createClient()
  const { error } = await supabase.from('comissoes').delete().eq('id', id)
  if (error) return { ok: false, erro: error.message }
  revalidatePath('/comissao')
  return { ok: true }
}

export async function adicionarPagamento(descricao: string, valor: number, dataPagamento: string | null): Promise<Resultado> {
  if (!(await usuarioLogado())) return { ok: false, erro: 'Sem permissão.' }
  const v = Number(valor) || 0
  if (v <= 0) return { ok: false, erro: 'Informe o valor pago.' }
  const supabase = await createClient()
  const { error } = await supabase.from('comissoes_pagamentos').insert({
    descricao: (descricao ?? '').trim() || null,
    valor: v,
    data_pagamento: dataPagamento || null,
  })
  if (error) return { ok: false, erro: error.message }
  revalidatePath('/comissao')
  return { ok: true }
}

export async function excluirPagamento(id: string): Promise<Resultado> {
  if (!(await usuarioLogado())) return { ok: false, erro: 'Sem permissão.' }
  const supabase = await createClient()
  const { error } = await supabase.from('comissoes_pagamentos').delete().eq('id', id)
  if (error) return { ok: false, erro: error.message }
  revalidatePath('/comissao')
  return { ok: true }
}

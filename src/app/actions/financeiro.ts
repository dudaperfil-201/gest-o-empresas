'use server'

import { createClient } from '@/lib/supabase/server'
import { exigirFinanceiro } from '@/lib/auth'

export type ItemMes = {
  carteira_slug: string
  banco: string
  investimento: string
  valor: number
  valor_moeda: number | null
}

// Salva (upsert) os valores de um mês inteiro. Só grava os itens preenchidos — item em
// branco não sobrescreve (fica "sem extrato" / mantém o que já havia).
export async function salvarMesFinanceiro(
  ano: number,
  mes: number,
  itens: ItemMes[],
): Promise<{ ok: true; gravados: number } | { ok: false; erro: string }> {
  await exigirFinanceiro()
  if (!ano || !mes || mes < 1 || mes > 12) return { ok: false, erro: 'Mês/ano inválido.' }

  const rows = itens
    .filter(it => Number.isFinite(it.valor))
    .map(it => ({
      carteira_slug: it.carteira_slug,
      banco: it.banco,
      investimento: it.investimento,
      ano,
      mes,
      valor: it.valor,
      valor_moeda: it.valor_moeda,
      atualizado_em: new Date().toISOString(),
    }))

  if (rows.length === 0) return { ok: false, erro: 'Nenhum valor preenchido.' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('financeiro_valores')
    .upsert(rows, { onConflict: 'carteira_slug,banco,investimento,ano,mes' })
  if (error) return { ok: false, erro: error.message }
  return { ok: true, gravados: rows.length }
}

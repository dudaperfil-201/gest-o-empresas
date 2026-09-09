'use server'

import { createClient } from '@/lib/supabase/server'
import { exigirFinanceiro } from '@/lib/auth'
import { parseSaldoDiario, type ResultadoImport } from '@/lib/financeiro/importarSaldoDiario'
import { parseExtratoXP, type ExtratoPdf } from '@/lib/financeiro/importarExtratoPdf'

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

// Lê a planilha "Saldo Diário" (.xls) enviada e devolve os saldos bancários do último mês
// FECHADO, mapeados na estrutura do Financeiro — para o usuário conferir e salvar. Não grava
// nada: só interpreta o arquivo (o salvar continua sendo o salvarMesFinanceiro).
export async function importarSaldoDiarioAction(
  formData: FormData,
): Promise<{ ok: true; resultado: ResultadoImport } | { ok: false; erro: string }> {
  await exigirFinanceiro()
  const arquivo = formData.get('arquivo')
  if (!(arquivo instanceof File) || arquivo.size === 0) return { ok: false, erro: 'Nenhum arquivo enviado.' }
  const nome = arquivo.name.toLowerCase()
  if (!nome.endsWith('.xls') && !nome.endsWith('.xlsx')) {
    return { ok: false, erro: 'Envie a planilha em .xls ou .xlsx.' }
  }
  try {
    const buf = Buffer.from(await arquivo.arrayBuffer())
    const resultado = parseSaldoDiario(buf)
    if (resultado.itens.length === 0) {
      return { ok: false, erro: `Li a aba "${resultado.aba}", mas não encontrei saldos reconhecíveis. Confira se é a planilha certa.` }
    }
    return { ok: true, resultado }
  } catch (e) {
    return { ok: false, erro: e instanceof Error ? e.message : 'Falha ao ler a planilha.' }
  }
}

// Lê um extrato XP (PDF) e devolve os saldos do fecho do mês. Não grava e não decide a
// carteira — o vínculo com a conta é feito na tela (o usuário escolhe a carteira).
export async function importarExtratoPdfAction(
  formData: FormData,
): Promise<{ ok: true; resultado: ExtratoPdf } | { ok: false; erro: string }> {
  await exigirFinanceiro()
  const arquivo = formData.get('arquivo')
  if (!(arquivo instanceof File) || arquivo.size === 0) return { ok: false, erro: 'Nenhum arquivo enviado.' }
  if (!arquivo.name.toLowerCase().endsWith('.pdf')) return { ok: false, erro: 'Envie o extrato em PDF.' }
  try {
    const buf = Buffer.from(await arquivo.arrayBuffer())
    const resultado = await parseExtratoXP(buf)
    if (resultado.saldoLiquido == null || !resultado.mes) {
      return { ok: false, erro: 'Não consegui ler os saldos deste PDF. Confira se é o extrato XP "Posição a mercado mensal".' }
    }
    return { ok: true, resultado }
  } catch (e) {
    return { ok: false, erro: e instanceof Error ? e.message : 'Falha ao ler o PDF.' }
  }
}

// Salva (upsert) o Break Even de um mês: os rendimentos digitados (Serginho/Eduardo) e o
// rendimento automático da RNX congelado. Um registro por (ano, mes).
export async function salvarBreakEven(
  ano: number, mes: number, serginho: number, eduardo: number, rnx: number,
): Promise<{ ok: true } | { ok: false; erro: string }> {
  await exigirFinanceiro()
  if (!ano || !mes) return { ok: false, erro: 'Mês/ano inválido.' }
  const supabase = await createClient()
  const { error } = await supabase.from('break_even').upsert(
    { ano, mes, serginho, eduardo, rnx, atualizado_em: new Date().toISOString() },
    { onConflict: 'ano,mes' },
  )
  if (error) return { ok: false, erro: error.message }
  return { ok: true }
}

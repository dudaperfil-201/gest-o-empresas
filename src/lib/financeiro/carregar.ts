// Carregador do Financeiro: monta as CARTEIRAS (estrutura fixa do código) preenchendo
// os VALORES de cada mês a partir da tabela financeiro_valores. A lista de MESES é
// derivada dos períodos presentes no banco (adicionar julho no banco = julho aparece).
// REDE DE SEGURANÇA: se o banco falhar/estiver vazio, cai no código (dados.ts).

import { createClient } from '@/lib/supabase/server'
import { CARTEIRAS, MESES_2026, type Carteira } from './dados'

export type Mes = { abrev: string; nome: string; ano: number; mes: number }

const NOMES_MES: [string, string][] = [
  ['JAN', 'JANEIRO'], ['FEV', 'FEVEREIRO'], ['MAR', 'MARÇO'], ['ABR', 'ABRIL'],
  ['MAI', 'MAIO'], ['JUN', 'JUNHO'], ['JUL', 'JULHO'], ['AGO', 'AGOSTO'],
  ['SET', 'SETEMBRO'], ['OUT', 'OUTUBRO'], ['NOV', 'NOVEMBRO'], ['DEZ', 'DEZEMBRO'],
]

type Row = { carteira_slug: string; banco: string; investimento: string; ano: number; mes: number; valor: number; valor_moeda: number | null }

// Rendimento da RNX = quanto a carteira cresceu do penúltimo para o último mês com dado
// (soma dos investimentos por mês, diferença dos 2 últimos). Usado no quadro Break Even.
export async function getRnxRendimento(): Promise<number> {
  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from('financeiro_valores')
      .select('ano,mes,valor')
      .eq('carteira_slug', 'rnx')
    if (!data || data.length === 0) return 0
    const porMes = new Map<number, number>()
    for (const r of data) {
      const k = r.ano * 100 + r.mes
      porMes.set(k, (porMes.get(k) ?? 0) + Number(r.valor))
    }
    const chaves = [...porMes.keys()].sort((a, b) => a - b)
    if (chaves.length < 2) return 0
    return (porMes.get(chaves[chaves.length - 1]) ?? 0) - (porMes.get(chaves[chaves.length - 2]) ?? 0)
  } catch {
    return 0
  }
}

// O mês seguinte ao último da lista — usado para navegar "pra frente" mesmo antes de
// haver dados (o mês novo aparece zerado/aguardando extrato).
export function proximoMes(meses: Mes[]): Mes {
  const u = meses[meses.length - 1]
  const ano = u ? (u.mes === 12 ? u.ano + 1 : u.ano) : new Date().getFullYear()
  const mes = u ? (u.mes === 12 ? 1 : u.mes + 1) : new Date().getMonth() + 1
  return { abrev: NOMES_MES[mes - 1][0], nome: NOMES_MES[mes - 1][1], ano, mes }
}

export async function carregarFinanceiro(): Promise<{ carteiras: Carteira[]; meses: Mes[] }> {
  let rows: Row[] | null = null
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('financeiro_valores')
      .select('carteira_slug,banco,investimento,ano,mes,valor,valor_moeda')
    if (!error && data && data.length > 0) rows = data as Row[]
  } catch {
    rows = null
  }

  // Fallback: sem banco, usa o código.
  if (!rows) {
    return { carteiras: CARTEIRAS, meses: MESES_2026.map((m, i) => ({ ...m, ano: 2026, mes: i + 1 })) }
  }

  // Meses = períodos distintos (ano,mes) presentes, em ordem cronológica.
  const chave = (r: { ano: number; mes: number }) => r.ano * 100 + r.mes
  const meses: Mes[] = [...new Map(rows.map(r => [chave(r), { ano: r.ano, mes: r.mes }])).values()]
    .sort((a, b) => chave(a) - chave(b))
    .map(({ ano, mes }) => ({ abrev: NOMES_MES[mes - 1][0], nome: NOMES_MES[mes - 1][1], ano, mes }))

  const mapa = new Map<string, Row>()
  for (const r of rows) mapa.set(`${r.carteira_slug}|${r.banco}|${r.investimento}|${r.ano}|${r.mes}`, r)
  const val = (slug: string, banco: string, inv: string, ano: number, mes: number) =>
    mapa.get(`${slug}|${banco}|${inv}|${ano}|${mes}`)

  // Monta as carteiras do esqueleto do código, preenchendo valores por índice de mês.
  // valores[i] === undefined = "sem extrato" naquele mês (mesma semântica de antes).
  const carteiras: Carteira[] = CARTEIRAS.map(cart => ({
    ...cart,
    contas: cart.contas.map(conta => ({
      ...conta,
      investimentos: conta.investimentos.map(inv => {
        const valores = meses.map(m => {
          const r = val(cart.slug, conta.banco, inv.nome, m.ano, m.mes)
          return r ? Number(r.valor) : undefined
        }) as unknown as number[]
        if (!inv.moeda) return { ...inv, valores }
        const valoresMoeda = meses.map(m => {
          const r = val(cart.slug, conta.banco, inv.nome, m.ano, m.mes)
          return r && r.valor_moeda != null ? Number(r.valor_moeda) : undefined
        }) as unknown as number[]
        return { ...inv, valores, valoresMoeda }
      }),
    })),
  }))

  return { carteiras, meses }
}

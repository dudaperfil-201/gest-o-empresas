// Carregador do Financeiro: monta as CARTEIRAS (estrutura fixa do código) preenchendo
// os VALORES de cada mês a partir da tabela financeiro_valores. A lista de MESES é
// derivada dos períodos presentes no banco (adicionar julho no banco = julho aparece).
// REDE DE SEGURANÇA: se o banco falhar/estiver vazio, cai no código (dados.ts).

import { createClient } from '@/lib/supabase/server'
import { CARTEIRAS, MESES_2026, saldoCarteira, cambioUsdCarteira, type Carteira } from './dados'

export type Mes = { abrev: string; nome: string; ano: number; mes: number }

const NOMES_MES: [string, string][] = [
  ['JAN', 'JANEIRO'], ['FEV', 'FEVEREIRO'], ['MAR', 'MARÇO'], ['ABR', 'ABRIL'],
  ['MAI', 'MAIO'], ['JUN', 'JUNHO'], ['JUL', 'JULHO'], ['AGO', 'AGOSTO'],
  ['SET', 'SETEMBRO'], ['OUT', 'OUTUBRO'], ['NOV', 'NOVEMBRO'], ['DEZ', 'DEZEMBRO'],
]

type Row = { carteira_slug: string; banco: string; investimento: string; ano: number; mes: number; valor: number; valor_moeda: number | null; variacao_pct?: number | null }

// Dados do Break Even do MÊS CORRENTE (o último mês com dados no Financeiro):
//  - mês/ano;  - rnxRendimento (auto: diferença dos 2 últimos meses da RNX);
//  - serginho/eduardo já salvos daquele mês (ou 0/vazio se for mês novo).
// Cada mês tem seu registro na tabela break_even → o mês novo começa em branco e os
// anteriores ficam guardados.
export type BreakEvenMes = { ano: number; mes: number; rnxRendimento: number; serginho: number; eduardo: number }

export async function getBreakEven(): Promise<BreakEvenMes | null> {
  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from('financeiro_valores')
      .select('ano,mes,valor')
      .eq('carteira_slug', 'rnx')
    if (!data || data.length === 0) return null
    const porMes = new Map<number, { ano: number; mes: number; total: number }>()
    for (const r of data) {
      const k = r.ano * 100 + r.mes
      const e = porMes.get(k) ?? { ano: r.ano, mes: r.mes, total: 0 }
      e.total += Number(r.valor)
      porMes.set(k, e)
    }
    const chaves = [...porMes.keys()].sort((a, b) => a - b)
    const ult = porMes.get(chaves[chaves.length - 1])!
    const rnxRendimento = chaves.length >= 2 ? ult.total - porMes.get(chaves[chaves.length - 2])!.total : 0

    // Valores salvos do Break Even daquele mês (try próprio: se a tabela ainda não existir,
    // o quadro segue funcionando com Serginho/Eduardo em branco).
    let serginho = 0, eduardo = 0
    try {
      const { data: be } = await supabase
        .from('break_even')
        .select('serginho,eduardo')
        .eq('ano', ult.ano).eq('mes', ult.mes)
        .maybeSingle()
      if (be) { serginho = Number(be.serginho) || 0; eduardo = Number(be.eduardo) || 0 }
    } catch { /* tabela ainda não criada */ }

    return { ano: ult.ano, mes: ult.mes, rnxRendimento, serginho, eduardo }
  } catch {
    return null
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

// Evolução do PATRIMÔNIO TOTAL: para cada mês, soma o saldo de todas as carteiras
// (só as contas que já têm extrato daquele mês). É o que alimenta o gráfico.
export type PontoEvolucao = { abrev: string; nome: string; ano: number; mes: number; total: number }

export async function getEvolucaoPatrimonio(): Promise<PontoEvolucao[]> {
  const { carteiras, meses } = await carregarFinanceiro()
  return meses.map((m, i) => ({
    abrev: m.abrev,
    nome: m.nome,
    ano: m.ano,
    mes: m.mes,
    total: carteiras.reduce((s, c) => s + saldoCarteira(c, i), 0),
  }))
}

export async function carregarFinanceiro(): Promise<{ carteiras: Carteira[]; meses: Mes[] }> {
  let rows: Row[] | null = null
  try {
    const supabase = await createClient()
    const COLS = 'carteira_slug,banco,investimento,ano,mes,valor,valor_moeda'
    // Tenta com variacao_pct; se a coluna ainda não existir (migração não rodada),
    // busca sem ela para não quebrar o financeiro.
    let { data, error } = await supabase.from('financeiro_valores').select(`${COLS},variacao_pct`)
    if (error) ({ data, error } = await supabase.from('financeiro_valores').select(COLS))
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
        // Variação % do ativo no mês (pode faltar em meses antigos → undefined).
        const variacoes = meses.map(m => {
          const r = val(cart.slug, conta.banco, inv.nome, m.ano, m.mes)
          return r && r.variacao_pct != null ? Number(r.variacao_pct) : undefined
        }) as unknown as number[]
        if (!inv.moeda) return { ...inv, valores, variacoes }
        const valoresMoeda = meses.map(m => {
          const r = val(cart.slug, conta.banco, inv.nome, m.ano, m.mes)
          return r && r.valor_moeda != null ? Number(r.valor_moeda) : undefined
        }) as unknown as number[]
        return { ...inv, valores, valoresMoeda, variacoes }
      }),
    })),
  }))

  // Linhas que existem SÓ no banco (ex.: ativos novos criados por importação de extrato):
  // anexa à carteira correspondente para que apareçam e sejam editáveis.
  const skelKeys = new Set<string>()
  for (const c of CARTEIRAS) for (const ct of c.contas) for (const inv of ct.investimentos) skelKeys.add(`${c.slug}|${ct.banco}|${inv.nome}`)
  const porSlug = new Map(carteiras.map(c => [c.slug, c]))
  const extrasVistos = new Set<string>()
  for (const r of rows) {
    const k = `${r.carteira_slug}|${r.banco}|${r.investimento}`
    if (skelKeys.has(k) || extrasVistos.has(k)) continue
    extrasVistos.add(k)
    const cart = porSlug.get(r.carteira_slug)
    if (!cart) continue // sem carteira no código → ignora (linha órfã)
    let conta = cart.contas.find(ct => ct.banco === r.banco)
    if (!conta) { conta = { banco: r.banco, investimentos: [] }; cart.contas.push(conta) }
    const temMoeda = r.valor_moeda != null
    const valores = meses.map(m => { const rr = val(r.carteira_slug, r.banco, r.investimento, m.ano, m.mes); return rr ? Number(rr.valor) : undefined }) as unknown as number[]
    const inv: Carteira['contas'][number]['investimentos'][number] = { nome: r.investimento, valores }
    if (temMoeda) {
      inv.moeda = 'US$'
      inv.valoresMoeda = meses.map(m => { const rr = val(r.carteira_slug, r.banco, r.investimento, m.ano, m.mes); return rr && rr.valor_moeda != null ? Number(rr.valor_moeda) : undefined }) as unknown as number[]
    }
    conta.investimentos.push(inv)
  }

  // Carteiras CONSTANTES (ex.: imóvel): carrega sozinho os meses sem lançamento, repetindo
  // o valor em moeda do mês anterior e recalculando o R$ pelo câmbio do mês (derivado da
  // La Jolla; se indisponível, mantém a razão R$/moeda anterior). Valor vindo do banco vence.
  const laJolla = carteiras.find(c => c.slug === 'la-jolla')
  const cent = (n: number) => Math.round(n * 100) / 100
  for (const cart of carteiras) {
    if (!cart.constante) continue
    for (const conta of cart.contas) {
      for (const inv of conta.investimentos) {
        let ultMoeda: number | undefined
        let ultRs: number | undefined
        for (let i = 0; i < meses.length; i++) {
          const rs = inv.valores[i]
          const moeda = inv.valoresMoeda?.[i]
          if (rs != null || moeda != null) { // mês com lançamento real → referência
            if (rs != null) ultRs = rs
            if (moeda != null) ultMoeda = moeda
            continue
          }
          if (ultRs == null && ultMoeda == null) continue // ainda não há de onde repetir
          const taxa = (laJolla ? cambioUsdCarteira(laJolla, i) : null)
            ?? (ultMoeda && ultRs ? ultRs / ultMoeda : null)
          const novoRs = ultMoeda != null && taxa != null ? cent(ultMoeda * taxa) : ultRs
          inv.valores[i] = novoRs as number
          if (inv.valoresMoeda) inv.valoresMoeda[i] = (ultMoeda ?? inv.valoresMoeda[i]) as number
          if (novoRs != null) ultRs = novoRs
        }
      }
    }
  }

  return { carteiras, meses }
}

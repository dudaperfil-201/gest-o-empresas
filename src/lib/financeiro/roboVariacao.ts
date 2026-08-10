import { createAdminClient } from '@/lib/supabase/admin'

// Robô do dia 1: atualiza a variação % mensal das AÇÕES e ETFs da La Jolla, buscando
// o preço no Yahoo Finance. Os demais ativos (Renda Fixa, Notas, PE, Hedge Funds) não
// têm fonte pública e vêm do relatório mensal do Itaú.

const CARTEIRA = 'la-jolla'
const CONTA = 'Ações e ETFs'

// Nome do ativo (igual ao banco/dados.ts) → símbolo no Yahoo Finance.
const TICKERS: Record<string, string> = {
  'WisdomTree Floating Rate (USFR)': 'USFR',
  'Vanguard Short-Term Bond (BSV)': 'BSV',
  'iShares US Treasury 1-3Y (IBTC)': 'IBTC.SW',
  'iShares MSCI EMU CHF (EMUC)': 'EMUC.SW',
  'iShares Russell 2000 (IWM)': 'IWM',
  'iShares MSCI ACWI (ACWI)': 'ACWI',
  'Visa (V)': 'V',
  'Walt Disney (DIS)': 'DIS',
  'Microsoft (MSFT)': 'MSFT',
  'JPMorgan Chase (JPM)': 'JPM',
  'Danaher (DHR)': 'DHR',
  'Berkshire Hathaway (BRK.B)': 'BRK-B',
  'Apple (AAPL)': 'AAPL',
  'Alphabet (GOOGL)': 'GOOGL',
  'Taiwan Semiconductor (TSM)': 'TSM',
}

export type ResultadoRobo = { ok: boolean; mes: string; atualizados: number; falhas: string[]; mensagem: string }

// Variação % do papel no mês (ano,mes) = fechamento do mês ÷ fechamento do mês anterior − 1.
async function variacaoMensal(symbol: string, ano: number, mes: number): Promise<number | null> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1mo&range=2y`
  const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, cache: 'no-store' })
  if (!r.ok) return null
  const j = await r.json()
  const res = j?.chart?.result?.[0]
  const ts: number[] = res?.timestamp ?? []
  const closes: (number | null)[] = res?.indicators?.quote?.[0]?.close ?? []
  if (ts.length === 0 || closes.length === 0) return null
  // Cada candle mensal → fechamento, indexado por "ano-mês".
  const porMes = new Map<string, number>()
  for (let i = 0; i < ts.length; i++) {
    const d = new Date(ts[i] * 1000)
    const c = closes[i]
    if (c != null) porMes.set(`${d.getUTCFullYear()}-${d.getUTCMonth() + 1}`, c)
  }
  const atual = porMes.get(`${ano}-${mes}`)
  const antAno = mes === 1 ? ano - 1 : ano
  const antMes = mes === 1 ? 12 : mes - 1
  const anterior = porMes.get(`${antAno}-${antMes}`)
  if (atual == null || anterior == null || anterior === 0) return null
  return (atual / anterior - 1) * 100
}

export async function atualizarVariacaoAcoesETFs(): Promise<ResultadoRobo> {
  const supabase = createAdminClient()
  // Mês-alvo = o mês mais recente da La Jolla que tem ativos de "Ações e ETFs".
  const { data: linhas, error } = await supabase
    .from('financeiro_valores')
    .select('ano,mes,investimento')
    .eq('carteira_slug', CARTEIRA).eq('banco', CONTA)
    .order('ano', { ascending: false }).order('mes', { ascending: false })
  if (error) return { ok: false, mes: '', atualizados: 0, falhas: [], mensagem: 'Erro ao ler ativos: ' + error.message }
  if (!linhas || linhas.length === 0) return { ok: true, mes: '', atualizados: 0, falhas: [], mensagem: 'Sem ativos de Ações e ETFs para atualizar.' }

  const ano = linhas[0].ano, mes = linhas[0].mes
  const doMes = linhas.filter(l => l.ano === ano && l.mes === mes)

  let atualizados = 0
  const falhas: string[] = []
  for (const l of doMes) {
    const symbol = TICKERS[l.investimento]
    if (!symbol) { falhas.push(`${l.investimento} (sem ticker)`); continue }
    let pct: number | null = null
    try { pct = await variacaoMensal(symbol, ano, mes) } catch { pct = null }
    if (pct == null) { falhas.push(`${l.investimento} (sem cotação)`); continue }
    const { error: e } = await supabase.from('financeiro_valores')
      .update({ variacao_pct: Math.round(pct * 100) / 100, atualizado_em: new Date().toISOString() })
      .eq('carteira_slug', CARTEIRA).eq('banco', CONTA).eq('investimento', l.investimento).eq('ano', ano).eq('mes', mes)
    if (e) { falhas.push(`${l.investimento} (erro ao salvar)`); continue }
    atualizados++
  }

  const rotulo = `${String(mes).padStart(2, '0')}/${ano}`
  return {
    ok: true, mes: rotulo, atualizados, falhas,
    mensagem: `Variação de Ações e ETFs atualizada para ${atualizados} ativo(s) em ${rotulo}.` +
      (falhas.length ? ` ${falhas.length} sem atualizar.` : ''),
  }
}

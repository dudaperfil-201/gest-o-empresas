// Parser do statement do Itaú Private Bank (Miami) — carteira LA JOLLA. Em US$, com um
// bloco por ativo. Estratégia robusta: o Market Value (USD) de cada ativo é o VALOR que
// aparece 2 linhas antes da "data de preço" do bloco (padrão valor → preço unit → data).
// Casamos cada ativo por ISIN (ou nº de conta / nome) com as linhas da La Jolla no app.
// Validação: a soma de tudo tem de bater com o "My Portfolio Position" do statement.

export type ItemLaJolla = {
  banco: string
  investimento: string
  valorMoeda: number // US$
  valor: number // R$ (US$ × câmbio do statement)
  novo: boolean // true = ativo que ainda não existia na estrutura do app
}

export type ResultadoLaJolla = {
  ano: number
  mes: number
  dataPosicao: string | null
  cambioBRL: number | null
  totalUSD: number | null
  somaExtraidaUSD: number
  reconciliado: boolean // soma dos ativos == total do statement (à prova de erro de leitura)
  itens: ItemLaJolla[]
}

// ISIN → (banco/classe no app, nome da linha no app). Nomes têm de casar com dados.ts.
const MAPA_ISIN: Record<string, [string, string]> = {
  // Renda Fixa
  USG98239AB55: ['Renda Fixa', 'XP Incorporation 6,75% 02/07/29'],
  US91911TAH68: ['Renda Fixa', 'Vale Overseas 6,875% 21/11/36'],
  US68389XCE31: ['Renda Fixa', 'Oracle 2,875% 25/03/31'],
  US61747YES00: ['Renda Fixa', 'Morgan Stanley 5,297% 20/04/37'],
  US46556W2E95: ['Renda Fixa', 'Itaú Unibanco 6,0% 27/02/30'],
  US172967PA33: ['Renda Fixa', 'Citigroup 6,27% 17/11/33'],
  US05947LBB36: ['Renda Fixa', 'Banco Bradesco 6,5% 22/01/30'],
  US88579YBP51: ['Renda Fixa', '3M Co 3,7% 15/04/50'],
  US91282CPZ85: ['Renda Fixa', 'T-Note EUA 4,125% 15/02/36'],
  // Ações e ETFs
  US97717Y5270: ['Ações e ETFs', 'WisdomTree Floating Rate (USFR)'],
  US9219378273: ['Ações e ETFs', 'Vanguard Short-Term Bond (BSV)'],
  IE00BK7XZ629: ['Ações e ETFs', 'iShares US Treasury 1-3Y (IBTC)'],
  IE00BWK1SP74: ['Ações e ETFs', 'iShares MSCI EMU CHF (EMUC)'],
  US4642876555: ['Ações e ETFs', 'iShares Russell 2000 (IWM)'],
  US4642882579: ['Ações e ETFs', 'iShares MSCI ACWI (ACWI)'],
  US92826C8394: ['Ações e ETFs', 'Visa (V)'],
  US2546871060: ['Ações e ETFs', 'Walt Disney (DIS)'],
  US5949181045: ['Ações e ETFs', 'Microsoft (MSFT)'],
  US46625H1005: ['Ações e ETFs', 'JPMorgan Chase (JPM)'],
  US2358511028: ['Ações e ETFs', 'Danaher (DHR)'],
  US0846707026: ['Ações e ETFs', 'Berkshire Hathaway (BRK.B)'],
  US0378331005: ['Ações e ETFs', 'Apple (AAPL)'],
  US02079K3059: ['Ações e ETFs', 'Alphabet (GOOGL)'],
  US8740391003: ['Ações e ETFs', 'Taiwan Semiconductor (TSM)'],
  // Notas Estruturadas
  CH1171040830: ['Notas Estruturadas', 'Itaú AMS Equity'],
  XS2438416310: ['Notas Estruturadas', 'Itaú AMS Credit'],
  // Hedge Funds
  QSLU51737234: ['Hedge Funds', 'KKR Infrastructure Fund N1A'],
  // Balanceados (linha adicionada em dados.ts)
  LU0454720516: ['Balanceados', 'Itaú AAA Core Cl2 (USD)'],
}

// Conta Caixa: sufixo do nº de conta → nome da linha no app.
const MAPA_CAIXA: [RegExp, string][] = [
  [/USD-MM/i, 'Conta USD (MM)'],
  [/USD-DDA/i, 'Conta USD (DDA)'],
  [/CHF-DDA/i, 'Conta CHF'],
]

const mUS = (s: string) => Number(String(s).replace(/,/g, ''))
const isMoneyUS = (s: string) => /^\d{1,3}(,\d{3})*\.\d{2}$/.test((s || '').trim())
const isDate = (s: string) => /^\d{2}\/\d{2}\/\d{4}$/.test((s || '').trim())
const isPrice = (s: string) => /^\d[\d,]*(\.\d+)?$/.test((s || '').trim())
const c2 = (n: number) => Math.round(n * 100) / 100

export function parseExtratoLaJolla(text: string): ResultadoLaJolla {
  const L = text.split('\n')

  // Câmbio BRL do statement (linha de CURRENCIES: "...GBP 0.7381 BRL 5.1848" — evita o
  // "BRL 0.0%" da distribuição por moeda) e o total da posição.
  const cambioBRL = (() => {
    const m = text.match(/GBP\s+[\d.]+\s+BRL\s+([\d.]+)/i) || text.match(/BRL\s+(\d+\.\d{3,})/i)
    return m ? Number(m[1]) : null
  })()
  const totalUSD = (() => { const m = text.match(/Portfolio Position:\s*USD\s*([\d,]+\.\d{2})/i); return m ? mUS(m[1]) : null })()
  // "Market Value as of DD/MM/YYYY" aparece 2x (início e fim do mês) — usamos a ÚLTIMA (fecho).
  const datas = [...text.matchAll(/as of\s*(\d{2})\/(\d{2})\/(\d{4})/gi)]
  const md = datas.length ? datas[datas.length - 1] : null
  const ano = md ? Number(md[3]) : 0
  const mes = md ? Number(md[2]) : 0
  const dataPosicao = md ? `${md[1]}/${md[2]}/${md[3]}` : null

  const rate = cambioBRL ?? 0
  const brutos: { banco: string; investimento: string; usd: number; novo: boolean }[] = []
  const vistos = new Set<string>()

  const lastISIN = (i: number): string | null => {
    // O ISIN do ativo fica algumas linhas acima do valor de mercado (nunca mais de ~14).
    for (let j = i; j >= 0 && j > i - 14; j--) {
      const m = L[j].match(/ISIN:\s*([A-Z0-9]{10,14})/)
      if (m) return m[1]
    }
    return null
  }
  const nomeDescricao = (i: number): string => {
    // Nome do ativo = a última linha "de texto" antes do ISIN (pula Coupon/Country/vazias).
    for (let j = i - 1; j >= 0 && j > i - 6; j--) {
      const s = (L[j] || '').trim()
      if (!s || /^Coupon Rate|^Country|^Matures|^Portfolio$|^​$/.test(s)) continue
      return s
    }
    return 'Ativo não identificado'
  }
  const classeAtual = (i: number): string => {
    // Cabeçalho de classe mais próximo acima → banco no app.
    for (let j = i; j >= 0; j--) {
      const s = (L[j] || '').trim().toUpperCase()
      if (s.startsWith('FIXED INCOME')) return 'Renda Fixa'
      if (s.startsWith('EQUITIES')) return 'Ações e ETFs'
      if (s.startsWith('HEDGE FUNDS') || s === 'ALTERNATIVES') return 'Hedge Funds'
      if (s.startsWith('BALANCED')) return 'Balanceados'
      if (s.startsWith('OTHER')) return 'Notas Estruturadas'
    }
    return 'Outros'
  }
  const add = (banco: string, investimento: string, usd: number, novo: boolean) => {
    const k = `${banco}|${investimento}`
    if (vistos.has(k)) return
    vistos.add(k)
    brutos.push({ banco, investimento, usd, novo })
  }

  // 1) Ativos com ISIN — via padrão valor → preço → data.
  for (let j = 2; j < L.length; j++) {
    if (isDate(L[j]) && isPrice(L[j - 1]) && isMoneyUS(L[j - 2])) {
      const isin = lastISIN(j)
      if (!isin) continue
      const usd = mUS(L[j - 2])
      const alvo = MAPA_ISIN[isin]
      if (alvo) add(alvo[0], alvo[1], usd, false)
      else {
        const idx = L.findIndex(l => l.includes(`ISIN: ${isin}`))
        add(classeAtual(idx), nomeDescricao(idx), usd, true) // ativo novo → cria linha
      }
    }
  }

  // 2) Private Equity (Kinea) — sem ISIN; valor de mercado é o 2º número da linha seguinte.
  const pe = L.findIndex(l => /KINEA US PE/i.test(l))
  if (pe >= 0) {
    const m = (L[pe + 2] || '').match(/^(\d[\d,]*\.\d{2})(\d[\d,]*\.\d{2})$/)
    if (m) add('Private Equity', 'Kinea US PE SP I-B', mUS(m[2]), false)
  }

  // 3) Caixa — 3 contas; usamos o Market Value (USD) (2º valor da linha).
  for (const l of L) {
    const m = l.match(/^(\d{7,12})-(USD|CHF)-(DDA|MM).*?(USD|CHF)(\d[\d,]*\.\d{2})(\d[\d,]*\.\d{2})/)
    if (!m) continue
    const sufixo = `${m[2]}-${m[3]}`
    const nome = MAPA_CAIXA.find(([re]) => re.test(sufixo))?.[1]
    if (nome) add('Caixa', nome, mUS(m[6]), false)
  }

  const somaExtraidaUSD = c2(brutos.reduce((s, b) => s + b.usd, 0))
  const reconciliado = totalUSD != null && Math.abs(somaExtraidaUSD - totalUSD) < 0.5

  const itens: ItemLaJolla[] = brutos.map(b => ({
    banco: b.banco,
    investimento: b.investimento,
    valorMoeda: c2(b.usd),
    valor: c2(b.usd * rate),
    novo: b.novo,
  }))

  return { ano, mes, dataPosicao, cambioBRL, totalUSD, somaExtraidaUSD, reconciliado, itens }
}

// Câmbio OFICIAL do Banco Central (PTAX) — dólar, euro e franco em R$ (cotação de VENDA).
// Fonte única do câmbio no app: o painel INDICADORES e o editor do Financeiro usam ISTO,
// para que a conversão US$/€/CHF → R$ seja sempre igual à que aparece na lateral.
// Consulta os últimos ~12 dias (cobre fins de semana/feriados) e pega a cotação mais recente.
// Datas no formato MM-DD-YYYY exigido pela API Olinda do BCB.

export type Ptax = { usd: number | null; eur: number | null; chf: number | null; data: string | null }

async function fetchJson(url: string, revalidate: number): Promise<any | null> {
  try {
    const r = await fetch(url, { next: { revalidate } })
    if (!r.ok) return null
    return await r.json()
  } catch {
    return null
  }
}

export async function fetchPtax(revalidate = 1800): Promise<Ptax> {
  const base = 'https://olinda.bcb.gov.br/olinda/servico/PTAX/versao/v1/odata'
  const hoje = new Date()
  const di = new Date(hoje); di.setDate(di.getDate() - 12)
  const fmt = (d: Date) => `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}-${d.getFullYear()}`
  const periodo = `@di=%27${fmt(di)}%27&@df=%27${fmt(hoje)}%27&$top=1&$orderby=dataHoraCotacao%20desc&$format=json`
  const dolarUrl = `${base}/CotacaoDolarPeriodo(dataInicial=@di,dataFinalCotacao=@df)?${periodo}`
  const moedaUrl = (m: string) => `${base}/CotacaoMoedaPeriodo(moeda=@m,dataInicial=@di,dataFinalCotacao=@df)?@m=%27${m}%27&${periodo}`
  const [usdJ, eurJ, chfJ] = await Promise.all([
    fetchJson(dolarUrl, revalidate),
    fetchJson(moedaUrl('EUR'), revalidate),
    fetchJson(moedaUrl('CHF'), revalidate),
  ])
  const venda = (j: any): number | null => {
    const v = j?.value?.[0]?.cotacaoVenda
    return typeof v === 'number' && isFinite(v) ? v : null
  }
  const dataCot: string | null = usdJ?.value?.[0]?.dataHoraCotacao?.slice(0, 10) ?? null
  return { usd: venda(usdJ), eur: venda(eurJ), chf: venda(chfJ), data: dataCot }
}

// Dado o nome da moeda da linha ("US$", "€", "CHF", "Dólar"…), devolve a cotação PTAX
// correspondente (R$ por unidade). null quando não reconhece ou não há cotação.
export function cotacaoDaMoeda(moeda: string | null | undefined, ptax: Ptax): number | null {
  if (!moeda) return null
  const m = moeda.toUpperCase()
  if (/CHF|FRANC/.test(m)) return ptax.chf
  if (/EUR|€/.test(m)) return ptax.eur
  if (/US|USD|\$|D[ÓO]LAR/.test(m)) return ptax.usd
  return null
}

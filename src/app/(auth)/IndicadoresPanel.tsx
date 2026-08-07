// Quadro de indicadores no menu esquerdo. Busca câmbio (AwesomeAPI) e juros/inflação
// (Banco Central - SGS) ao vivo, com cache de 1h (revalidate) pra não bater nas APIs a
// cada page load. Se alguma fonte falhar, mostra "—" sem quebrar o layout.
// CUB-SC não tem API pública → valor do último mês conhecido (atualizado junto do robô do CUB).

const CUB_SC = { valor: '3.121,62', variacao: '+0,82%', ref: 'jul/26' }

async function fetchJson(url: string, revalidate = 3600): Promise<any | null> {
  try {
    const r = await fetch(url, { next: { revalidate } })
    if (!r.ok) return null
    return await r.json()
  } catch {
    return null
  }
}

function Linha({ icone, label, valor, pct, sub }: { icone: string; label: string; valor: string; pct?: string | null; sub?: string }) {
  const p = pct != null && pct !== '' ? Number(pct) : null
  return (
    <div className="flex items-baseline justify-between gap-1">
      <span className="text-gray-500 truncate">{icone} {label}</span>
      <span className="text-right whitespace-nowrap">
        <span className="font-semibold text-gray-800">{valor}</span>
        {p != null && (
          <span className={`ml-1 text-[10px] font-medium ${p >= 0 ? 'text-green-600' : 'text-red-500'}`}>
            {p >= 0 ? '▲' : '▼'}{Math.abs(p).toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%
          </span>
        )}
        {sub && <span className="ml-1 text-[10px] text-gray-400">{sub}</span>}
      </span>
    </div>
  )
}

export default async function IndicadoresPanel() {
  const [cambio, cdi, selic, ipca] = await Promise.all([
    fetchJson('https://economia.awesomeapi.com.br/last/USD-BRL,EUR-BRL,CHF-BRL', 1800),
    fetchJson('https://api.bcb.gov.br/dados/serie/bcdata.sgs.4389/dados/ultimos/1?formato=json'),
    fetchJson('https://api.bcb.gov.br/dados/serie/bcdata.sgs.432/dados/ultimos/1?formato=json'),
    fetchJson('https://api.bcb.gov.br/dados/serie/bcdata.sgs.13522/dados/ultimos/1?formato=json'),
  ])

  const moeda = (o: any) => o ? 'R$ ' + Number(o.bid).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 4 }) : '—'
  const pctOf = (o: any) => o?.pctChange ?? null
  const pctAA = (arr: any) => arr?.[0]?.valor ? Number(arr[0].valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) + '%' : '—'

  const usd = cambio?.USDBRL, eur = cambio?.EURBRL, chf = cambio?.CHFBRL

  return (
    <div className="mt-4 bg-white border border-gray-200 rounded-lg p-3 w-44 shrink-0">
      <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-2">📊 Indicadores</h3>
      <div className="space-y-1.5 text-xs">
        <Linha icone="💵" label="Dólar" valor={moeda(usd)} pct={pctOf(usd)} />
        <Linha icone="💶" label="Euro" valor={moeda(eur)} pct={pctOf(eur)} />
        <Linha icone="🇨🇭" label="Franco" valor={moeda(chf)} pct={pctOf(chf)} />
        <div className="border-t border-gray-100 my-1.5" />
        <Linha icone="🏗️" label="CUB-SC" valor={`R$ ${CUB_SC.valor}`} sub={CUB_SC.ref} />
        <Linha icone="📈" label="CDI" valor={pctAA(cdi)} sub="a.a." />
        <Linha icone="🏦" label="Selic" valor={pctAA(selic)} sub="a.a." />
        <Linha icone="📊" label="IPCA" valor={pctAA(ipca)} sub="12m" />
      </div>
      <p className="text-[9px] text-gray-300 mt-2 leading-tight">Câmbio e juros ao vivo · CUB manual</p>
    </div>
  )
}

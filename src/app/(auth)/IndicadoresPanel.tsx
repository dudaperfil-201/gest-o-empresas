// Quadro de indicadores no menu esquerdo. Câmbio via open.er-api.com (funciona no
// servidor da Vercel — a AwesomeAPI bloqueava IP de datacenter) e juros/inflação via
// Banco Central (SGS). Cache de ~30min-1h (revalidate) pra não bater nas APIs a cada
// page load. Fontes que falham mostram "—" sem quebrar o layout.
// CUB-SC não tem API pública → último valor conhecido (atualizado junto do robô do CUB).

const CUB_SC = { valor: '3.121,62', ref: 'jul/26' }

async function fetchJson(url: string, revalidate = 3600): Promise<any | null> {
  try {
    const r = await fetch(url, { next: { revalidate } })
    if (!r.ok) return null
    return await r.json()
  } catch {
    return null
  }
}

// Curva de juros do Tesouro americano (par yield curve), fonte oficial do US Treasury.
// Atualiza todo dia útil (~meio da tarde ET) → cache de 6h. Retorna o dado mais recente.
type Treasury = { data: string; y: Record<string, string> }
async function fetchTreasury(revalidate = 21600): Promise<Treasury | null> {
  const yyyymm = (d: Date) => `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`
  const agora = new Date()
  // Tenta o mês atual; se ainda não houver dado (começo de mês), cai no mês anterior.
  for (const ref of [agora, new Date(agora.getFullYear(), agora.getMonth() - 1, 1)]) {
    try {
      const url = `https://home.treasury.gov/resource-center/data-chart-center/interest-rates/pages/xml?data=daily_treasury_yield_curve&field_tdr_date_value_month=${yyyymm(ref)}`
      const resp = await fetch(url, { next: { revalidate } })
      if (!resp.ok) continue
      const xml = await resp.text()
      const blocos = [...xml.matchAll(/<m:properties>([\s\S]*?)<\/m:properties>/g)].map(m => m[1])
      if (blocos.length === 0) continue
      const pega = (b: string, tag: string) => b.match(new RegExp(`<d:${tag}[^>]*>([^<]+)<`))?.[1] ?? ''
      // O dado mais recente = maior NEW_DATE.
      let melhor = blocos[0], melhorData = pega(blocos[0], 'NEW_DATE')
      for (const b of blocos) { const d = pega(b, 'NEW_DATE'); if (d > melhorData) { melhorData = d; melhor = b } }
      const pct = (tag: string) => {
        const v = pega(melhor, tag)
        return v ? Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) + '%' : '—'
      }
      return {
        data: melhorData.slice(0, 10),
        y: { '2': pct('BC_2YEAR'), '5': pct('BC_5YEAR'), '10': pct('BC_10YEAR'), '30': pct('BC_30YEAR') },
      }
    } catch { /* tenta o mês anterior */ }
  }
  return null
}

function Linha({ icone, label, valor, sub }: { icone?: string; label: string; valor: string; sub?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className="text-gray-600 whitespace-nowrap">{icone ? `${icone} ` : ''}{label}</span>
      <span className="text-right whitespace-nowrap">
        <span className="font-semibold text-gray-800">{valor}</span>
        {sub && <span className="ml-1 text-[10px] text-gray-400">{sub}</span>}
      </span>
    </div>
  )
}

export default async function IndicadoresPanel() {
  const [cambio, cdi, selic, ipca, treasury] = await Promise.all([
    fetchJson('https://open.er-api.com/v6/latest/USD', 1800),
    fetchJson('https://api.bcb.gov.br/dados/serie/bcdata.sgs.4389/dados/ultimos/1?formato=json'),
    fetchJson('https://api.bcb.gov.br/dados/serie/bcdata.sgs.432/dados/ultimos/1?formato=json'),
    fetchJson('https://api.bcb.gov.br/dados/serie/bcdata.sgs.13522/dados/ultimos/1?formato=json'),
    fetchTreasury(),
  ])

  // Câmbio: base USD → taxas cruzadas para R$ por Dólar/Euro/Franco.
  const r = cambio?.rates
  const brl = (n: number | null | undefined) =>
    n != null && isFinite(n) ? 'R$ ' + n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 4 }) : '—'
  const usdBrl = r?.BRL ?? null
  const eurBrl = r?.BRL && r?.EUR ? r.BRL / r.EUR : null
  const chfBrl = r?.BRL && r?.CHF ? r.BRL / r.CHF : null

  const pctAA = (arr: any) => arr?.[0]?.valor ? Number(arr[0].valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) + '%' : '—'

  // Vencimento de cada ponto da curva = data de referência + os anos (ex.: 2 anos → 08/2028).
  const refTreasury = treasury ? new Date(treasury.data + 'T12:00:00') : null
  const vencimento = (anos: number) => {
    if (!refTreasury) return ''
    const d = new Date(refTreasury)
    d.setFullYear(d.getFullYear() + anos)
    return `${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
  }

  return (
    <div className="mt-4 bg-white border border-gray-200 rounded-lg p-4 w-56 shrink-0 shadow-sm">
      <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">📊 Indicadores</h3>
      <div className="space-y-2 text-sm">
        <Linha icone="💵" label="Dólar" valor={brl(usdBrl)} />
        <Linha icone="💶" label="Euro" valor={brl(eurBrl)} />
        <Linha icone="🇨🇭" label="Franco" valor={brl(chfBrl)} />
        <div className="border-t border-gray-100 my-2" />
        <Linha icone="🏗️" label="CUB-SC" valor={`R$ ${CUB_SC.valor}`} sub={CUB_SC.ref} />
        <Linha icone="📈" label="CDI" valor={pctAA(cdi)} sub="a.a." />
        <Linha icone="🏦" label="Selic" valor={pctAA(selic)} sub="a.a." />
        <Linha icone="📊" label="IPCA" valor={pctAA(ipca)} sub="12m" />

        {/* Curva do Tesouro americano (T-Notes/T-Bond) — dado público ao vivo */}
        <div className="border-t border-gray-100 my-2" />
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">🇺🇸 Treasury EUA</span>
          {treasury && <span className="text-[9px] text-gray-300">{new Date(treasury.data + 'T12:00:00').toLocaleDateString('pt-BR')}</span>}
        </div>
        {treasury ? (
          <>
            {([['2', 2], ['5', 5], ['10', 10], ['30', 30]] as const).map(([k, anos]) => (
              <div key={k} className="flex items-baseline justify-between gap-2">
                <span className="text-gray-600 whitespace-nowrap">
                  {anos} anos <span className="text-[9px] text-gray-400">· {vencimento(anos)}</span>
                </span>
                <span className="text-right whitespace-nowrap">
                  <span className="font-semibold text-gray-800">{treasury.y[k]}</span>
                  <span className="ml-1 text-[10px] text-gray-400">a.a.</span>
                </span>
              </div>
            ))}
          </>
        ) : (
          <p className="text-[10px] text-gray-300">indisponível</p>
        )}
      </div>
      <p className="text-[9px] text-gray-300 mt-3 leading-tight">Câmbio, juros e Treasury ao vivo · CUB manual</p>
    </div>
  )
}

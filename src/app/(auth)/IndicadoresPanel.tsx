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

function Linha({ icone, label, valor, sub }: { icone: string; label: string; valor: string; sub?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-1">
      <span className="text-gray-500 truncate">{icone} {label}</span>
      <span className="text-right whitespace-nowrap">
        <span className="font-semibold text-gray-800">{valor}</span>
        {sub && <span className="ml-1 text-[10px] text-gray-400">{sub}</span>}
      </span>
    </div>
  )
}

export default async function IndicadoresPanel() {
  const [cambio, cdi, selic, ipca] = await Promise.all([
    fetchJson('https://open.er-api.com/v6/latest/USD', 1800),
    fetchJson('https://api.bcb.gov.br/dados/serie/bcdata.sgs.4389/dados/ultimos/1?formato=json'),
    fetchJson('https://api.bcb.gov.br/dados/serie/bcdata.sgs.432/dados/ultimos/1?formato=json'),
    fetchJson('https://api.bcb.gov.br/dados/serie/bcdata.sgs.13522/dados/ultimos/1?formato=json'),
  ])

  // Câmbio: base USD → taxas cruzadas para R$ por Dólar/Euro/Franco.
  const r = cambio?.rates
  const brl = (n: number | null | undefined) =>
    n != null && isFinite(n) ? 'R$ ' + n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 4 }) : '—'
  const usdBrl = r?.BRL ?? null
  const eurBrl = r?.BRL && r?.EUR ? r.BRL / r.EUR : null
  const chfBrl = r?.BRL && r?.CHF ? r.BRL / r.CHF : null

  const pctAA = (arr: any) => arr?.[0]?.valor ? Number(arr[0].valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) + '%' : '—'

  return (
    <div className="mt-4 bg-white border border-gray-200 rounded-lg p-3 w-44 shrink-0">
      <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-2">📊 Indicadores</h3>
      <div className="space-y-1.5 text-xs">
        <Linha icone="💵" label="Dólar" valor={brl(usdBrl)} />
        <Linha icone="💶" label="Euro" valor={brl(eurBrl)} />
        <Linha icone="🇨🇭" label="Franco" valor={brl(chfBrl)} />
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

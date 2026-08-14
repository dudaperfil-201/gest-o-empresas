// Painel enxuto de indicadores para a parte de IMÓVEIS: CUB, IPCA, IGP-M, CDI e Selic.
// (O painel completo — câmbio, Treasury, Tesouro IPCA+ — continua só no Financeiro.)
// Juros/inflação via Banco Central (SGS), com cache (revalidate) pra não bater na API a
// cada page load. CUB-SC não tem API pública → último valor conhecido.

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

export default async function IndicadoresImoveis() {
  const [cdi, selic, ipca, igpm] = await Promise.all([
    fetchJson('https://api.bcb.gov.br/dados/serie/bcdata.sgs.4389/dados/ultimos/1?formato=json'),   // CDI a.a.
    fetchJson('https://api.bcb.gov.br/dados/serie/bcdata.sgs.432/dados/ultimos/1?formato=json'),    // Selic meta a.a.
    fetchJson('https://api.bcb.gov.br/dados/serie/bcdata.sgs.13522/dados/ultimos/1?formato=json'),  // IPCA acum. 12m
    fetchJson('https://api.bcb.gov.br/dados/serie/bcdata.sgs.189/dados/ultimos/12?formato=json'),   // IGP-M mensal (12x)
  ])

  const pctAA = (arr: any) => arr?.[0]?.valor ? Number(arr[0].valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) + '%' : '—'

  // IGP-M acumulado 12 meses = composição das 12 variações mensais.
  let igpm12 = '—'
  if (Array.isArray(igpm) && igpm.length > 0) {
    const fator = igpm.reduce((f, x) => f * (1 + Number(x.valor) / 100), 1)
    igpm12 = ((fator - 1) * 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) + '%'
  }

  return (
    <div className="space-y-2 text-sm">
      <Linha icone="🏗️" label="CUB-SC" valor={`R$ ${CUB_SC.valor}`} sub={CUB_SC.ref} />
      <Linha icone="📊" label="IPCA" valor={pctAA(ipca)} sub="12m" />
      <Linha icone="📉" label="IGP-M" valor={igpm12} sub="12m" />
      <Linha icone="📈" label="CDI" valor={pctAA(cdi)} sub="a.a." />
      <Linha icone="🏦" label="Selic" valor={pctAA(selic)} sub="a.a." />
      <p className="text-[9px] text-gray-300 mt-3 leading-tight">IPCA, IGP-M, CDI e Selic via Banco Central · CUB manual</p>
    </div>
  )
}

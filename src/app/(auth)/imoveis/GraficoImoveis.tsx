'use client'

// Gráfico de barras dos imóveis: para cada empresa, duas barras verticais lado a lado —
// POTENCIAL de ganho (soma dos aluguéis) e RECEBIDO (o que entrou no mês). Só aparece na
// seção de Imóveis (é renderizado dentro da própria página). HTML/CSS puro, responsivo:
// em telas estreitas o gráfico rola na horizontal.

type Dado = { nome: string; potencial: number; recebido: number }

const brl = (n: number) => 'R$ ' + n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
// rótulo compacto em cima da barra (R$ 12,5 mil / R$ 980)
const compacto = (n: number) => {
  if (n >= 1e6) return 'R$ ' + (n / 1e6).toLocaleString('pt-BR', { maximumFractionDigits: 2 }) + ' mi'
  if (n >= 1e3) return 'R$ ' + (n / 1e3).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + ' mil'
  return 'R$ ' + n.toLocaleString('pt-BR', { maximumFractionDigits: 0 })
}

export default function GraficoImoveis({ dados, mesLabel }: { dados: Dado[]; mesLabel: string }) {
  const visiveis = dados.filter(d => d.potencial > 0 || d.recebido > 0)
  if (visiveis.length === 0) return null

  const ALTURA = 180 // px da área das barras
  const max = Math.max(1, ...visiveis.map(d => Math.max(d.potencial, d.recebido)))
  const h = (v: number) => Math.max(v > 0 ? 3 : 0, Math.round((v / max) * ALTURA)) // mínimo 3px se houver valor

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 mb-4">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <h3 className="font-semibold text-gray-900">📊 Potencial × Recebido por empresa</h3>
        <div className="flex items-center gap-4 text-xs">
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-blue-500 inline-block" /> Potencial de ganho</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-green-500 inline-block" /> Recebido</span>
        </div>
      </div>

      <div className="overflow-x-auto pb-1">
        <div className="flex items-end gap-6 min-w-max px-1" style={{ height: ALTURA + 46 }}>
          {visiveis.map(d => {
            const pct = d.potencial > 0 ? Math.round((d.recebido / d.potencial) * 100) : 0
            return (
              <div key={d.nome} className="flex flex-col items-center justify-end shrink-0">
                {/* barras */}
                <div className="flex items-end gap-1.5" style={{ height: ALTURA }}>
                  <div className="flex flex-col items-center justify-end">
                    <span className="text-[9px] text-gray-400 mb-0.5 whitespace-nowrap">{compacto(d.potencial)}</span>
                    <div
                      className="w-7 rounded-t bg-blue-500 hover:bg-blue-600 transition-colors"
                      style={{ height: h(d.potencial) }}
                      title={`Potencial: ${brl(d.potencial)}`}
                    />
                  </div>
                  <div className="flex flex-col items-center justify-end">
                    <span className="text-[9px] text-gray-400 mb-0.5 whitespace-nowrap">{compacto(d.recebido)}</span>
                    <div
                      className="w-7 rounded-t bg-green-500 hover:bg-green-600 transition-colors"
                      style={{ height: h(d.recebido) }}
                      title={`Recebido: ${brl(d.recebido)}${d.potencial > 0 ? ` (${pct}% do potencial)` : ''}`}
                    />
                  </div>
                </div>
                {/* nome da empresa */}
                <span className="mt-2 text-[11px] text-gray-600 font-medium text-center max-w-[7rem] leading-tight break-words">
                  {d.nome}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      <p className="text-[11px] text-gray-400 mt-2 capitalize">Referente a {mesLabel}</p>
    </div>
  )
}

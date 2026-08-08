'use client'

// Gráfico da evolução do PATRIMÔNIO TOTAL (soma de todas as carteiras) mês a mês.
// SVG puro, sem biblioteca. Passe o mouse (ou toque) num ponto para ver o valor do mês.

import { useState } from 'react'

type Ponto = { abrev: string; nome: string; ano: number; mes: number; total: number }

const brl = (n: number) => 'R$ ' + n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

// Formato curto para caber na coluna estreita: "R$ 45,1 mi".
const compacto = (n: number) => {
  if (Math.abs(n) >= 1e6) return 'R$ ' + (n / 1e6).toLocaleString('pt-BR', { maximumFractionDigits: 2 }) + ' mi'
  if (Math.abs(n) >= 1e3) return 'R$ ' + (n / 1e3).toLocaleString('pt-BR', { maximumFractionDigits: 0 }) + ' mil'
  return brl(n)
}

export default function GraficoEvolucao({ pontos }: { pontos: Ponto[] }) {
  const [ativo, setAtivo] = useState<number | null>(null)

  if (pontos.length < 2) return null

  const W = 152, H = 64, P = 5
  const vals = pontos.map(p => p.total)
  const min = Math.min(...vals), max = Math.max(...vals)
  const span = max - min || 1
  const x = (i: number) => P + (i / (pontos.length - 1)) * (W - 2 * P)
  const y = (v: number) => P + (1 - (v - min) / span) * (H - 2 * P)

  const linha = pontos.map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(i).toFixed(1)} ${y(p.total).toFixed(1)}`).join(' ')
  const area = `${linha} L ${x(pontos.length - 1).toFixed(1)} ${H - P} L ${x(0).toFixed(1)} ${H - P} Z`

  const ult = pontos[pontos.length - 1]
  const primeiro = pontos[0]
  const subiu = ult.total >= primeiro.total
  const cor = subiu ? '#059669' : '#dc2626' // verde / vermelho

  const sel = ativo != null ? pontos[ativo] : ult
  const anterior = (ativo != null ? ativo : pontos.length - 1) > 0
    ? pontos[(ativo != null ? ativo : pontos.length - 1) - 1]
    : null
  const varPct = anterior && anterior.total ? ((sel.total - anterior.total) / anterior.total) * 100 : null

  return (
    <div className="mt-4 bg-white border border-gray-200 rounded-lg p-4 w-56 shrink-0 shadow-sm">
      <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">📈 Evolução da Carteira</h3>

      {/* Valor do mês selecionado (último por padrão) */}
      <div className="mb-1.5">
        <div className="text-base font-bold text-gray-800 leading-tight">{compacto(sel.total)}</div>
        <div className="flex items-center gap-1.5 text-[10px]">
          <span className="text-gray-400 capitalize">{sel.nome.toLowerCase()}/{sel.ano}</span>
          {varPct != null && (
            <span className={varPct >= 0 ? 'text-green-600 font-semibold' : 'text-red-500 font-semibold'}>
              {varPct >= 0 ? '▲' : '▼'} {Math.abs(varPct).toFixed(1)}%
            </span>
          )}
        </div>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 'auto' }} onMouseLeave={() => setAtivo(null)}>
        <defs>
          <linearGradient id="grad-evol" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={cor} stopOpacity="0.22" />
            <stop offset="100%" stopColor={cor} stopOpacity="0" />
          </linearGradient>
        </defs>

        <path d={area} fill="url(#grad-evol)" />
        <path d={linha} fill="none" stroke={cor} strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" />

        {/* Ponto destacado (linha vertical + bolinha) */}
        {(() => {
          const i = ativo != null ? ativo : pontos.length - 1
          return (
            <>
              <line x1={x(i)} y1={P} x2={x(i)} y2={H - P} stroke={cor} strokeWidth="0.5" strokeDasharray="2 2" opacity="0.4" />
              <circle cx={x(i)} cy={y(pontos[i].total)} r="2.6" fill="#fff" stroke={cor} strokeWidth="1.6" />
            </>
          )
        })()}

        {/* Áreas de toque/hover invisíveis por mês */}
        {pontos.map((_, i) => {
          const larg = (W - 2 * P) / (pontos.length - 1)
          return (
            <rect
              key={i}
              x={x(i) - larg / 2} y={0} width={larg} height={H}
              fill="transparent"
              onMouseEnter={() => setAtivo(i)}
              onClick={() => setAtivo(i)}
              style={{ cursor: 'pointer' }}
            />
          )
        })}
      </svg>

      {/* Meses inicial e final nas pontas */}
      <div className="flex justify-between text-[9px] text-gray-400 mt-0.5 capitalize">
        <span>{primeiro.abrev.toLowerCase()}</span>
        <span>{ult.abrev.toLowerCase()}</span>
      </div>
    </div>
  )
}

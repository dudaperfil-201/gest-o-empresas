'use client'

// Quadro BREAK EVEN: distribuição de lucros do MÊS CORRENTE. Serginho e Eduardo são
// digitados; RNX vem automático (diferença dos 2 últimos meses). Calcula 10% ÷ 3.
// Cada mês é salvo no banco (tabela break_even) — o mês novo começa em branco e os
// anteriores ficam guardados. Salva automaticamente ao sair do campo (onBlur).

import { useState, useEffect } from 'react'
import { salvarBreakEven } from '@/app/actions/financeiro'

const brl = (n: number) => 'R$ ' + n.toLocaleString('pt-BR', { minimumFractionDigits: 2 })

function toNum(s: string): number {
  const c = (s ?? '').trim().replace(/\s/g, '')
  if (!c) return 0
  const norm = c.includes(',') ? c.replace(/\./g, '').replace(',', '.') : c
  const n = parseFloat(norm)
  return isFinite(n) ? n : 0
}
// número salvo → texto editável (vazio se 0).
const paraTexto = (n: number) => (n && n !== 0 ? String(n).replace('.', ',') : '')

type Props = { ano: number; mes: number; rnxRendimento: number; serginho: number; eduardo: number }

export default function BreakEven({ ano, mes, rnxRendimento, serginho: serginhoSalvo, eduardo: eduardoSalvo }: Props) {
  const [serginho, setSerginho] = useState(paraTexto(serginhoSalvo))
  const [eduardo, setEduardo] = useState(paraTexto(eduardoSalvo))
  const [status, setStatus] = useState<'' | 'salvando' | 'salvo' | 'erro'>('')

  // Ao trocar de mês (props mudam), recarrega os valores daquele mês (em branco se novo).
  useEffect(() => {
    setSerginho(paraTexto(serginhoSalvo))
    setEduardo(paraTexto(eduardoSalvo))
    setStatus('')
  }, [ano, mes, serginhoSalvo, eduardoSalvo])

  async function salvar() {
    setStatus('salvando')
    const r = await salvarBreakEven(ano, mes, toNum(serginho), toNum(eduardo), rnxRendimento)
    setStatus(r.ok ? 'salvo' : 'erro')
  }

  const total = toNum(serginho) + toNum(eduardo) + rnxRendimento
  const dezPct = total * 0.10
  const porPessoa = dezPct / 3
  const nomeMes = new Date(ano, mes - 1).toLocaleDateString('pt-BR', { month: 'long' })

  const campo = (label: string, valor: string, set: (v: string) => void) => (
    <div>
      <label className="block text-[10px] text-gray-500 mb-0.5">{label}</label>
      <input
        type="text" inputMode="decimal" value={valor}
        onChange={e => set(e.target.value)}
        onBlur={salvar}
        placeholder="0,00"
        className="w-full px-2 py-1 border border-gray-300 rounded text-xs text-right focus:outline-none focus:ring-2 focus:ring-purple-200"
      />
    </div>
  )

  return (
    <div className="mt-4 bg-white border border-gray-200 rounded-lg p-3 w-44 shrink-0">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-wide">💸 Break Even</h3>
        <span className="text-[9px] text-gray-400 capitalize">{nomeMes}/{ano}</span>
      </div>
      <div className="space-y-1.5">
        {campo('Itaú Serginho', serginho, setSerginho)}
        {campo('Itaú Eduardo', eduardo, setEduardo)}
        <div>
          <label className="block text-[10px] text-gray-500 mb-0.5">RNX <span className="text-purple-500">(auto)</span></label>
          <div className="w-full px-2 py-1 bg-gray-50 border border-gray-200 rounded text-xs text-right font-semibold text-gray-700">
            {brl(rnxRendimento)}
          </div>
        </div>
      </div>
      <div className="mt-2 pt-2 border-t border-gray-100 space-y-1 text-xs">
        <div className="flex justify-between text-gray-500">
          <span>Total rendido</span><span className="font-semibold text-gray-700">{brl(total)}</span>
        </div>
        <div className="flex justify-between text-gray-500">
          <span>10%</span><span className="font-semibold text-gray-700">{brl(dezPct)}</span>
        </div>
        <div className="flex justify-between items-baseline bg-purple-50 rounded px-2 py-1 mt-1">
          <span className="text-[11px] font-semibold text-purple-700">Cada um (÷3)</span>
          <span className="text-sm font-bold text-purple-700">{brl(porPessoa)}</span>
        </div>
      </div>
      <p className="text-[9px] mt-1.5 h-3 text-right">
        {status === 'salvando' && <span className="text-gray-400">salvando…</span>}
        {status === 'salvo' && <span className="text-green-600">✓ salvo</span>}
        {status === 'erro' && <span className="text-red-500">erro ao salvar</span>}
      </p>
    </div>
  )
}

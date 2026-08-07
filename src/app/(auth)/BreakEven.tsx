'use client'

// Quadro BREAK EVEN no menu esquerdo: o usuário digita quanto renderam no mês as 3
// contas (Itaú Serginho, Itaú Eduardo, RNX); calcula 10% sobre o total e divide por 3
// (distribuição de lucros para 3 pessoas). Valores ficam salvos no navegador (localStorage).

import { useState, useEffect } from 'react'

const brl = (n: number) => 'R$ ' + n.toLocaleString('pt-BR', { minimumFractionDigits: 2 })

// Aceita "12.345,67", "12345,67", "12345.67" ou "12345".
function toNum(s: string): number {
  const c = (s ?? '').trim().replace(/\s/g, '')
  if (!c) return 0
  const norm = c.includes(',') ? c.replace(/\./g, '').replace(',', '.') : c
  const n = parseFloat(norm)
  return isFinite(n) ? n : 0
}

const CHAVE = 'breakeven-rendimentos'

// rnxRendimento vem do servidor: diferença dos 2 últimos meses da carteira RNX (auto).
export default function BreakEven({ rnxRendimento }: { rnxRendimento: number }) {
  const [serginho, setSerginho] = useState('')
  const [eduardo, setEduardo] = useState('')

  // Carrega o que foi digitado da última vez (só Serginho e Eduardo — RNX é automático).
  useEffect(() => {
    try {
      const s = JSON.parse(localStorage.getItem(CHAVE) || '{}')
      if (s.serginho) setSerginho(s.serginho)
      if (s.eduardo) setEduardo(s.eduardo)
    } catch { /* ignora */ }
  }, [])
  useEffect(() => {
    try { localStorage.setItem(CHAVE, JSON.stringify({ serginho, eduardo })) } catch { /* ignora */ }
  }, [serginho, eduardo])

  const total = toNum(serginho) + toNum(eduardo) + rnxRendimento
  const dezPct = total * 0.10
  const porPessoa = dezPct / 3

  const campo = (label: string, valor: string, set: (v: string) => void) => (
    <div>
      <label className="block text-[10px] text-gray-500 mb-0.5">{label}</label>
      <input
        type="text" inputMode="decimal" value={valor}
        onChange={e => set(e.target.value)}
        placeholder="0,00"
        className="w-full px-2 py-1 border border-gray-300 rounded text-xs text-right focus:outline-none focus:ring-2 focus:ring-purple-200"
      />
    </div>
  )

  return (
    <div className="mt-4 bg-white border border-gray-200 rounded-lg p-3 w-44 shrink-0">
      <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-2">💸 Break Even</h3>
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
    </div>
  )
}

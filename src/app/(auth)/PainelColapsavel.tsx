'use client'

// Painel sanfona do menu lateral: um botão (título + setinha) que, ao clicar, abre o
// conteúdo inteiro embaixo. Começa fechado. Usado para Indicadores e Break Even.

import { useState } from 'react'

export default function PainelColapsavel({ titulo, defaultOpen = false, children }: {
  titulo: string
  defaultOpen?: boolean
  children: React.ReactNode
}) {
  const [aberto, setAberto] = useState(defaultOpen)
  return (
    <div className="mt-4 bg-white border border-gray-200 rounded-lg w-56 shrink-0 shadow-sm overflow-hidden">
      <button
        onClick={() => setAberto(a => !a)}
        aria-expanded={aberto}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors select-none"
      >
        <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">{titulo}</span>
        <span className="text-gray-400 text-xs">{aberto ? '▾' : '▸'}</span>
      </button>
      {aberto && <div className="px-4 pb-4 pt-3 border-t border-gray-100">{children}</div>}
    </div>
  )
}

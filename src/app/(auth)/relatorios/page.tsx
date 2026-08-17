import Link from 'next/link'
import { exigirRelatorios } from '@/lib/auth'

// Tela-hub da área "Relatório e Documentos": dois cards (Relatórios / Documentos).
const CARDS = [
  { href: '/relatorio', emoji: '📊', titulo: 'RELATÓRIOS', desc: 'Relatório Mensal, Em Atraso e Break Even.', cor: 'indigo' },
  { href: '/documentos', emoji: '📁', titulo: 'DOCUMENTOS', desc: 'Documentos importantes arquivados mês a mês.', cor: 'amber' },
] as const

const CORES: Record<string, { borda: string; texto: string; bg: string; bgHover: string }> = {
  indigo: { borda: 'hover:border-indigo-400', texto: 'text-indigo-700', bg: 'bg-indigo-50', bgHover: 'group-hover:bg-indigo-100' },
  amber: { borda: 'hover:border-amber-400', texto: 'text-amber-700', bg: 'bg-amber-50', bgHover: 'group-hover:bg-amber-100' },
}

export default async function RelatoriosHubPage() {
  await exigirRelatorios()

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
        <Link href="/" className="hover:text-blue-600">Início</Link>
        <span>/</span>
        <span className="text-gray-900 font-medium">Relatório e Documentos</span>
      </div>

      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900">Relatório e Documentos</h2>
        <p className="text-sm text-gray-500 mt-1">O que você quer acessar?</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {CARDS.map(c => {
          const cor = CORES[c.cor]
          return (
            <Link key={c.href} href={c.href}
              className={`group bg-white border border-gray-200 rounded-2xl p-8 flex flex-col items-center text-center hover:shadow-md transition-all ${cor.borda}`}>
              <div className={`w-20 h-20 rounded-2xl ${cor.bg} flex items-center justify-center text-5xl ${cor.bgHover} transition-colors`}>
                {c.emoji}
              </div>
              <h3 className={`mt-5 text-xl font-bold ${cor.texto}`}>{c.titulo}</h3>
              <p className="mt-2 text-sm text-gray-500">{c.desc}</p>
            </Link>
          )
        })}
      </div>
    </div>
  )
}

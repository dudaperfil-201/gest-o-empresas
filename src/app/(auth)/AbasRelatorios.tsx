import Link from 'next/link'

// Abas de navegação entre os 3 relatórios. `atual` destaca a aba da página.
const ABAS = [
  { chave: 'mensal', href: '/relatorio', label: '📄 Mensal' },
  { chave: 'atraso', href: '/relatorio-atraso', label: '⚠️ Em Atraso' },
  { chave: 'breakeven', href: '/break-even', label: '💸 Break Even' },
] as const

export default function AbasRelatorios({ atual }: { atual: 'mensal' | 'atraso' | 'breakeven' }) {
  return (
    <div className="flex flex-wrap gap-2 mb-5">
      {ABAS.map(a => (
        <Link key={a.chave} href={a.href}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
            a.chave === atual
              ? 'bg-indigo-600 text-white border-indigo-600'
              : 'bg-white text-indigo-700 border-indigo-200 hover:bg-indigo-50'
          }`}>
          {a.label}
        </Link>
      ))}
    </div>
  )
}

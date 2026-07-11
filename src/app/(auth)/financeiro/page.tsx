import Link from 'next/link'

const brl = (n: number) => 'R$ ' + n.toLocaleString('pt-BR', { minimumFractionDigits: 2 })

export default function FinanceiroPage() {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
        <Link href="/" className="hover:text-blue-600">Início</Link>
        <span>/</span>
        <span className="text-gray-900 font-medium">Financeiro</span>
      </div>

      <div className="flex items-center gap-3 mb-6">
        <span className="text-3xl">💰</span>
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Financeiro</h2>
          <p className="text-sm text-gray-500 mt-0.5">Carteiras de investimento — posição de 2026</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Primeira carteira montada para alinharmos o formato */}
        <Link href="/financeiro/ob-holding" className="bg-white border border-gray-200 rounded-xl p-5 hover:border-green-300 hover:shadow-sm transition-all">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900 text-lg">OB Holding</h3>
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">🇧🇷 Brasil</span>
          </div>
          <p className="text-2xl font-bold text-green-700">{brl(332442.59)}</p>
          <p className="text-xs text-gray-400 mt-1">Saldo total · Maio/2026 · XP, Inter e Itaú</p>
        </Link>
      </div>

      <p className="text-sm text-gray-400 mt-6 text-center">
        Estamos montando o formato com a OB Holding. As demais carteiras entram depois que você aprovar o visual.
      </p>
    </div>
  )
}

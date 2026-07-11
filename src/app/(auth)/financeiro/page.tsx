import Link from 'next/link'

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
          <p className="text-sm text-gray-500 mt-0.5">Gestão de recursos financeiros e investimentos</p>
        </div>
      </div>

      <div className="bg-white border border-dashed border-gray-300 rounded-2xl p-12 text-center">
        <p className="text-5xl mb-4">🚧</p>
        <h3 className="text-lg font-semibold text-gray-900">Módulo em construção</h3>
        <p className="text-sm text-gray-500 mt-2 max-w-md mx-auto">
          Este é o ponto de partida do módulo Financeiro. A partir daqui vamos construir a
          gestão de investimentos e recursos financeiros.
        </p>
      </div>
    </div>
  )
}

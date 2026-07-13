import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getSessao } from '@/lib/auth'

export default async function HomePage() {
  const sessao = await getSessao()
  // Quem não é admin só tem Imóveis — vai direto pra lá (não vê o Financeiro).
  if (sessao && !sessao.ehAdmin) redirect('/imoveis')

  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900">Bem-vindo</h2>
        <p className="text-sm text-gray-500 mt-1">Escolha o módulo que deseja acessar</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-2xl mx-auto">
        <Link
          href="/imoveis"
          className="group bg-white border border-gray-200 rounded-2xl p-8 flex flex-col items-center text-center hover:border-blue-400 hover:shadow-md transition-all"
        >
          <div className="w-20 h-20 rounded-2xl bg-blue-50 flex items-center justify-center text-5xl group-hover:bg-blue-100 transition-colors">
            🏢
          </div>
          <h3 className="mt-5 text-xl font-bold text-blue-700">IMÓVEIS</h3>
          <p className="mt-2 text-sm text-gray-500">Gestão de aluguéis, empresas, inquilinos e pagamentos.</p>
        </Link>

        <Link
          href="/financeiro"
          className="group bg-white border border-gray-200 rounded-2xl p-8 flex flex-col items-center text-center hover:border-green-400 hover:shadow-md transition-all"
        >
          <div className="w-20 h-20 rounded-2xl bg-green-50 flex items-center justify-center text-5xl group-hover:bg-green-100 transition-colors">
            💰
          </div>
          <h3 className="mt-5 text-xl font-bold text-green-700">FINANCEIRO</h3>
          <p className="mt-2 text-sm text-gray-500">Gestão de recursos financeiros e investimentos.</p>
        </Link>
      </div>
    </div>
  )
}

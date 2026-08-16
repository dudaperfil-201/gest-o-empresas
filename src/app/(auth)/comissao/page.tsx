import { exigirFinanceiro } from '@/lib/auth'
import { getComissoes } from '@/app/actions/comissoes'
import ComissaoManager from './ComissaoManager'
import Link from 'next/link'

// Comissões do funcionário responsável pela gestão dos imóveis. Só Financeiro.
export default async function ComissaoPage() {
  await exigirFinanceiro()
  const { comissoes, pagamentos } = await getComissoes()

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
        <Link href="/" className="hover:text-blue-600">Início</Link>
        <span>/</span>
        <Link href="/imoveis" className="hover:text-blue-600">Imóveis</Link>
        <span>/</span>
        <span className="text-gray-900 font-medium">Comissão</span>
      </div>

      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900">💰 Comissão do funcionário</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          Comissão de <strong>60%</strong> sobre o 1º aluguel de cada novo contrato. Os pagamentos abatem do saldo a receber.
        </p>
      </div>

      <ComissaoManager comissoes={comissoes} pagamentos={pagamentos} />
    </div>
  )
}

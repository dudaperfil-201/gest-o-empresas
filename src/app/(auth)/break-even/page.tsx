import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getSessao } from '@/lib/auth'
import { getBreakEven } from '@/lib/financeiro/carregar'

const brl = (n: number) => 'R$ ' + n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

// Relatório BREAK EVEN (somente leitura): distribuição de lucros do mês corrente.
// A edição dos valores (Serginho/Eduardo) continua no painel da barra lateral do
// Financeiro — aqui é só consulta, para o acesso "Somente Relatórios" e afins.
export default async function BreakEvenPage() {
  const sessao = await getSessao()
  if (!sessao) redirect('/login')
  // Só quem vê o Financeiro ou é "somente relatórios" acessa este relatório.
  if (!sessao.podeFinanceiro && !sessao.soRelatorios) redirect('/imoveis')

  const be = await getBreakEven()
  const total = be ? be.serginho + be.eduardo + be.rnxRendimento : 0
  const dezPct = total * 0.10
  const porPessoa = dezPct / 3
  const nomeMes = be ? new Date(be.ano, be.mes - 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }) : ''

  return (
    <div className="max-w-2xl mx-auto">
      {!sessao.soRelatorios && (
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
          <Link href="/" className="hover:text-blue-600">Início</Link>
          <span>/</span>
          <span className="text-gray-900 font-medium">Break Even</span>
        </div>
      )}

      <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">💸 Break Even</h2>
          <p className="text-sm text-gray-500 capitalize mt-0.5">{nomeMes || 'Sem dados ainda'}</p>
        </div>
        <a
          href="/api/break-even/export"
          className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
        >
          📥 Exportar Excel
        </a>
      </div>

      {!be ? (
        <div className="bg-white border border-dashed border-gray-300 rounded-xl p-10 text-center">
          <p className="text-gray-500">Ainda não há dados de rendimento para calcular o Break Even.</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Itaú Serginho</span>
            <span className="text-sm font-semibold text-gray-800">{brl(be.serginho)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Itaú Eduardo</span>
            <span className="text-sm font-semibold text-gray-800">{brl(be.eduardo)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">RNX <span className="text-purple-500 text-xs">(auto)</span></span>
            <span className="text-sm font-semibold text-gray-800">{brl(be.rnxRendimento)}</span>
          </div>

          <div className="pt-3 mt-1 border-t border-gray-100 space-y-2">
            <div className="flex items-center justify-between text-gray-500">
              <span className="text-sm">Total rendido</span>
              <span className="font-semibold text-gray-800">{brl(total)}</span>
            </div>
            <div className="flex items-center justify-between text-gray-500">
              <span className="text-sm">10%</span>
              <span className="font-semibold text-gray-800">{brl(dezPct)}</span>
            </div>
            <div className="flex items-center justify-between bg-purple-50 rounded-lg px-3 py-3 mt-1">
              <span className="text-sm font-semibold text-purple-700">Cada um (÷3)</span>
              <span className="text-lg font-bold text-purple-700">{brl(porPessoa)}</span>
            </div>
          </div>
        </div>
      )}

      <p className="text-xs text-gray-400 mt-4">
        Valores do mês corrente. RNX é calculado automaticamente pela diferença dos dois últimos meses de rendimento.
      </p>
    </div>
  )
}

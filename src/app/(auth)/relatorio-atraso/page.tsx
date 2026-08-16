import { createClient } from '@/lib/supabase/server'
import { carregarAtrasos } from '@/lib/atrasos'
import { getSessao } from '@/lib/auth'
import Link from 'next/link'

const brl = (n: number) => 'R$ ' + (n ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })
const soFone = (t: string | null) => (t ?? '').replace(/\D/g, '')

// Relatório de COBRANÇA: todos os aluguéis vencidos e ainda não pagos, de todas as
// empresas, num só lugar.
export default async function RelatorioAtrasoPage() {
  const supabase = await createClient()
  const sessao = await getSessao()
  const { empresas, totalItens, totalAberto, totalAtual, desde } = await carregarAtrasos(supabase)
  const hoje = new Date().toLocaleDateString('pt-BR')

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
        {!sessao?.soRelatorios && (
          <>
            <Link href="/" className="hover:text-blue-600">Início</Link>
            <span>/</span>
            <Link href="/imoveis" className="hover:text-blue-600">Imóveis</Link>
            <span>/</span>
          </>
        )}
        <span className="text-gray-900 font-medium">Em Atraso</span>
      </div>

      <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">⚠️ Aluguéis em Atraso</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Vencidos e ainda não pagos, de todas as empresas · posição em {hoje}
          </p>
        </div>
        <a
          href="/api/relatorio-atraso/export"
          className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
        >
          📥 Exportar Excel
        </a>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
          <p className="text-xs text-gray-500 mb-1">Aluguéis em atraso</p>
          <p className="text-xl font-bold text-gray-900">{totalItens}</p>
        </div>
        <div className="bg-white border border-red-200 rounded-xl p-4 text-center bg-red-50">
          <p className="text-xs text-red-600 mb-1">Total em aberto</p>
          <p className="text-xl font-bold text-red-700">{brl(totalAberto)}</p>
        </div>
        <div className="bg-white border border-amber-200 rounded-xl p-4 text-center bg-amber-50">
          <p className="text-xs text-amber-700 mb-1">Atualizado (c/ juros)</p>
          <p className="text-xl font-bold text-amber-700">{brl(totalAtual)}</p>
        </div>
      </div>

      {totalItens === 0 ? (
        <div className="bg-green-50 border border-green-200 rounded-xl p-8 text-center">
          <p className="text-green-700 font-semibold">🎉 Nenhum aluguel em atraso!</p>
          <p className="text-sm text-green-600 mt-1">Todos os aluguéis vencidos estão pagos.</p>
        </div>
      ) : (
        empresas.map(empresa => (
          <div key={empresa.id} className="bg-white border border-gray-200 rounded-xl mb-4 overflow-hidden">
            <div className="px-5 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">{empresa.nome}</h3>
              <span className="text-xs text-gray-500">{empresa.itens.length} em atraso · {brl(empresa.subtotal)}</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-gray-500 border-b border-gray-100">
                    <th className="text-left px-4 py-2 font-medium">Imóvel</th>
                    <th className="text-left px-4 py-2 font-medium">Inquilino</th>
                    <th className="text-left px-4 py-2 font-medium">Contato</th>
                    <th className="text-center px-4 py-2 font-medium">Mês</th>
                    <th className="text-center px-4 py-2 font-medium">Venceu em</th>
                    <th className="text-center px-4 py-2 font-medium">Atraso</th>
                    <th className="text-right px-4 py-2 font-medium">Aluguel</th>
                    <th className="text-right px-4 py-2 font-medium">Atualizado</th>
                  </tr>
                </thead>
                <tbody>
                  {empresa.itens.map((it, i) => (
                    <tr key={`${it.imovelId}-${it.mes}-${it.ano}-${i}`} className="border-b border-gray-50 last:border-0">
                      <td className="px-4 py-3 text-gray-900 align-top">{it.endereco}</td>
                      <td className="px-4 py-3 text-gray-600 align-top">{it.inquilino}</td>
                      <td className="px-4 py-3 align-top whitespace-nowrap">
                        {it.telefone ? (
                          <a href={`https://wa.me/55${soFone(it.telefone)}`} target="_blank" rel="noopener noreferrer"
                            className="text-green-600 hover:text-green-800 font-medium">{it.telefone}</a>
                        ) : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-3 text-center align-top whitespace-nowrap capitalize">{it.mesRef}</td>
                      <td className="px-4 py-3 text-center align-top whitespace-nowrap text-gray-500">
                        {new Date(it.venceEm + 'T12:00:00').toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-4 py-3 text-center align-top whitespace-nowrap">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                          it.dias > 60 ? 'bg-red-100 text-red-700' : it.dias > 30 ? 'bg-amber-100 text-amber-700' : 'bg-yellow-100 text-yellow-700'
                        }`}>{it.dias} dias</span>
                      </td>
                      <td className="px-4 py-3 text-right align-top whitespace-nowrap text-gray-700">{brl(it.valor)}</td>
                      <td className="px-4 py-3 text-right align-top whitespace-nowrap font-medium text-amber-700">{brl(it.valorAtual)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-gray-200 bg-gray-50 font-semibold text-gray-900">
                    <td className="px-4 py-3" colSpan={6}>Subtotal {empresa.nome}</td>
                    <td className="px-4 py-3 text-right text-red-700">{brl(empresa.subtotal)}</td>
                    <td className="px-4 py-3 text-right text-amber-700">{brl(empresa.subtotalAtual)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        ))
      )}

      <p className="text-xs text-gray-400 mt-4">
        Considera aluguéis a partir de {desde} e da data de início de cada inquilino. <strong>Junho/2026 é desconsiderado</strong> (primeiro mês de uso, com registros incompletos).
        O mês corrente <strong>não</strong> é considerado (ainda está no prazo de pagamento). Valor atualizado = aluguel + juros estimado (juros/mês do inquilino × meses de atraso).
      </p>
    </div>
  )
}

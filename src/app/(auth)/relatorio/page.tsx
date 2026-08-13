import { createClient } from '@/lib/supabase/server'
import { carregarRelatorio } from '@/lib/relatorio'
import Link from 'next/link'

export default async function RelatorioPage({ searchParams }: { searchParams: Promise<{ mes?: string; ano?: string }> }) {
  const supabase = await createClient()

  // Mês exibido: vem da URL (?mes=&ano=) ou, se não houver, o mês atual.
  const sp = await searchParams
  const agora = new Date()
  const mesAtual = sp.mes ? parseInt(sp.mes, 10) : agora.getMonth() + 1
  const anoAtual = sp.ano ? parseInt(sp.ano, 10) : agora.getFullYear()

  // Mês anterior / próximo para as setas de navegação
  const mesAnterior = mesAtual === 1 ? 12 : mesAtual - 1
  const anoAnterior = mesAtual === 1 ? anoAtual - 1 : anoAtual
  const mesProximo = mesAtual === 12 ? 1 : mesAtual + 1
  const anoProximo = mesAtual === 12 ? anoAtual + 1 : anoAtual

  const { resultado, totalEsperado, totalRecebido, totalPendente } = await carregarRelatorio(supabase, mesAtual, anoAtual)

  const nomeMes = new Date(anoAtual, mesAtual - 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
  const mesAnoFormatado = `${new Date(anoAtual, mesAtual - 1).toLocaleDateString('pt-BR', { month: 'long' }).toUpperCase()}/${anoAtual}`

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
        <Link href="/" className="hover:text-blue-600">Início</Link>
        <span>/</span>
        <Link href="/imoveis" className="hover:text-blue-600">Imóveis</Link>
        <span>/</span>
        <span className="text-gray-900 font-medium">Relatório</span>
      </div>

      <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Relatório Mensal</h2>
          <p className="text-sm text-gray-500 capitalize mt-0.5">{nomeMes}</p>
        </div>
        <a
          href={`/api/relatorio/export?mes=${mesAtual}&ano=${anoAtual}`}
          className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
        >
          📥 Exportar Excel
        </a>
      </div>

      {/* Navegação de meses */}
      <div className="bg-gray-100 rounded-xl p-3 mb-6 flex items-center justify-center gap-4">
        <Link href={`/relatorio?mes=${mesAnterior}&ano=${anoAnterior}`} aria-label="Mês anterior"
          className="w-8 h-8 flex items-center justify-center rounded-full bg-white border border-gray-200 hover:bg-gray-50 text-xl leading-none">
          ‹
        </Link>
        <span className="min-w-[10rem] text-center font-semibold text-gray-800">{mesAnoFormatado}</span>
        <Link href={`/relatorio?mes=${mesProximo}&ano=${anoProximo}`} aria-label="Próximo mês"
          className="w-8 h-8 flex items-center justify-center rounded-full bg-white border border-gray-200 hover:bg-gray-50 text-xl leading-none">
          ›
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
          <p className="text-xs text-gray-500 mb-1">Total esperado</p>
          <p className="text-xl font-bold text-gray-900">R$ {totalEsperado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="bg-white border border-green-200 rounded-xl p-4 text-center bg-green-50">
          <p className="text-xs text-green-600 mb-1">Total recebido</p>
          <p className="text-xl font-bold text-green-700">R$ {totalRecebido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="bg-white border border-yellow-200 rounded-xl p-4 text-center bg-yellow-50">
          <p className="text-xs text-yellow-600 mb-1">Pendente / a receber</p>
          <p className="text-xl font-bold text-yellow-700">R$ {totalPendente.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
        </div>
      </div>

      {resultado.map(empresa => (
        <div key={empresa.id} className="bg-white border border-gray-200 rounded-xl mb-4 overflow-hidden">
          <div className="px-5 py-3 bg-gray-50 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900">{empresa.nome}</h3>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 border-b border-gray-100">
                <th className="text-left px-5 py-2 font-medium">Imóvel</th>
                <th className="text-left px-5 py-2 font-medium">Inquilino</th>
                <th className="text-right px-5 py-2 font-medium">Valor</th>
                <th className="text-right px-5 py-2 font-medium">Recebido</th>
                <th className="text-right px-5 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {empresa.imoveis.map(imovel => {
                const statusColor = !imovel.pag ? 'bg-gray-100 text-gray-500' : imovel.pag.status === 'pago' ? 'bg-green-100 text-green-700' : imovel.pag.status === 'atrasado' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                const statusLabel = !imovel.pag ? 'Sem registro' : imovel.pag.status === 'pago' ? 'Pago' : imovel.pag.status === 'atrasado' ? 'Atrasado' : 'Pendente'
                return (
                  <tr key={imovel.id} className="border-b border-gray-50 last:border-0">
                    <td className="px-5 py-3 text-gray-900 align-top">{imovel.endereco}</td>
                    <td className="px-5 py-3 text-gray-600 align-top">{imovel.inquilino?.nome ?? '—'}</td>
                    <td className="px-5 py-3 text-right text-gray-700 align-top whitespace-nowrap">R$ {(imovel.valor_aluguel ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                    <td className="px-5 py-3 text-right text-gray-700 align-top whitespace-nowrap">
                      {imovel.pag?.valor_pago ? `R$ ${imovel.pag.valor_pago.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '—'}
                      {imovel.pag?.refs && imovel.pag.refs.length > 0 && (
                        <div className="text-xs text-amber-600 font-medium">ref. {imovel.pag.refs.join(', ')}</div>
                      )}
                      {imovel.extras > 0 && (
                        <div className="text-xs text-indigo-600 font-medium">+ Extras: R$ {imovel.extras.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                      )}
                      {imovel.descontos > 0 && (
                        <div className="text-xs text-rose-600 font-medium">− Descontos: R$ {imovel.descontos.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right align-top">
                      <span className={`inline-block whitespace-nowrap text-xs font-medium px-2 py-0.5 rounded-full ${statusColor}`}>{statusLabel}</span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-gray-200 bg-gray-50 font-semibold text-gray-900">
                <td className="px-5 py-3" colSpan={2}>Total</td>
                <td className="px-5 py-3 text-right">R$ {empresa.somaValor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                <td className="px-5 py-3 text-right text-green-700">R$ {empresa.somaRecebido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                <td className="px-5 py-3"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      ))}
    </div>
  )
}

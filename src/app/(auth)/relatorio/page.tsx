import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function RelatorioPage() {
  const supabase = await createClient()

  const mesAtual = new Date().getMonth() + 1
  const anoAtual = new Date().getFullYear()

  const { data: empresas } = await supabase.from('empresas').select('id, nome').order('nome')

  const resultado = await Promise.all((empresas ?? []).map(async empresa => {
    const { data: imoveis } = await supabase
      .from('imoveis')
      .select('id, endereco, valor_aluguel, inquilinos(nome)')
      .eq('empresa_id', empresa.id)
      .eq('ativo', true)
      .order('endereco')

    const ids = (imoveis ?? []).map(i => i.id)
    const [{ data: pagamentos }, { data: extrasRaw }] = ids.length > 0 ? await Promise.all([
      supabase.from('pagamentos').select('imovel_id, status, valor_original, valor_pago').in('imovel_id', ids).eq('mes', mesAtual).eq('ano', anoAtual),
      supabase.from('extras_itens').select('imovel_id, valor').in('imovel_id', ids).eq('mes', mesAtual).eq('ano', anoAtual),
    ]) : [{ data: [] }, { data: [] }]

    const pagMap = Object.fromEntries((pagamentos ?? []).map(p => [p.imovel_id, p]))
    const extrasSum: Record<string, number> = {}
    for (const e of extrasRaw ?? []) extrasSum[e.imovel_id] = (extrasSum[e.imovel_id] ?? 0) + (e.valor ?? 0)

    return {
      ...empresa,
      imoveis: (imoveis ?? []).map(imovel => {
        const pag = pagMap[imovel.id]
        const inquilino = Array.isArray(imovel.inquilinos) ? imovel.inquilinos[0] : imovel.inquilinos
        return { ...imovel, pag, inquilino, extras: extrasSum[imovel.id] ?? 0 }
      })
    }
  }))

  const nomeMes = new Date(anoAtual, mesAtual - 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })

  const totalEsperado = resultado.flatMap(e => e.imoveis).reduce((s, i) => s + (i.valor_aluguel ?? 0), 0)
  // Recebido = aluguéis pagos (pago/atrasado) + todos os extras do mês.
  const totalRecebidoAluguel = resultado.flatMap(e => e.imoveis).filter(i => i.pag?.status === 'pago' || i.pag?.status === 'atrasado').reduce((s, i) => s + (i.pag?.valor_pago ?? 0), 0)
  const totalExtras = resultado.flatMap(e => e.imoveis).reduce((s, i) => s + (i.extras ?? 0), 0)
  const totalRecebido = totalRecebidoAluguel + totalExtras
  const totalPendente = totalEsperado - resultado.flatMap(e => e.imoveis).filter(i => i.pag?.status === 'pago' || i.pag?.status === 'atrasado').reduce((s, i) => s + (i.valor_aluguel ?? 0), 0)

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
        <Link href="/" className="hover:text-blue-600">Início</Link>
        <span>/</span>
        <Link href="/imoveis" className="hover:text-blue-600">Imóveis</Link>
        <span>/</span>
        <span className="text-gray-900 font-medium">Relatório</span>
      </div>

      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Relatório Mensal</h2>
        <p className="text-sm text-gray-500 capitalize mt-0.5">{nomeMes}</p>
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
                    <td className="px-5 py-3 text-gray-900">{imovel.endereco}</td>
                    <td className="px-5 py-3 text-gray-600">{imovel.inquilino?.nome ?? '—'}</td>
                    <td className="px-5 py-3 text-right text-gray-700">R$ {(imovel.valor_aluguel ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                    <td className="px-5 py-3 text-right text-gray-700">{imovel.pag?.valor_pago ? `R$ ${imovel.pag.valor_pago.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '—'}</td>
                    <td className="px-5 py-3 text-right">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColor}`}>{statusLabel}</span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  )
}

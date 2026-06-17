import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function HomePage() {
  const supabase = await createClient()

  const { data: empresas } = await supabase
    .from('empresas')
    .select('id, nome')
    .order('nome')

  const mesAtual = new Date().getMonth() + 1
  const anoAtual = new Date().getFullYear()

  const resumos = await Promise.all((empresas ?? []).map(async empresa => {
    const { data: imoveis } = await supabase
      .from('imoveis')
      .select('id')
      .eq('empresa_id', empresa.id)
      .eq('ativo', true)

    const ids = (imoveis ?? []).map(i => i.id)
    if (ids.length === 0) return { ...empresa, total: 0, pagos: 0, pendentes: 0, atrasados: 0, totalValor: 0, recebido: 0 }

    const { data: pagamentos } = await supabase
      .from('pagamentos')
      .select('status, valor_original, valor_pago')
      .in('imovel_id', ids)
      .eq('mes', mesAtual)
      .eq('ano', anoAtual)

    const pagos = (pagamentos ?? []).filter(p => p.status === 'pago').length
    const atrasados = (pagamentos ?? []).filter(p => p.status === 'atrasado').length
    const pendentes = (pagamentos ?? []).filter(p => p.status === 'pendente').length
    const totalValor = (pagamentos ?? []).reduce((s, p) => s + (p.valor_original ?? 0), 0)
    const recebido = (pagamentos ?? []).filter(p => p.status === 'pago').reduce((s, p) => s + (p.valor_pago ?? 0), 0)

    return { ...empresa, total: ids.length, pagos, pendentes, atrasados, totalValor, recebido }
  }))

  const nomeMes = new Date(anoAtual, mesAtual - 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Empresas</h2>
          <p className="text-sm text-gray-500 capitalize mt-0.5">Resumo de {nomeMes}</p>
        </div>
        <Link href="/empresas/nova" className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
          + Nova empresa
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {(resumos ?? []).map(e => (
          <Link key={e.id} href={`/empresas/${e.id}`} className="bg-white border border-gray-200 rounded-xl p-5 hover:border-blue-300 hover:shadow-sm transition-all">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900 text-lg">{e.nome}</h3>
              <span className="text-xs text-gray-400">{e.total} imóveis</span>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="text-center bg-green-50 rounded-lg py-2">
                <p className="text-xl font-bold text-green-600">{e.pagos}</p>
                <p className="text-xs text-green-600">Pagos</p>
              </div>
              <div className="text-center bg-yellow-50 rounded-lg py-2">
                <p className="text-xl font-bold text-yellow-600">{e.pendentes}</p>
                <p className="text-xs text-yellow-600">Pendentes</p>
              </div>
              <div className="text-center bg-red-50 rounded-lg py-2">
                <p className="text-xl font-bold text-red-600">{e.atrasados}</p>
                <p className="text-xs text-red-600">Atrasados</p>
              </div>
            </div>

            <div className="flex justify-between text-sm border-t border-gray-100 pt-3">
              <span className="text-gray-500">Recebido</span>
              <span className="font-medium text-green-600">
                R$ {e.recebido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex justify-between text-sm mt-1">
              <span className="text-gray-500">Total esperado</span>
              <span className="font-medium text-gray-700">
                R$ {e.totalValor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}

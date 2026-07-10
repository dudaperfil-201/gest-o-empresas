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
      .select('id, valor_aluguel, inquilinos(id)')
      .eq('empresa_id', empresa.id)
      .eq('ativo', true)

    const temInquilino = (im: { inquilinos: unknown }) => {
      const inq = Array.isArray(im.inquilinos) ? im.inquilinos : (im.inquilinos ? [im.inquilinos] : [])
      return inq.length > 0
    }

    // Locado = imóvel com inquilino; Disponível = sem inquilino
    const locados = (imoveis ?? []).filter(temInquilino).length
    const disponiveis = (imoveis?.length ?? 0) - locados

    // Potencial = soma dos aluguéis dos imóveis locados (o que entraria se todos pagassem)
    const potencial = (imoveis ?? []).reduce((s, im) => temInquilino(im) ? s + (im.valor_aluguel ?? 0) : s, 0)

    const ids = (imoveis ?? []).map(i => i.id)
    if (ids.length === 0) return { ...empresa, total: 0, locados: 0, disponiveis: 0, potencial: 0, pagamentos: 0 }

    // PAGAMENTOS = soma de tudo que foi pago no mês corrente (mes/ano atuais).
    const { data: pagamentos } = await supabase
      .from('pagamentos')
      .select('valor_pago')
      .in('imovel_id', ids)
      .eq('mes', mesAtual)
      .eq('ano', anoAtual)

    const totalPago = (pagamentos ?? []).reduce((s, p) => s + (p.valor_pago ?? 0), 0)
    return { ...empresa, total: ids.length, locados, disponiveis, potencial, pagamentos: totalPago }
  }))

  const nomeMes = new Date(anoAtual, mesAtual - 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
  const mesAnoFormatado = `${new Date(anoAtual, mesAtual - 1).toLocaleDateString('pt-BR', { month: 'long' }).toUpperCase()}/${anoAtual}`

  // TOTAL = soma dos pagamentos de TODAS as empresas no mês corrente
  const totalGeral = resumos.reduce((s, e) => s + e.pagamentos, 0)

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

      <div className="bg-green-600 text-white rounded-xl p-5 mb-4">
        <p className="text-center text-2xl font-bold tracking-wide mb-3">{mesAnoFormatado}</p>
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium uppercase tracking-wide text-green-100">Total recebido</p>
          <p className="text-3xl font-bold">
            R$ {totalGeral.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {(resumos ?? []).map(e => (
          <Link key={e.id} href={`/empresas/${e.id}`} className="bg-white border border-gray-200 rounded-xl p-5 hover:border-blue-300 hover:shadow-sm transition-all">
            <h3 className="font-semibold text-gray-900 text-lg mb-4">{e.nome}</h3>

            <div className="grid grid-cols-2 gap-3">
              <div className="text-center bg-blue-50 rounded-lg py-4 px-2">
                <p className="text-2xl font-bold text-blue-600">{e.total}</p>
                <p className="text-xs text-blue-600 font-medium mt-0.5">IMÓVEIS</p>
                <div className="mt-2 pt-2 border-t border-blue-100 flex flex-wrap justify-center gap-x-3 gap-y-0.5 text-sm">
                  <span className="text-green-700">Locados: <b>{e.locados}</b></span>
                  <span className="text-gray-500">Disponíveis: <b>{e.disponiveis}</b></span>
                </div>
              </div>
              <div className="text-center bg-green-50 rounded-lg py-4 px-2">
                <p className="text-xl font-bold text-green-600">
                  R$ {e.pagamentos.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-green-600 font-medium mt-0.5">PAGAMENTOS</p>
                <div className="mt-2 pt-2 border-t border-green-100 text-sm text-gray-500">
                  Potencial: <b className="text-green-700">R$ {e.potencial.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</b>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}

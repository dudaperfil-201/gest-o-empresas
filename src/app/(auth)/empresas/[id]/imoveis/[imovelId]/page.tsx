import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import InquilinoForm from './InquilinoForm'

export default async function ImovelPage({ params }: { params: Promise<{ id: string; imovelId: string }> }) {
  const { id, imovelId } = await params
  const supabase = await createClient()

  const { data: empresa } = await supabase.from('empresas').select('nome').eq('id', id).single()
  const { data: imovel } = await supabase.from('imoveis').select('*').eq('id', imovelId).single()
  if (!imovel) notFound()

  const { data: inquilino } = await supabase.from('inquilinos').select('*').eq('imovel_id', imovelId).single()

  const { data: pagamentos } = await supabase
    .from('pagamentos')
    .select('*')
    .eq('imovel_id', imovelId)
    .order('ano', { ascending: false })
    .order('mes', { ascending: false })
    .limit(24)

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
        <Link href="/imoveis" className="hover:text-blue-600">Empresas</Link>
        <span>/</span>
        <Link href={`/empresas/${id}`} className="hover:text-blue-600">{empresa?.nome}</Link>
        <span>/</span>
        <span className="text-gray-900 font-medium">{imovel.endereco}</span>
      </div>

      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900">{imovel.endereco}</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          Aluguel: R$ {(imovel.valor_aluguel ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
        </p>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-4">
        <h3 className="font-medium text-gray-900 mb-4">Cadastro do imóvel</h3>
        <InquilinoForm imovelId={imovelId} empresaId={id} inquilino={inquilino} valorAluguel={imovel.valor_aluguel ?? 0} enderecoImovel={imovel.endereco} diaVencimento={imovel.dia_vencimento ?? null} />
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h3 className="font-medium text-gray-900 mb-4">Histórico de pagamentos</h3>
        {(pagamentos ?? []).length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">Nenhum pagamento registrado.</p>
        ) : (
          <div className="space-y-2">
            {(pagamentos ?? []).map(p => {
              const statusColor = p.status === 'pago' ? 'bg-green-100 text-green-700' : p.status === 'atrasado' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
              const nomeMes = new Date(p.ano, p.mes - 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
              return (
                <div key={p.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-900 capitalize">{nomeMes}</p>
                    {p.data_pagamento && (
                      <p className="text-xs text-gray-400">
                        Pago em {new Date(p.data_pagamento + 'T12:00:00').toLocaleDateString('pt-BR')}
                      </p>
                    )}
                    {(p.valor_extras ?? 0) > 0 && (
                      <p className="text-xs text-indigo-600 font-medium">
                        + Extras: R$ {(p.valor_extras ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        {p.descricao_extras ? ` · ${p.descricao_extras}` : ''}
                      </p>
                    )}
                    {p.observacao && <p className="text-xs text-gray-400">{p.observacao}</p>}
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">
                        R$ {(p.valor_pago ?? p.valor_original ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                      {p.valor_pago && p.valor_original && p.valor_pago > p.valor_original && (
                        <p className="text-xs text-red-500">
                          +R$ {(p.valor_pago - p.valor_original).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} juros
                        </p>
                      )}
                    </div>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColor}`}>
                      {p.status === 'pago' ? 'Pago' : p.status === 'atrasado' ? 'Atrasado' : 'Pendente'}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

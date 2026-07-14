import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import NovoImovelForm from './NovoImovelForm'
import ImovelCard from './ImovelCard'

export default async function EmpresaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: empresa } = await supabase.from('empresas').select('*').eq('id', id).single()
  if (!empresa) notFound()

  const { data: imoveisRaw } = await supabase
    .from('imoveis')
    .select('id, endereco, valor_aluguel, ativo, inquilinos(nome)')
    .eq('empresa_id', id)

  // Ordenação numérica natural: SALA-1, SALA-2, ... SALA-10 (e não SALA-1, SALA-10, SALA-2)
  const imoveis = [...(imoveisRaw ?? [])].sort((a, b) =>
    a.endereco.localeCompare(b.endereco, 'pt-BR', { numeric: true, sensitivity: 'base' })
  )

  const mesAtual = new Date().getMonth() + 1
  const anoAtual = new Date().getFullYear()
  const ids = (imoveis ?? []).map(i => i.id)

  const { data: pagamentos } = ids.length > 0 ? await supabase
    .from('pagamentos')
    .select('imovel_id, status, valor_original, valor_pago, valor_extras, descricao_extras')
    .in('imovel_id', ids)
    .eq('mes', mesAtual)
    .eq('ano', anoAtual) : { data: [] }

  const pagMap = Object.fromEntries((pagamentos ?? []).map(p => [p.imovel_id, p]))

  const nomeMes = new Date(anoAtual, mesAtual - 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
        <Link href="/imoveis" className="hover:text-blue-600">Empresas</Link>
        <span>/</span>
        <span className="text-gray-900 font-medium">{empresa.nome}</span>
      </div>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">{empresa.nome}</h2>
          <p className="text-sm text-gray-500 capitalize mt-0.5">Imóveis — {nomeMes}</p>
        </div>
        <NovoImovelForm empresaId={id} />
      </div>

      <div className="space-y-3 mb-8">
        {(imoveis ?? []).map(imovel => {
          const pag = pagMap[imovel.id]
          // Disponível = sem dado no cadastro (aluguel zerado e sem inquilino). Mesma regra do dashboard.
          const inq = Array.isArray(imovel.inquilinos) ? imovel.inquilinos : (imovel.inquilinos ? [imovel.inquilinos] : [])
          const disponivel = inq.length === 0 && (imovel.valor_aluguel ?? 0) <= 0
          return (
            <ImovelCard
              key={imovel.id}
              imovel={imovel}
              empresaId={id}
              pago={pag?.status === 'pago'}
              atrasado={pag?.status === 'atrasado'}
              disponivel={disponivel}
              valorExtras={pag?.valor_extras ?? null}
              descricaoExtras={pag?.descricao_extras ?? null}
            />
          )
        })}

        {(imoveis ?? []).length === 0 && (
          <div className="text-center py-12 text-gray-400 bg-white rounded-xl border border-dashed border-gray-200">
            Nenhum imóvel cadastrado ainda.
          </div>
        )}
      </div>
    </div>
  )
}

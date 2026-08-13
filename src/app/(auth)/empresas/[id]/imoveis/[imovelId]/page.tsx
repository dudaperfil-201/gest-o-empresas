import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import InquilinoForm from './InquilinoForm'
import DocumentosInquilino from './DocumentosInquilino'
import HistoricoPagamentos from './HistoricoPagamentos'

export default async function ImovelPage({ params }: { params: Promise<{ id: string; imovelId: string }> }) {
  const { id, imovelId } = await params
  const supabase = await createClient()

  const { data: empresa } = await supabase.from('empresas').select('nome').eq('id', id).single()
  const { data: imovel } = await supabase.from('imoveis').select('*').eq('id', imovelId).single()
  if (!imovel) notFound()

  // Pega o inquilino MAIS RECENTE do imóvel, de forma tolerante: `.single()`
  // dava erro (e retornava null → form vazio) quando havia 0 OU mais de 1 registro.
  const { data: inquilino } = await supabase
    .from('inquilinos')
    .select('*')
    .eq('imovel_id', imovelId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  // Documentos do inquilino (contrato + boletos) para a Área do Inquilino.
  let contratosDocs: { name: string; path: string; url: string | null }[] = []
  let boletosDocs: { name: string; path: string; mes: string; url: string | null }[] = []
  if (inquilino) {
    const admin = createAdminClient()
    const bucket = admin.storage.from('documentos-inquilino')
    const [cRes, bRes] = await Promise.all([
      bucket.list(`${inquilino.id}/contrato`, { limit: 100 }),
      bucket.list(`${inquilino.id}/boletos`, { limit: 200 }),
    ])
    const assinar = async (path: string) => (await bucket.createSignedUrl(path, 3600)).data?.signedUrl ?? null
    contratosDocs = await Promise.all(
      (cRes.data ?? []).filter(a => a.id !== null).map(async a => {
        const path = `${inquilino.id}/contrato/${a.name}`
        return { name: a.name, path, url: await assinar(path) }
      })
    )
    boletosDocs = (await Promise.all(
      (bRes.data ?? []).filter(a => a.id !== null).map(async a => {
        const path = `${inquilino.id}/boletos/${a.name}`
        return { name: a.name, path, mes: a.name.split('__')[0], url: await assinar(path) }
      })
    )).sort((a, b) => a.mes.localeCompare(b.mes)) // ordem de vencimento (mais antigo → mais novo)
  }

  const { data: pagamentos } = await supabase
    .from('pagamentos')
    .select('*')
    .eq('imovel_id', imovelId)
    .order('ano', { ascending: false })
    .order('mes', { ascending: false })
    .limit(24)

  // Extras (energia, condomínio...) do imóvel, agrupados por mês/ano. Inclui id/mes/ano
  // para permitir EDITAR/EXCLUIR cada item no Histórico de pagamentos.
  const { data: extrasRaw } = await supabase
    .from('extras_itens')
    .select('id, ano, mes, descricao, valor')
    .eq('imovel_id', imovelId)
    .order('created_at')

  type ItemHist = { id: string; ano: number; mes: number; descricao: string | null; valor: number }
  const extrasPorMes: Record<string, ItemHist[]> = {}
  for (const e of extrasRaw ?? []) {
    ;(extrasPorMes[`${e.ano}_${e.mes}`] ??= []).push({ id: e.id, ano: e.ano, mes: e.mes, descricao: e.descricao, valor: e.valor })
  }

  // Descontos concedidos ao inquilino, agrupados por mês/ano.
  const { data: descontosRaw } = await supabase
    .from('descontos_itens')
    .select('id, ano, mes, descricao, valor')
    .eq('imovel_id', imovelId)
    .order('created_at')

  const descontosPorMes: Record<string, ItemHist[]> = {}
  for (const d of descontosRaw ?? []) {
    ;(descontosPorMes[`${d.ano}_${d.mes}`] ??= []).push({ id: d.id, ano: d.ano, mes: d.mes, descricao: d.descricao, valor: d.valor })
  }

  return (
    <div className="max-w-4xl mx-auto">
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

      <div className="bg-blue-50/60 border-2 border-blue-300 rounded-xl p-5 mb-4">
        <h3 className="font-medium text-gray-900 mb-4">Cadastro do imóvel</h3>
        <InquilinoForm imovelId={imovelId} empresaId={id} inquilino={inquilino} valorAluguel={imovel.valor_aluguel ?? 0} enderecoImovel={imovel.endereco} diaVencimento={imovel.dia_vencimento ?? null} />
      </div>

      <div className="bg-green-50/60 border-2 border-green-300 rounded-xl p-5 mb-4">
        <h3 className="font-medium text-gray-900 mb-4">Histórico de pagamentos</h3>
        <HistoricoPagamentos
          empresaId={id}
          imovelId={imovelId}
          pagamentos={(pagamentos ?? []).map(p => ({
            id: p.id,
            ano: p.ano,
            mes: p.mes,
            status: p.status,
            valor_original: p.valor_original ?? null,
            valor_pago: p.valor_pago ?? null,
            data_pagamento: p.data_pagamento ?? null,
            observacao: p.observacao ?? null,
            extras: extrasPorMes[`${p.ano}_${p.mes}`] ?? [],
            descontos: descontosPorMes[`${p.ano}_${p.mes}`] ?? [],
          }))}
        />
      </div>

      {inquilino && (
        <div className="bg-amber-50/60 border-2 border-amber-300 rounded-xl p-5">
          <h3 className="font-medium text-gray-900 mb-4">Área do Inquilino — acesso e documentos</h3>
          <DocumentosInquilino
            inquilinoId={inquilino.id}
            empresaId={id}
            imovelId={imovelId}
            inquilinoEmail={inquilino.email ?? null}
            senhaAtual={inquilino.senha_acesso ?? null}
            contratos={contratosDocs}
            boletos={boletosDocs}
          />
        </div>
      )}
    </div>
  )
}

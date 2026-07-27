import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import NovoImovelForm from './NovoImovelForm'
import ImovelCard from './ImovelCard'

export default async function EmpresaPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ mes?: string; ano?: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: empresa } = await supabase.from('empresas').select('*').eq('id', id).single()
  if (!empresa) notFound()

  const { data: imoveisRaw } = await supabase
    .from('imoveis')
    .select('id, endereco, valor_aluguel, ativo, dia_vencimento, inquilinos(nome, data_inicio)')
    .eq('empresa_id', id)

  // Ordenação numérica natural: SALA-1, SALA-2, ... SALA-10 (e não SALA-1, SALA-10, SALA-2)
  const imoveis = [...(imoveisRaw ?? [])].sort((a, b) =>
    a.endereco.localeCompare(b.endereco, 'pt-BR', { numeric: true, sensitivity: 'base' })
  )

  // Mês exibido: vem da URL (?mes=&ano=, herdado do dashboard) ou, se não houver, o
  // mês atual. É por ele que a página mostra pagamentos/extras — permitindo ver o
  // histórico de meses passados dentro do perfil da empresa.
  const sp = await searchParams
  const agora = new Date()
  const mesAtual = sp.mes ? parseInt(sp.mes, 10) : agora.getMonth() + 1
  const anoAtual = sp.ano ? parseInt(sp.ano, 10) : agora.getFullYear()

  // Setas de navegação (mês anterior / próximo)
  const mesAnterior = mesAtual === 1 ? 12 : mesAtual - 1
  const anoAnterior = mesAtual === 1 ? anoAtual - 1 : anoAtual
  const mesProximo = mesAtual === 12 ? 1 : mesAtual + 1
  const anoProximo = mesAtual === 12 ? anoAtual + 1 : anoAtual
  const mesAnoFormatado = `${new Date(anoAtual, mesAtual - 1).toLocaleDateString('pt-BR', { month: 'long' }).toUpperCase()}/${anoAtual}`

  const ids = (imoveis ?? []).map(i => i.id)

  const { data: pagamentos } = ids.length > 0 ? await supabase
    .from('pagamentos')
    .select('imovel_id, status, valor_original, valor_pago')
    .in('imovel_id', ids)
    .eq('mes', mesAtual)
    .eq('ano', anoAtual) : { data: [] }

  const pagMap = Object.fromEntries((pagamentos ?? []).map(p => [p.imovel_id, p]))

  // ── Classificação do inquilino (ótimo / bom / ruim) ──
  // Histórico completo de pagamentos (todos os meses) para calcular atrasos e
  // boletos em aberto.
  const { data: histRaw } = ids.length > 0 ? await supabase
    .from('pagamentos')
    .select('imovel_id, mes, ano, status')
    .in('imovel_id', ids) : { data: [] }

  const histMap: Record<string, { mes: number; ano: number; status: string }[]> = {}
  for (const p of histRaw ?? []) (histMap[p.imovel_id] ??= []).push(p)

  // A reputação do inquilino é sempre relativa ao mês REAL de hoje (não ao mês que
  // está sendo visualizado na tela), então usa `agora`, não o mês selecionado.
  const curKey = agora.getFullYear() * 12 + agora.getMonth() // mês atual real em "chave" contínua

  type Classificacao = 'otimo' | 'bom' | 'ruim'
  // Reputação com base SOMENTE nos meses já FECHADOS. O mês em andamento nunca
  // pesa — o inquilino é "ótimo até o mês fechar", e na virada do mês é reavaliado
  // pela forma como pagou (pago / com atraso / não pagou). Como o mês atual vem da
  // data real, a reavaliação acontece sozinha na troca do mês (sem robô/botão).
  function classificar(imovelId: string): Classificacao {
    const pags = histMap[imovelId] ?? []
    const fechados = pags.filter(p => p.ano * 12 + (p.mes - 1) < curKey)
    const atrasos = fechados.filter(p => p.status === 'atrasado').length
    const quitados = new Set(
      fechados.filter(p => p.status === 'pago' || p.status === 'atrasado').map(p => `${p.ano}-${p.mes}`)
    )
    // Primeiro mês com registro (nunca antes do sistema existir).
    let inicio: number | null = null
    for (const p of pags) {
      const k = p.ano * 12 + (p.mes - 1)
      if (inicio === null || k < inicio) inicio = k
    }
    // Boleto que ficou em aberto = mês JÁ FECHADO sem nenhum pagamento.
    let temAberto = false
    if (inicio !== null) {
      for (let k = inicio; k < curKey; k++) {
        const ano = Math.floor(k / 12), mes = (k % 12) + 1
        if (!quitados.has(`${ano}-${mes}`)) { temAberto = true; break }
      }
    }
    if (atrasos > 2 || temAberto) return 'ruim'
    if (atrasos >= 1) return 'bom'
    return 'otimo'
  }

  // Lista de extras (energia, condomínio...) do mês, agrupada por imóvel.
  const { data: extrasRaw } = ids.length > 0 ? await supabase
    .from('extras_itens')
    .select('id, imovel_id, descricao, valor')
    .in('imovel_id', ids)
    .eq('mes', mesAtual)
    .eq('ano', anoAtual)
    .order('created_at') : { data: [] }

  const extrasMap: Record<string, { id: string; descricao: string | null; valor: number }[]> = {}
  for (const e of extrasRaw ?? []) {
    ;(extrasMap[e.imovel_id] ??= []).push({ id: e.id, descricao: e.descricao, valor: e.valor })
  }

  // Lista de descontos concedidos no mês, agrupada por imóvel.
  const { data: descontosRaw } = ids.length > 0 ? await supabase
    .from('descontos_itens')
    .select('id, imovel_id, descricao, valor')
    .in('imovel_id', ids)
    .eq('mes', mesAtual)
    .eq('ano', anoAtual)
    .order('created_at') : { data: [] }

  const descontosMap: Record<string, { id: string; descricao: string | null; valor: number }[]> = {}
  for (const d of descontosRaw ?? []) {
    ;(descontosMap[d.imovel_id] ??= []).push({ id: d.id, descricao: d.descricao, valor: d.valor })
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
        <Link href={`/imoveis?mes=${mesAtual}&ano=${anoAtual}`} className="hover:text-blue-600">Empresas</Link>
        <span>/</span>
        <span className="text-gray-900 font-medium">{empresa.nome}</span>
      </div>

      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">{empresa.nome}</h2>
          <p className="text-sm text-gray-500 mt-0.5">Imóveis</p>
        </div>
        <NovoImovelForm empresaId={id} />
      </div>

      {/* Navegação de meses — o mês selecionado governa os pagamentos/extras exibidos,
          permitindo consultar o histórico de meses passados. */}
      <div className="bg-green-600 text-white rounded-xl px-5 py-3 mb-6 flex items-center justify-center gap-4 sm:gap-6">
        <Link href={`/empresas/${id}?mes=${mesAnterior}&ano=${anoAnterior}`} aria-label="Mês anterior"
          className="w-8 h-8 flex items-center justify-center rounded-full bg-green-700 hover:bg-green-800 transition-colors text-2xl leading-none">
          ‹
        </Link>
        <span className="min-w-[9rem] text-center text-lg font-bold tracking-wide">{mesAnoFormatado}</span>
        <Link href={`/empresas/${id}?mes=${mesProximo}&ano=${anoProximo}`} aria-label="Próximo mês"
          className="w-8 h-8 flex items-center justify-center rounded-full bg-green-700 hover:bg-green-800 transition-colors text-2xl leading-none">
          ›
        </Link>
      </div>

      <div className="space-y-3 mb-8">
        {(imoveis ?? []).map(imovel => {
          const pag = pagMap[imovel.id]
          // Disponível = sem dado no cadastro (aluguel zerado e sem inquilino). Mesma regra do dashboard.
          const inq = Array.isArray(imovel.inquilinos) ? imovel.inquilinos : (imovel.inquilinos ? [imovel.inquilinos] : [])
          const disponivel = inq.length === 0 && (imovel.valor_aluguel ?? 0) <= 0
          const temInquilino = inq.length > 0
          return (
            <ImovelCard
              key={imovel.id}
              imovel={imovel}
              empresaId={id}
              mes={mesAtual}
              ano={anoAtual}
              pago={pag?.status === 'pago'}
              atrasado={pag?.status === 'atrasado'}
              disponivel={disponivel}
              extras={extrasMap[imovel.id] ?? []}
              descontos={descontosMap[imovel.id] ?? []}
              classificacao={temInquilino ? classificar(imovel.id) : null}
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

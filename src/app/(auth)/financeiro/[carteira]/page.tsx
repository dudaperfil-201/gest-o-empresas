import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  saldoConta, saldoCarteira, saldoCarteiraUsd, brl, brlCompacto, fmtMoeda,
  contaTemMes, carteiraParcial, bancosPendentes, contaRelevanteNoMes, cambioUsdCarteira,
} from '@/lib/financeiro/dados'
import { carregarFinanceiro, proximoMes } from '@/lib/financeiro/carregar'
import { exigirFinanceiro } from '@/lib/auth'
import CarteiraContas from './CarteiraContas'

export default async function CarteiraPage({ params, searchParams }: {
  params: Promise<{ carteira: string }>
  searchParams: Promise<{ mes?: string }>
}) {
  await exigirFinanceiro()
  const { carteira: slug } = await params
  const { carteiras, meses } = await carregarFinanceiro()
  const carteira = carteiras.find(c => c.slug === slug)
  if (!carteira) notFound()

  const sp = await searchParams
  // Navega um mês além do último com dados (mês novo aparece zerado/aguardando).
  const navMeses = [...meses, proximoMes(meses)]
  const ultimoReal = meses.length - 1
  const ultimo = navMeses.length - 1
  let i = sp.mes ? parseInt(sp.mes, 10) - 1 : ultimoReal
  if (isNaN(i) || i < 0) i = 0
  if (i > ultimo) i = ultimo

  const total = saldoCarteira(carteira, i)
  // Total em dólar (só carteiras internacionais, quando há ativos em US$ no mês).
  const totalUsd = carteira.tipo === 'internacional' ? saldoCarteiraUsd(carteira, i) : 0
  const parcial = carteiraParcial(carteira, i)
  const pendentes = bancosPendentes(carteira, i)

  // Variação só quando o mês atual e o anterior estão completos (senão engana).
  const podeVariacao = !parcial && i > 0 && !carteiraParcial(carteira, i - 1)
  const anterior = podeVariacao ? saldoCarteira(carteira, i - 1) : null
  const variacao = anterior !== null ? total - anterior : null
  const variacaoPct = anterior && anterior !== 0 ? (variacao! / anterior) * 100 : null

  const temAnterior = i > 0
  const temProximo = i < ultimo
  const tipoLabel = carteira.tipo === 'brasil' ? '🇧🇷 Brasil' : '🌎 Internacional'

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
        <Link href="/" className="hover:text-blue-600">Início</Link>
        <span>/</span>
        <Link href="/financeiro" className="hover:text-blue-600">Financeiro</Link>
        <span>/</span>
        <span className="text-gray-900 font-medium">{carteira.nome}</span>
      </div>

      <div className="flex items-center gap-3 mb-6">
        <h2 className="text-xl font-semibold text-gray-900">{carteira.nome}</h2>
        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">{tipoLabel}</span>
      </div>

      {/* Banner de saldo total com setas de mês */}
      <div className="bg-green-600 text-white rounded-xl p-5 mb-3 flex items-center justify-between gap-3 text-xl font-bold tracking-wide">
        <span className="uppercase flex items-center gap-2">
          Saldo total
          {parcial && <span className="text-[10px] font-semibold bg-yellow-400 text-yellow-900 px-1.5 py-0.5 rounded">PARCIAL</span>}
        </span>
        <span className="flex items-center gap-2 sm:gap-4">
          {temAnterior ? (
            <Link href={`/financeiro/${slug}?mes=${i}`} aria-label="Mês anterior"
              className="w-8 h-8 flex items-center justify-center rounded-full bg-green-700 hover:bg-green-800 transition-colors text-2xl leading-none">‹</Link>
          ) : (
            <span className="w-8 h-8 flex items-center justify-center rounded-full bg-green-700/40 text-2xl leading-none opacity-40">‹</span>
          )}
          <span className="min-w-[9rem] text-center">{navMeses[i].nome}/{navMeses[i].ano}</span>
          {temProximo ? (
            <Link href={`/financeiro/${slug}?mes=${i + 2}`} aria-label="Próximo mês"
              className="w-8 h-8 flex items-center justify-center rounded-full bg-green-700 hover:bg-green-800 transition-colors text-2xl leading-none">›</Link>
          ) : (
            <span className="w-8 h-8 flex items-center justify-center rounded-full bg-green-700/40 text-2xl leading-none opacity-40">›</span>
          )}
        </span>
        <span className="flex flex-col items-end leading-tight">
          <span>{brl(total)}</span>
          {totalUsd > 0 && (
            <span className="text-sm font-semibold text-green-100">{fmtMoeda('US$', totalUsd)}</span>
          )}
        </span>
      </div>

      {/* Aviso de mês parcial ou variação no mês */}
      {parcial ? (
        <div className="mb-4 text-sm text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2">
          Mês parcial — aguardando extrato de: <b>{pendentes.join(', ')}</b>. O saldo mostra só o que já foi importado.
        </div>
      ) : variacao !== null && (
        <div className="mb-4 text-sm text-gray-600 flex items-center gap-2">
          <span>Variação no mês:</span>
          <span className={`font-semibold ${variacao >= 0 ? 'text-green-700' : 'text-red-600'}`}>
            {variacao >= 0 ? '▲' : '▼'} {variacao >= 0 ? '+' : '−'}{brl(Math.abs(variacao))}
            {variacaoPct !== null && ` (${variacao >= 0 ? '+' : '−'}${Math.abs(variacaoPct).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%)`}
          </span>
        </div>
      )}

      {/* Evolução no ano — um card QUADRADO por mês, 3 por linha. Clicar leva ao mês e
          abre o leque de investimentos da carteira (seção "Contas", logo abaixo). */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-4">
        <div className="flex items-baseline justify-between mb-3">
          <h3 className="font-medium text-gray-900">Evolução em 2026</h3>
          <span className="text-[11px] text-gray-400">clique num mês para ver os investimentos ↓</span>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2.5">
          {Array.from({ length: ultimo + 1 }, (_, idx) => idx).map(idx => {
            const v = saldoCarteira(carteira, idx)
            const p = carteiraParcial(carteira, idx)
            const anterior = idx > 0 ? saldoCarteira(carteira, idx - 1) : null
            const delta = idx > 0 && !p && !carteiraParcial(carteira, idx - 1) ? v - (anterior ?? 0) : null
            const deltaPct = delta !== null && anterior ? (delta / anterior) * 100 : null
            const selecionado = idx === i
            // Câmbio do dólar usado no fechamento — só internacional e de julho/2026 em diante.
            const mDetalhe = navMeses[idx].ano > 2026 || (navMeses[idx].ano === 2026 && navMeses[idx].mes >= 7)
            const cambio = carteira.tipo === 'internacional' && mDetalhe ? cambioUsdCarteira(carteira, idx) : null
            const rotuloMes = `${navMeses[idx].abrev}/${String(navMeses[idx].ano).slice(2)}`
            return (
              <Link key={idx} href={`/financeiro/${slug}?mes=${idx + 1}#contas`} scroll
                className={`aspect-square rounded-xl border p-2.5 flex flex-col justify-between transition-colors ${selecionado ? 'bg-green-50 border-green-400 ring-1 ring-green-300' : 'bg-white border-gray-200 hover:bg-gray-50 hover:border-gray-300'}`}>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">{rotuloMes}</span>
                  {p && <span className="text-[8px] font-bold bg-yellow-400 text-yellow-900 px-1 py-0.5 rounded">PARCIAL</span>}
                </div>
                <div className="text-center leading-tight">
                  <div className="text-sm sm:text-base font-bold text-gray-800 tabular-nums">{brlCompacto(v)}</div>
                  {cambio && (
                    <div className="text-[10px] text-gray-400 tabular-nums mt-0.5">💵 {cambio.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                  )}
                </div>
                <div className="text-center text-[11px] tabular-nums leading-tight">
                  {p ? (
                    <span className="text-yellow-600">parcial</span>
                  ) : delta !== null ? (
                    <span className={delta >= 0 ? 'text-green-600' : 'text-red-500'}>
                      {delta >= 0 ? '▲' : '▼'} {delta >= 0 ? '+' : '−'}{brlCompacto(Math.abs(delta))}
                      {deltaPct !== null && <span className="block text-[10px]">{delta >= 0 ? '+' : '−'}{Math.abs(deltaPct).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%</span>}
                    </span>
                  ) : (
                    <span className="text-gray-300">—</span>
                  )}
                </div>
              </Link>
            )
          })}
        </div>
      </div>

      {/* Contas por banco — editáveis no próprio perfil da empresa (mês selecionado).
          Âncora #contas: clicar num card de mês rola até aqui (o leque de investimentos). */}
      <div id="contas" className="scroll-mt-4">
      <CarteiraContas
        key={`${navMeses[i].ano}-${navMeses[i].mes}`}
        slug={slug}
        mesNome={navMeses[i].nome}
        ano={navMeses[i].ano}
        mes={navMeses[i].mes}
        contas={carteira.contas.filter(conta => contaRelevanteNoMes(conta, i)).map(conta => ({
          banco: conta.banco,
          temMes: contaTemMes(conta, i),
          saldo: saldoConta(conta, i),
          investimentos: conta.investimentos.map(inv => ({
            nome: inv.nome,
            moeda: inv.moeda ?? null,
            valor: inv.valores[i] ?? null,
            valorMoeda: inv.valoresMoeda?.[i] ?? null,
            variacao: inv.variacoes?.[i] ?? null,
            tributavel: inv.tributavel ?? null,
          })),
        }))}
      />
      </div>
    </div>
  )
}

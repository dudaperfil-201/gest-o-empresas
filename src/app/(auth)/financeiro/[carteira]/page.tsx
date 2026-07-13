import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  MESES_2026, getCarteira, saldoConta, saldoCarteira, brl, fmtMoeda,
  numMeses, contaTemMes, carteiraParcial, bancosPendentes,
} from '@/lib/financeiro/dados'
import { exigirFinanceiro } from '@/lib/auth'

export default async function CarteiraPage({ params, searchParams }: {
  params: Promise<{ carteira: string }>
  searchParams: Promise<{ mes?: string }>
}) {
  await exigirFinanceiro()
  const { carteira: slug } = await params
  const carteira = getCarteira(slug)
  if (!carteira) notFound()

  const sp = await searchParams
  const ultimo = numMeses(carteira) - 1
  let i = sp.mes ? parseInt(sp.mes, 10) - 1 : ultimo
  if (isNaN(i) || i < 0) i = 0
  if (i > ultimo) i = ultimo

  const total = saldoCarteira(carteira, i)
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
          <span className="min-w-[9rem] text-center">{MESES_2026[i].nome}/2026</span>
          {temProximo ? (
            <Link href={`/financeiro/${slug}?mes=${i + 2}`} aria-label="Próximo mês"
              className="w-8 h-8 flex items-center justify-center rounded-full bg-green-700 hover:bg-green-800 transition-colors text-2xl leading-none">›</Link>
          ) : (
            <span className="w-8 h-8 flex items-center justify-center rounded-full bg-green-700/40 text-2xl leading-none opacity-40">›</span>
          )}
        </span>
        <span>{brl(total)}</span>
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

      {/* Evolução no ano */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-4">
        <h3 className="font-medium text-gray-900 mb-3">Evolução em 2026</h3>
        <div className={`grid gap-2 text-center`} style={{ gridTemplateColumns: `repeat(${ultimo + 1}, minmax(0, 1fr))` }}>
          {Array.from({ length: ultimo + 1 }, (_, idx) => idx).map(idx => {
            const v = saldoCarteira(carteira, idx)
            const p = carteiraParcial(carteira, idx)
            const delta = idx > 0 && !p && !carteiraParcial(carteira, idx - 1) ? v - saldoCarteira(carteira, idx - 1) : null
            const selecionado = idx === i
            return (
              <Link key={idx} href={`/financeiro/${slug}?mes=${idx + 1}`}
                className={`rounded-lg py-3 px-1 transition-colors ${selecionado ? 'bg-green-50 ring-1 ring-green-300' : 'bg-gray-50 hover:bg-gray-100'}`}>
                <p className="text-[11px] font-medium text-gray-400">{MESES_2026[idx].abrev}</p>
                <p className="text-sm font-semibold text-gray-800 mt-1">{brl(v)}</p>
                {p ? (
                  <p className="text-[10px] mt-0.5 text-yellow-600">parcial</p>
                ) : delta !== null && (
                  <p className={`text-[11px] mt-0.5 ${delta >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                    {delta >= 0 ? '▲' : '▼'} {brl(Math.abs(delta))}
                  </p>
                )}
              </Link>
            )
          })}
        </div>
      </div>

      {/* Contas por banco (posição do mês selecionado) */}
      <div className="space-y-3">
        {carteira.contas.map(conta => {
          const temMes = contaTemMes(conta, i)
          const inv0 = conta.investimentos[0]
          const single = conta.investimentos.length === 1 && inv0.nome === 'Saldo'
          return (
            <div key={conta.banco} className={`border rounded-xl p-5 ${temMes ? 'bg-white border-gray-200' : 'bg-gray-50 border-dashed border-gray-300'}`}>
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">{conta.banco}</h3>
                {temMes
                  ? <span className="text-lg font-bold text-green-700">{brl(saldoConta(conta, i))}</span>
                  : <span className="text-sm font-medium text-gray-400">Aguardando extrato</span>}
              </div>
              {temMes && !single && (
                <div className="space-y-1.5 mt-3">
                  {conta.investimentos.map(inv => (
                    <div key={inv.nome} className="flex items-center justify-between text-sm border-b border-gray-50 last:border-0 pb-1.5 last:pb-0">
                      <span className="text-gray-600">{inv.nome}</span>
                      <span className="text-right">
                        <span className="text-gray-800 font-medium">{brl(inv.valores[i] ?? 0)}</span>
                        {inv.moeda && inv.valoresMoeda && (
                          <span className="block text-xs text-gray-400">{fmtMoeda(inv.moeda, inv.valoresMoeda[i] ?? 0)}</span>
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              {temMes && single && inv0.moeda && inv0.valoresMoeda && (
                <p className="text-xs text-gray-400 mt-1 text-right">{fmtMoeda(inv0.moeda, inv0.valoresMoeda[i] ?? 0)}</p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

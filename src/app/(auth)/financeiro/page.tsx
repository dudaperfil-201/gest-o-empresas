import Link from 'next/link'
import { MESES_2026, CARTEIRAS, saldoCarteira, brl, numMeses, contaTemMes, carteiraParcial } from '@/lib/financeiro/dados'
import { exigirAdmin } from '@/lib/auth'

export default async function FinanceiroPage({ searchParams }: { searchParams: Promise<{ mes?: string }> }) {
  await exigirAdmin()
  const sp = await searchParams
  // Ao abrir, mostra o último mês com QUALQUER dado (o mês que está sendo
  // cadastrado). As setas navegam por todos os meses disponíveis.
  const ultimoNavegavel = Math.max(...CARTEIRAS.map(numMeses)) - 1
  let i = sp.mes ? parseInt(sp.mes, 10) - 1 : ultimoNavegavel
  if (isNaN(i) || i < 0) i = 0
  if (i > ultimoNavegavel) i = ultimoNavegavel

  const mesAnterior = i > 0 ? i : null
  const mesProximo = i < ultimoNavegavel ? i + 2 : null

  // Ordena por grandeza = tamanho real da carteira (último saldo conhecido),
  // para que as maiores fiquem no topo mesmo quando o mês atual ainda está pendente.
  const comSaldo = CARTEIRAS
    .map(c => ({ ...c, saldo: saldoCarteira(c, i), temMes: numMeses(c) > i, magnitude: saldoCarteira(c, numMeses(c) - 1) }))
    .sort((a, b) => b.magnitude - a.magnitude)

  const brasil = comSaldo.filter(c => c.tipo === 'brasil')
  const internacional = comSaldo.filter(c => c.tipo === 'internacional')
  const totalBrasil = brasil.filter(c => c.temMes).reduce((s, c) => s + c.saldo, 0)
  const totalIntl = internacional.filter(c => c.temMes).reduce((s, c) => s + c.saldo, 0)
  const totalGeral = totalBrasil + totalIntl
  const pct = (v: number) => totalGeral > 0 ? (v / totalGeral * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) : '0'

  // Mês incompleto = alguma carteira sem dado OU parcial (faltando algum extrato).
  const parcial = comSaldo.some(c => !c.temMes || carteiraParcial(c, i))
  const nPendentes = comSaldo.filter(c => !c.temMes || carteiraParcial(c, i)).length

  // Variação do patrimônio total vs mês anterior — só quando ambos os meses
  // estão 100% completos (mesmo critério dos cards, para não dar % falso).
  const mesCompleto = (k: number) => k >= 0 && CARTEIRAS.every(c => numMeses(c) > k && !carteiraParcial(c, k))
  const podeVariacao = i > 0 && mesCompleto(i) && mesCompleto(i - 1)
  const totalAnterior = podeVariacao ? CARTEIRAS.reduce((s, c) => s + saldoCarteira(c, i - 1), 0) : null
  const variacaoPct = totalAnterior && totalAnterior !== 0 ? ((totalGeral - totalAnterior) / totalAnterior) * 100 : null
  const subiu = totalAnterior !== null && totalGeral >= totalAnterior

  const Card = (c: typeof comSaldo[number]) => {
    // Variação vs mês anterior — só quando a comparação é justa (ambos completos).
    const podeVariacao = c.temMes && i > 0 && !carteiraParcial(c, i) && !carteiraParcial(c, i - 1)
    const anterior = podeVariacao ? saldoCarteira(c, i - 1) : null
    const variacaoPct = anterior && anterior !== 0 ? ((c.saldo - anterior) / anterior) * 100 : null
    const subiu = anterior !== null && c.saldo >= anterior
    return (
      <Link key={c.slug} href={`/financeiro/${c.slug}?mes=${i + 1}`}
        className={`border rounded-xl p-5 transition-all ${c.temMes ? 'bg-white border-gray-200 hover:border-green-300 hover:shadow-sm' : 'bg-gray-50 border-dashed border-gray-300'}`}>
        <div className="flex items-center justify-between mb-2">
          <h3 className={`font-semibold text-lg ${c.temMes ? 'text-gray-900' : 'text-gray-400'}`}>{c.nome}</h3>
          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">{c.tipo === 'brasil' ? '🇧🇷' : '🌎'}</span>
        </div>
        {c.temMes
          ? <p className="text-2xl font-bold text-green-700">{brl(c.saldo)}</p>
          : <p className="text-sm font-medium text-gray-400">Aguardando extrato</p>}
        {/* Mês anterior (fonte menor) + variação % */}
        {anterior !== null && (
          <p className="text-xs text-gray-500 mt-0.5">
            {MESES_2026[i - 1].abrev}: {brl(anterior)}
            {variacaoPct !== null && (
              <span className={`ml-2 font-semibold ${subiu ? 'text-green-600' : 'text-red-500'}`}>
                {subiu ? '▲' : '▼'} {subiu ? '+' : '−'}{Math.abs(variacaoPct).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%
              </span>
            )}
          </p>
        )}
        {/* Bancos: em vermelho os que ainda não têm extrato do mês selecionado */}
        <p className="text-xs mt-1">
          {c.contas.map((ct, idx) => (
            <span key={ct.banco}>
              {idx > 0 && <span className="text-gray-300"> · </span>}
              <span className={contaTemMes(ct, i) ? 'text-gray-400' : 'text-red-600 font-semibold'}>{ct.banco}</span>
            </span>
          ))}
        </p>
      </Link>
    )
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
        <Link href="/" className="hover:text-blue-600">Início</Link>
        <span>/</span>
        <span className="text-gray-900 font-medium">Financeiro</span>
      </div>

      <div className="flex items-center gap-3 mb-6">
        <span className="text-3xl">💰</span>
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Financeiro</h2>
          <p className="text-sm text-gray-500 mt-0.5">Carteiras de investimento — Brasil e Internacional</p>
        </div>
      </div>

      {/* Banner com patrimônio total e navegação de mês */}
      <div className="bg-green-600 text-white rounded-xl p-5 mb-3 flex items-center justify-between gap-3 text-xl font-bold tracking-wide">
        <span className="uppercase flex items-center gap-2">
          Patrimônio total
          {parcial && <span className="text-[10px] font-semibold bg-yellow-400 text-yellow-900 px-1.5 py-0.5 rounded">PARCIAL</span>}
        </span>
        <span className="flex items-center gap-2 sm:gap-4">
          {mesAnterior ? (
            <Link href={`/financeiro?mes=${mesAnterior}`} aria-label="Mês anterior"
              className="w-8 h-8 flex items-center justify-center rounded-full bg-green-700 hover:bg-green-800 transition-colors text-2xl leading-none">‹</Link>
          ) : (
            <span className="w-8 h-8 flex items-center justify-center rounded-full bg-green-700/40 text-2xl leading-none opacity-40">‹</span>
          )}
          <span className="min-w-[9rem] text-center">{MESES_2026[i].nome}/2026</span>
          {mesProximo ? (
            <Link href={`/financeiro?mes=${mesProximo}`} aria-label="Próximo mês"
              className="w-8 h-8 flex items-center justify-center rounded-full bg-green-700 hover:bg-green-800 transition-colors text-2xl leading-none">›</Link>
          ) : (
            <span className="w-8 h-8 flex items-center justify-center rounded-full bg-green-700/40 text-2xl leading-none opacity-40">›</span>
          )}
        </span>
        <span className="flex flex-col items-end leading-tight">
          <span>{brl(totalGeral)}</span>
          {podeVariacao && totalAnterior !== null && (
            <span className="text-xs font-normal text-white/85 mt-1">
              {MESES_2026[i - 1].abrev}: {brl(totalAnterior)}
              {variacaoPct !== null && (
                <span className="ml-2 bg-green-800/60 rounded px-1.5 py-0.5">
                  {subiu ? '▲' : '▼'} {subiu ? '+' : '−'}{Math.abs(variacaoPct).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%
                </span>
              )}
            </span>
          )}
        </span>
      </div>

      {parcial && (
        <div className="mb-4 text-sm text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2">
          Mês em construção — {nPendentes} carteira(s) ainda incompleta(s). O total soma só o que já foi importado.
        </div>
      )}

      {/* Divisão Brasil x Internacional */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
          <p className="text-sm text-gray-500">🇧🇷 Brasil</p>
          <p className="text-xl font-bold text-gray-900 mt-1">{brl(totalBrasil)}</p>
          <p className="text-xs text-gray-400 mt-0.5">{pct(totalBrasil)}% da carteira</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
          <p className="text-sm text-gray-500">🌎 Internacional</p>
          <p className="text-xl font-bold text-gray-900 mt-1">{brl(totalIntl)}</p>
          <p className="text-xs text-gray-400 mt-0.5">{pct(totalIntl)}% da carteira</p>
        </div>
      </div>

      <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">🇧🇷 Brasil</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        {brasil.map(Card)}
      </div>

      <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">🌎 Internacional</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {internacional.map(Card)}
      </div>
    </div>
  )
}

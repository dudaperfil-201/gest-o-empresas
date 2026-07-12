import Link from 'next/link'
import { MESES_2026, CARTEIRAS, saldoCarteira, brl, numMeses } from '@/lib/financeiro/dados'

export default async function FinanceiroPage({ searchParams }: { searchParams: Promise<{ mes?: string }> }) {
  const sp = await searchParams
  // Pode navegar até o último mês com QUALQUER dado (mês em construção);
  // o padrão (ao abrir) é o último mês COMPLETO.
  const ultimoCompleto = Math.min(...CARTEIRAS.map(numMeses)) - 1
  const ultimoNavegavel = Math.max(...CARTEIRAS.map(numMeses)) - 1
  let i = sp.mes ? parseInt(sp.mes, 10) - 1 : ultimoCompleto
  if (isNaN(i) || i < 0) i = 0
  if (i > ultimoNavegavel) i = ultimoNavegavel

  const mesAnterior = i > 0 ? i : null
  const mesProximo = i < ultimoNavegavel ? i + 2 : null

  const comSaldo = CARTEIRAS
    .map(c => ({ ...c, saldo: saldoCarteira(c, i), temMes: numMeses(c) > i }))
    .sort((a, b) => (Number(b.temMes) - Number(a.temMes)) || (b.saldo - a.saldo))

  const brasil = comSaldo.filter(c => c.tipo === 'brasil')
  const internacional = comSaldo.filter(c => c.tipo === 'internacional')
  const totalBrasil = brasil.filter(c => c.temMes).reduce((s, c) => s + c.saldo, 0)
  const totalIntl = internacional.filter(c => c.temMes).reduce((s, c) => s + c.saldo, 0)
  const totalGeral = totalBrasil + totalIntl
  const pct = (v: number) => totalGeral > 0 ? (v / totalGeral * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) : '0'

  const parcial = comSaldo.some(c => !c.temMes)
  const nPendentes = comSaldo.filter(c => !c.temMes).length

  const Card = (c: typeof comSaldo[number]) => (
    <Link key={c.slug} href={`/financeiro/${c.slug}?mes=${i + 1}`}
      className={`border rounded-xl p-5 transition-all ${c.temMes ? 'bg-white border-gray-200 hover:border-green-300 hover:shadow-sm' : 'bg-gray-50 border-dashed border-gray-300'}`}>
      <div className="flex items-center justify-between mb-2">
        <h3 className={`font-semibold text-lg ${c.temMes ? 'text-gray-900' : 'text-gray-400'}`}>{c.nome}</h3>
        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">{c.tipo === 'brasil' ? '🇧🇷' : '🌎'}</span>
      </div>
      {c.temMes ? (
        <>
          <p className="text-2xl font-bold text-green-700">{brl(c.saldo)}</p>
          <p className="text-xs text-gray-400 mt-1">{c.contas.map(ct => ct.banco).join(' · ')}</p>
        </>
      ) : (
        <p className="text-sm font-medium text-gray-400">Aguardando extrato</p>
      )}
    </Link>
  )

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
        <span>{brl(totalGeral)}</span>
      </div>

      {parcial && (
        <div className="mb-4 text-sm text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2">
          Mês em construção — {nPendentes} carteira(s) ainda sem extrato. O total soma só o que já foi importado.
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

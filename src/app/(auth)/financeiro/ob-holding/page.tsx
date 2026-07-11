import Link from 'next/link'

// ⚠️ Dados temporários embutidos (posição mês a mês de 2026), só para alinhar o formato.
// Depois vamos ligar ao banco de dados e importar todas as carteiras.
const brl = (n: number) => 'R$ ' + n.toLocaleString('pt-BR', { minimumFractionDigits: 2 })

const meses = [
  { abrev: 'JAN', nome: 'JANEIRO' },
  { abrev: 'FEV', nome: 'FEVEREIRO' },
  { abrev: 'MAR', nome: 'MARÇO' },
  { abrev: 'ABR', nome: 'ABRIL' },
  { abrev: 'MAI', nome: 'MAIO' },
]

// valores[i] corresponde a meses[i] (Jan..Mai/2026)
const contas = [
  {
    banco: 'XP', investimentos: [
      { nome: 'Ações', valores: [128743.20, 103929.90, 114167.10, 119321.70, 119318.10] },
      { nome: 'COE', valores: [1195.75, 1216.53, 1226.12, 1242.90, 1256.48] },
      { nome: 'Dividendos', valores: [467.52, 336.00, 0, 0, 604.80] },
      { nome: 'Em conta', valores: [0, 1213.17, 381.72, 462.27, 481.20] },
    ],
  },
  {
    banco: 'Inter', investimentos: [
      { nome: 'Em conta', valores: [5593.22, 18294.83, 52847.43, 8049.20, 108842.09] },
    ],
  },
  {
    banco: 'Itaú', investimentos: [
      { nome: 'Em conta', valores: [0, 0, 74396.50, 183482.91, 101939.92] },
    ],
  },
]

const saldoConta = (c: typeof contas[number], i: number) => c.investimentos.reduce((s, inv) => s + inv.valores[i], 0)
const totalMes = (i: number) => contas.reduce((s, c) => s + saldoConta(c, i), 0)

export default async function ObHoldingPage({ searchParams }: { searchParams: Promise<{ mes?: string }> }) {
  const sp = await searchParams
  const ultimo = meses.length - 1
  // índice do mês selecionado (0..4); padrão = mês mais recente
  let i = sp.mes ? parseInt(sp.mes, 10) - 1 : ultimo
  if (isNaN(i) || i < 0) i = 0
  if (i > ultimo) i = ultimo

  const total = totalMes(i)
  const anterior = i > 0 ? totalMes(i - 1) : null
  const variacao = anterior !== null ? total - anterior : null
  const variacaoPct = anterior && anterior !== 0 ? (variacao! / anterior) * 100 : null

  const temAnterior = i > 0
  const temProximo = i < ultimo

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
        <Link href="/" className="hover:text-blue-600">Início</Link>
        <span>/</span>
        <Link href="/financeiro" className="hover:text-blue-600">Financeiro</Link>
        <span>/</span>
        <span className="text-gray-900 font-medium">OB Holding</span>
      </div>

      <div className="flex items-center gap-3 mb-6">
        <h2 className="text-xl font-semibold text-gray-900">OB Holding</h2>
        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">🇧🇷 Brasil</span>
      </div>

      {/* Banner de saldo total com setas de mês (mesma linguagem do módulo de imóveis) */}
      <div className="bg-green-600 text-white rounded-xl p-5 mb-3 flex items-center justify-between gap-3 text-xl font-bold tracking-wide">
        <span className="uppercase">Saldo total</span>
        <span className="flex items-center gap-2 sm:gap-4">
          {temAnterior ? (
            <Link href={`/financeiro/ob-holding?mes=${i}`} aria-label="Mês anterior"
              className="w-8 h-8 flex items-center justify-center rounded-full bg-green-700 hover:bg-green-800 transition-colors text-2xl leading-none">‹</Link>
          ) : (
            <span className="w-8 h-8 flex items-center justify-center rounded-full bg-green-700/40 text-2xl leading-none opacity-40">‹</span>
          )}
          <span className="min-w-[9rem] text-center">{meses[i].nome}/2026</span>
          {temProximo ? (
            <Link href={`/financeiro/ob-holding?mes=${i + 2}`} aria-label="Próximo mês"
              className="w-8 h-8 flex items-center justify-center rounded-full bg-green-700 hover:bg-green-800 transition-colors text-2xl leading-none">›</Link>
          ) : (
            <span className="w-8 h-8 flex items-center justify-center rounded-full bg-green-700/40 text-2xl leading-none opacity-40">›</span>
          )}
        </span>
        <span>{brl(total)}</span>
      </div>

      {/* Variação no mês */}
      {variacao !== null && (
        <div className="mb-4 text-sm text-gray-600 flex items-center gap-2">
          <span>Variação no mês:</span>
          <span className={`font-semibold ${variacao >= 0 ? 'text-green-700' : 'text-red-600'}`}>
            {variacao >= 0 ? '▲' : '▼'} {variacao >= 0 ? '+' : '−'}{brl(Math.abs(variacao))}
            {variacaoPct !== null && ` (${variacao >= 0 ? '+' : '−'}${Math.abs(variacaoPct).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%)`}
          </span>
        </div>
      )}

      {/* Evolução no ano com variação mês a mês */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-4">
        <h3 className="font-medium text-gray-900 mb-3">Evolução em 2026</h3>
        <div className="grid grid-cols-5 gap-2 text-center">
          {meses.map((m, idx) => {
            const v = totalMes(idx)
            const delta = idx > 0 ? v - totalMes(idx - 1) : null
            const selecionado = idx === i
            return (
              <Link key={m.abrev} href={`/financeiro/ob-holding?mes=${idx + 1}`}
                className={`rounded-lg py-3 px-1 transition-colors ${selecionado ? 'bg-green-50 ring-1 ring-green-300' : 'bg-gray-50 hover:bg-gray-100'}`}>
                <p className="text-[11px] font-medium text-gray-400">{m.abrev}</p>
                <p className="text-sm font-semibold text-gray-800 mt-1">{brl(v)}</p>
                {delta !== null && (
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
        {contas.map(conta => (
          <div key={conta.banco} className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900">{conta.banco}</h3>
              <span className="text-lg font-bold text-green-700">{brl(saldoConta(conta, i))}</span>
            </div>
            <div className="space-y-1.5">
              {conta.investimentos.map(inv => (
                <div key={inv.nome} className="flex items-center justify-between text-sm border-b border-gray-50 last:border-0 pb-1.5 last:pb-0">
                  <span className="text-gray-600">{inv.nome}</span>
                  <span className="text-gray-800 font-medium">{brl(inv.valores[i])}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

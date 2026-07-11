import Link from 'next/link'

// ⚠️ Dados temporários embutidos (posição de 2026), só para alinhar o formato.
// Depois vamos ligar ao banco de dados e importar todas as carteiras.
const brl = (n: number) => 'R$ ' + n.toLocaleString('pt-BR', { minimumFractionDigits: 2 })

const evolucao2026 = [
  { mes: 'JAN', valor: 134336.42 },
  { mes: 'FEV', valor: 122224.73 },
  { mes: 'MAR', valor: 243018.87 },
  { mes: 'ABR', valor: 312558.98 },
  { mes: 'MAI', valor: 332442.59 },
]

const contas = [
  {
    banco: 'XP', saldo: 121660.58, investimentos: [
      { nome: 'Ações', valor: 119318.10 },
      { nome: 'COE', valor: 1256.48 },
      { nome: 'Dividendos', valor: 604.80 },
      { nome: 'Em conta', valor: 481.20 },
    ],
  },
  {
    banco: 'Inter', saldo: 108842.09, investimentos: [
      { nome: 'Em conta', valor: 108842.09 },
    ],
  },
  {
    banco: 'Itaú', saldo: 101939.92, investimentos: [
      { nome: 'Em conta', valor: 101939.92 },
    ],
  },
]

const saldoTotal = contas.reduce((s, c) => s + c.saldo, 0)

export default function ObHoldingPage() {
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

      {/* Banner de saldo total (mesma linguagem do módulo de imóveis) */}
      <div className="bg-green-600 text-white rounded-xl p-5 mb-4 flex items-center justify-between gap-3 text-xl font-bold tracking-wide">
        <span className="uppercase">Saldo total</span>
        <span>MAIO/2026</span>
        <span>{brl(saldoTotal)}</span>
      </div>

      {/* Evolução no ano */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-4">
        <h3 className="font-medium text-gray-900 mb-3">Evolução em 2026</h3>
        <div className="grid grid-cols-5 gap-2 text-center">
          {evolucao2026.map(e => (
            <div key={e.mes} className="bg-gray-50 rounded-lg py-3 px-1">
              <p className="text-[11px] font-medium text-gray-400">{e.mes}</p>
              <p className="text-sm font-semibold text-gray-800 mt-1">{brl(e.valor)}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Contas por banco */}
      <div className="space-y-3">
        {contas.map(conta => (
          <div key={conta.banco} className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900">{conta.banco}</h3>
              <span className="text-lg font-bold text-green-700">{brl(conta.saldo)}</span>
            </div>
            <div className="space-y-1.5">
              {conta.investimentos.map(inv => (
                <div key={inv.nome} className="flex items-center justify-between text-sm border-b border-gray-50 last:border-0 pb-1.5 last:pb-0">
                  <span className="text-gray-600">{inv.nome}</span>
                  <span className="text-gray-800 font-medium">{brl(inv.valor)}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

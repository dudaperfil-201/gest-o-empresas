'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { salvarMesFinanceiro, type ItemMes } from '@/app/actions/financeiro'

type Inv = { nome: string; moeda: string | null; valor: number | null; valorMoeda: number | null; variacao: number | null }

// Variação % colorida (verde sobe / vermelho cai). "—" quando não há dado.
const fmtPct = (n: number) => `${n >= 0 ? '▲ +' : '▼ '}${n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`
type Conta = { banco: string; temMes: boolean; saldo: number; investimentos: Inv[] }

const brl = (n: number) => 'R$ ' + n.toLocaleString('pt-BR', { minimumFractionDigits: 2 })
const fmtMoeda = (s: string, n: number) => `${s} ${n.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
const chave = (banco: string, nome: string) => `${banco}|${nome}`

export default function CarteiraContas({ slug, mesNome, ano, mes, contas }: {
  slug: string; mesNome: string; ano: number; mes: number; contas: Conta[]
}) {
  const router = useRouter()
  const [editando, setEditando] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  // Quais classes estão expandidas (mostrando os ativos). Começa tudo fechado.
  const [abertas, setAbertas] = useState<Set<string>>(new Set())
  const alternar = (banco: string) => setAbertas(prev => {
    const n = new Set(prev)
    if (n.has(banco)) n.delete(banco); else n.add(banco)
    return n
  })

  const init = (pick: (i: Inv) => number | null) => {
    const o: Record<string, string> = {}
    for (const c of contas) for (const inv of c.investimentos) {
      const v = pick(inv)
      o[chave(c.banco, inv.nome)] = v != null ? String(v) : ''
    }
    return o
  }
  const [valores, setValores] = useState<Record<string, string>>(() => init(i => i.valor))
  const [valoresMoeda, setValoresMoeda] = useState<Record<string, string>>(() => init(i => i.valorMoeda))

  async function salvar() {
    const payload: ItemMes[] = []
    for (const c of contas) for (const inv of c.investimentos) {
      const k = chave(c.banco, inv.nome)
      const raw = (valores[k] ?? '').trim()
      if (raw === '') continue
      const v = Number(raw.replace(',', '.'))
      if (!Number.isFinite(v)) continue
      const rawM = (valoresMoeda[k] ?? '').trim()
      const vm = inv.moeda && rawM !== '' ? Number(rawM.replace(',', '.')) : NaN
      payload.push({ carteira_slug: slug, banco: c.banco, investimento: inv.nome, valor: v, valor_moeda: Number.isFinite(vm) ? vm : null })
    }
    if (payload.length === 0) { setMsg('Preencha ao menos um valor.'); return }
    setSalvando(true); setMsg(null)
    try {
      const r = await salvarMesFinanceiro(ano, mes, payload)
      if (!r.ok) { setMsg(r.erro); return }
      setEditando(false)
      router.refresh()
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-900">Contas — {mesNome}/{ano}</h3>
        {editando ? (
          <div className="flex items-center gap-2">
            <button onClick={() => setEditando(false)} disabled={salvando}
              className="text-sm font-medium text-gray-500 px-3 py-1.5 rounded-lg hover:bg-gray-100">Cancelar</button>
            <button onClick={salvar} disabled={salvando}
              className="text-sm font-semibold text-white bg-green-600 px-4 py-1.5 rounded-lg hover:bg-green-700 disabled:opacity-60">
              {salvando ? 'Salvando…' : 'Salvar'}
            </button>
          </div>
        ) : (
          <button onClick={() => setEditando(true)}
            className="text-sm font-semibold text-green-700 border border-green-300 px-4 py-1.5 rounded-lg hover:bg-green-50">
            ✏️ Editar valores
          </button>
        )}
      </div>

      {msg && <div className="mb-3 px-3 py-2 rounded-lg text-sm bg-red-100 text-red-800">{msg}</div>}

      <div className="space-y-3">
        {contas.map(conta => {
          // Total da classe na moeda original (ex.: US$) — o R$ já vem em conta.saldo.
          const simbolo = conta.investimentos.find(i => i.moeda)?.moeda ?? null
          const totalMoeda = simbolo
            ? conta.investimentos.reduce((s, i) => s + (i.moeda === simbolo ? (i.valorMoeda ?? 0) : 0), 0)
            : null
          // Variação da CLASSE = média das variações dos ativos ponderada pelo valor (R$).
          const comVar = conta.investimentos.filter(i => i.variacao != null && (i.valor ?? 0) !== 0)
          const pesoTotal = comVar.reduce((s, i) => s + (i.valor ?? 0), 0)
          const variacaoClasse = pesoTotal > 0
            ? comVar.reduce((s, i) => s + (i.valor ?? 0) * (i.variacao ?? 0), 0) / pesoTotal
            : null
          // Ativos exibíveis (a conta histórica de linha única "Saldo" não conta).
          const temAtivos = conta.investimentos.filter(inv => !(conta.investimentos.length === 1 && inv.nome === 'Saldo')).length > 0
          // Classe é "clicável" (expansível) fora do modo de edição, com extrato e com ativos.
          const expansivel = !editando && conta.temMes && temAtivos
          const aberta = abertas.has(conta.banco)
          return (
          <div key={conta.banco} className={`border rounded-xl p-5 ${editando || conta.temMes ? 'bg-white border-gray-200' : 'bg-gray-50 border-dashed border-gray-300'}`}>
            <div
              className={`flex items-center justify-between ${expansivel ? 'cursor-pointer select-none' : ''}`}
              onClick={expansivel ? () => alternar(conta.banco) : undefined}
              role={expansivel ? 'button' : undefined}
              aria-expanded={expansivel ? aberta : undefined}
            >
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                {expansivel && (
                  <span className="text-gray-400 text-xs w-3 inline-block">{aberta ? '▾' : '▸'}</span>
                )}
                {conta.banco}
                {!editando && conta.temMes && variacaoClasse != null && (
                  <span className={`text-xs font-bold ${variacaoClasse >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                    {fmtPct(variacaoClasse)}
                  </span>
                )}
              </h3>
              {!editando && (conta.temMes
                ? <span className="text-right">
                    <span className="block text-lg font-bold text-green-700 leading-tight">{brl(conta.saldo)}</span>
                    {totalMoeda != null && simbolo && (
                      <span className="block text-xs font-semibold text-gray-400">{fmtMoeda(simbolo, totalMoeda)}</span>
                    )}
                  </span>
                : <span className="text-sm font-medium text-gray-400">Aguardando extrato</span>)}
            </div>

            {editando ? (
              <div className="space-y-2 mt-3">
                {conta.investimentos.map(inv => {
                  const k = chave(conta.banco, inv.nome)
                  return (
                    <div key={inv.nome} className="flex items-center gap-2">
                      <span className="flex-1 text-sm text-gray-600 truncate">{inv.nome}</span>
                      {inv.moeda && (
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-gray-400">{inv.moeda}</span>
                          <input type="number" step="0.01" inputMode="decimal"
                            value={valoresMoeda[k] ?? ''}
                            onChange={e => setValoresMoeda(p => ({ ...p, [k]: e.target.value }))}
                            placeholder="moeda"
                            className="w-28 px-2 py-1.5 border border-gray-300 rounded-lg text-sm text-right focus:outline-none focus:ring-2 focus:ring-green-200" />
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-gray-400">R$</span>
                        <input type="number" step="0.01" inputMode="decimal"
                          value={valores[k] ?? ''}
                          onChange={e => setValores(p => ({ ...p, [k]: e.target.value }))}
                          placeholder="0,00"
                          className="w-36 px-2 py-1.5 border border-gray-300 rounded-lg text-sm text-right focus:outline-none focus:ring-2 focus:ring-green-200" />
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : conta.temMes && aberta && (
              <div className="space-y-1.5 mt-3">
                {conta.investimentos.filter(inv => !(conta.investimentos.length === 1 && inv.nome === 'Saldo')).map(inv => (
                  <div key={inv.nome} className="flex items-center justify-between gap-2 text-sm border-b border-gray-50 last:border-0 pb-1.5 last:pb-0">
                    <span className="text-gray-600 flex-1 min-w-0 truncate">{inv.nome}</span>
                    {/* Variação % no mês */}
                    <span className={`w-20 text-right text-xs font-semibold shrink-0 ${
                      inv.variacao == null ? 'text-gray-300' : inv.variacao >= 0 ? 'text-green-600' : 'text-red-500'
                    }`}>
                      {inv.variacao == null ? '—' : fmtPct(inv.variacao)}
                    </span>
                    <span className="text-right shrink-0">
                      <span className="text-gray-800 font-medium">{brl(inv.valor ?? 0)}</span>
                      {inv.moeda && inv.valorMoeda != null && (
                        <span className="block text-xs text-gray-400">{fmtMoeda(inv.moeda, inv.valorMoeda)}</span>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
          )
        })}
      </div>
    </div>
  )
}

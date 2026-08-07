'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { salvarMesFinanceiro, type ItemMes } from '@/app/actions/financeiro'

type Inv = { nome: string; moeda: string | null; valor: number | null; valorMoeda: number | null }
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
        {contas.map(conta => (
          <div key={conta.banco} className={`border rounded-xl p-5 ${editando || conta.temMes ? 'bg-white border-gray-200' : 'bg-gray-50 border-dashed border-gray-300'}`}>
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">{conta.banco}</h3>
              {!editando && (conta.temMes
                ? <span className="text-lg font-bold text-green-700">{brl(conta.saldo)}</span>
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
            ) : conta.temMes && (
              <div className="space-y-1.5 mt-3">
                {conta.investimentos.filter(inv => !(conta.investimentos.length === 1 && inv.nome === 'Saldo')).map(inv => (
                  <div key={inv.nome} className="flex items-center justify-between text-sm border-b border-gray-50 last:border-0 pb-1.5 last:pb-0">
                    <span className="text-gray-600">{inv.nome}</span>
                    <span className="text-right">
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
        ))}
      </div>
    </div>
  )
}

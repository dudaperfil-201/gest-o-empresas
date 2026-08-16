'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  adicionarComissao, excluirComissao, adicionarPagamento, excluirPagamento,
  type Comissao, type PagamentoComissao,
} from '@/app/actions/comissoes'

const PERCENTUAL = 60
const brl = (n: number) => 'R$ ' + (n ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
// texto (aceita vírgula) → número
function toNum(s: string): number {
  const c = (s ?? '').trim().replace(/\s/g, '')
  if (!c) return 0
  const n = parseFloat(c.includes(',') ? c.replace(/\./g, '').replace(',', '.') : c)
  return isFinite(n) ? n : 0
}
const dataBR = (d: string | null) => (d ? new Date(d + 'T12:00:00').toLocaleDateString('pt-BR') : '—')

export default function ComissaoManager({ comissoes, pagamentos }: { comissoes: Comissao[]; pagamentos: PagamentoComissao[] }) {
  const router = useRouter()
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  // Nova comissão
  const [aluguel, setAluguel] = useState('')
  const [descCom, setDescCom] = useState('')
  const comissaoPrevia = Math.round(toNum(aluguel) * (PERCENTUAL / 100) * 100) / 100

  // Novo pagamento
  const [valorPag, setValorPag] = useState('')
  const [descPag, setDescPag] = useState('')
  const [dataPag, setDataPag] = useState(new Date().toISOString().slice(0, 10))

  const totalComissoes = comissoes.reduce((s, c) => s + (c.valor_comissao ?? 0), 0)
  const totalPago = pagamentos.reduce((s, p) => s + (p.valor ?? 0), 0)
  const saldo = totalComissoes - totalPago

  async function run(fn: () => Promise<{ ok: boolean; erro?: string }>, limpar?: () => void) {
    setSalvando(true); setErro(null)
    try {
      const r = await fn()
      if (!r.ok) { setErro(r.erro ?? 'Erro.'); return }
      limpar?.()
      router.refresh()
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="space-y-6">
      {erro && <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{erro}</div>}

      {/* Resumo */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
          <p className="text-xs text-gray-500 mb-1">Total de comissões</p>
          <p className="text-xl font-bold text-gray-900">{brl(totalComissoes)}</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
          <p className="text-xs text-green-600 mb-1">Total pago</p>
          <p className="text-xl font-bold text-green-700">{brl(totalPago)}</p>
        </div>
        <div className={`rounded-xl p-4 text-center border ${saldo > 0 ? 'bg-amber-50 border-amber-200' : 'bg-gray-50 border-gray-200'}`}>
          <p className={`text-xs mb-1 ${saldo > 0 ? 'text-amber-700' : 'text-gray-500'}`}>Saldo a receber</p>
          <p className={`text-xl font-bold ${saldo > 0 ? 'text-amber-700' : 'text-gray-700'}`}>{brl(saldo)}</p>
        </div>
      </div>

      {/* Nova comissão */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h3 className="font-semibold text-gray-900 mb-3">Nova comissão (novo contrato)</h3>
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3 items-end">
          <label className="text-xs text-gray-600 sm:col-span-2">
            Descrição do aluguel / imóvel locado
            <input value={descCom} onChange={e => setDescCom(e.target.value)} placeholder="Ex: Sala 302 Ed. Central — inquilino João"
              className="mt-0.5 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </label>
          <label className="text-xs text-gray-600">
            Valor do 1º aluguel
            <input value={aluguel} onChange={e => setAluguel(e.target.value)} inputMode="decimal" placeholder="0,00"
              className="mt-0.5 w-40 px-3 py-2 border border-gray-300 rounded-lg text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </label>
          <div className="text-right">
            <p className="text-xs text-gray-500">Comissão (60%)</p>
            <p className="text-lg font-bold text-blue-700">{brl(comissaoPrevia)}</p>
          </div>
        </div>
        <div className="mt-3">
          <button
            onClick={() => run(() => adicionarComissao(descCom, toNum(aluguel)), () => { setAluguel(''); setDescCom('') })}
            disabled={salvando || toNum(aluguel) <= 0}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            + Registrar comissão
          </button>
        </div>
      </div>

      {/* Lista de comissões */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-5 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Comissões registradas</h3>
          <span className="text-xs text-gray-500">{comissoes.length} · {brl(totalComissoes)}</span>
        </div>
        {comissoes.length === 0 ? (
          <p className="px-5 py-6 text-sm text-gray-400 text-center">Nenhuma comissão registrada ainda.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 border-b border-gray-100">
                <th className="text-left px-5 py-2 font-medium">Imóvel / descrição</th>
                <th className="text-right px-5 py-2 font-medium">1º aluguel</th>
                <th className="text-right px-5 py-2 font-medium">Comissão (60%)</th>
                <th className="text-center px-5 py-2 font-medium">Data</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {comissoes.map(c => (
                <tr key={c.id} className="border-b border-gray-50 last:border-0 group">
                  <td className="px-5 py-3 text-gray-900">{c.descricao || '—'}</td>
                  <td className="px-5 py-3 text-right text-gray-700 whitespace-nowrap">{brl(c.valor_aluguel)}</td>
                  <td className="px-5 py-3 text-right font-semibold text-blue-700 whitespace-nowrap">{brl(c.valor_comissao)}</td>
                  <td className="px-5 py-3 text-center text-gray-400 whitespace-nowrap">{dataBR(c.created_at?.slice(0, 10) ?? null)}</td>
                  <td className="px-3 py-3 text-right">
                    <button onClick={() => { if (confirm('Excluir esta comissão?')) run(() => excluirComissao(c.id)) }} disabled={salvando}
                      className="text-xs text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 transition-opacity">excluir</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Novo pagamento */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h3 className="font-semibold text-gray-900 mb-3">Registrar pagamento ao funcionário</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <label className="text-xs text-gray-600 sm:col-span-1">
            Valor pago
            <input value={valorPag} onChange={e => setValorPag(e.target.value)} inputMode="decimal" placeholder="0,00"
              className="mt-0.5 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-right focus:outline-none focus:ring-2 focus:ring-green-500" />
          </label>
          <label className="text-xs text-gray-600">
            Data
            <input type="date" value={dataPag} onChange={e => setDataPag(e.target.value)}
              className="mt-0.5 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
          </label>
          <label className="text-xs text-gray-600">
            Observação (opcional)
            <input value={descPag} onChange={e => setDescPag(e.target.value)} placeholder="Ex: referente à sala 302"
              className="mt-0.5 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
          </label>
        </div>
        <div className="mt-3">
          <button
            onClick={() => run(() => adicionarPagamento(descPag, toNum(valorPag), dataPag || null), () => { setValorPag(''); setDescPag('') })}
            disabled={salvando || toNum(valorPag) <= 0}
            className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 transition-colors disabled:opacity-50"
          >
            + Registrar pagamento
          </button>
        </div>
      </div>

      {/* Lista de pagamentos */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-5 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Pagamentos feitos</h3>
          <span className="text-xs text-gray-500">{pagamentos.length} · {brl(totalPago)}</span>
        </div>
        {pagamentos.length === 0 ? (
          <p className="px-5 py-6 text-sm text-gray-400 text-center">Nenhum pagamento registrado ainda.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 border-b border-gray-100">
                <th className="text-left px-5 py-2 font-medium">Observação</th>
                <th className="text-center px-5 py-2 font-medium">Data</th>
                <th className="text-right px-5 py-2 font-medium">Valor</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {pagamentos.map(p => (
                <tr key={p.id} className="border-b border-gray-50 last:border-0 group">
                  <td className="px-5 py-3 text-gray-900">{p.descricao || '—'}</td>
                  <td className="px-5 py-3 text-center text-gray-500 whitespace-nowrap">{dataBR(p.data_pagamento)}</td>
                  <td className="px-5 py-3 text-right font-semibold text-green-700 whitespace-nowrap">{brl(p.valor)}</td>
                  <td className="px-3 py-3 text-right">
                    <button onClick={() => { if (confirm('Excluir este pagamento?')) run(() => excluirPagamento(p.id)) }} disabled={salvando}
                      className="text-xs text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 transition-opacity">excluir</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

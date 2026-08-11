'use client'

// Histórico de pagamentos do imóvel, com EDIÇÃO por registro (corrige dado lançado
// errado: status, valor pago, valor original, data do pagamento e observação) e opção
// de excluir um lançamento feito por engano. Extras/Descontos continuam sendo geridos
// no card da empresa (adicionar/remover).

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { editarPagamento, excluirPagamento } from '@/app/actions/empresas'

type Item = { descricao: string | null; valor: number }
export type PagamentoRow = {
  id: string
  ano: number
  mes: number
  status: string
  valor_original: number | null
  valor_pago: number | null
  data_pagamento: string | null
  observacao: string | null
  extras: Item[]
  descontos: Item[]
}

const brl = (n: number) => 'R$ ' + n.toLocaleString('pt-BR', { minimumFractionDigits: 2 })
const soma = (itens: Item[]) => itens.reduce((s, e) => s + (e.valor ?? 0), 0)

// texto do input → número (aceita vírgula); vazio => null
function toNum(s: string): number | null {
  const c = (s ?? '').trim().replace(/\s/g, '')
  if (!c) return null
  const n = parseFloat(c.includes(',') ? c.replace(/\./g, '').replace(',', '.') : c)
  return Number.isFinite(n) ? n : null
}
const paraTexto = (n: number | null) => (n != null ? String(n).replace('.', ',') : '')

export default function HistoricoPagamentos({ empresaId, imovelId, pagamentos }: {
  empresaId: string; imovelId: string; pagamentos: PagamentoRow[]
}) {
  const router = useRouter()
  const [editando, setEditando] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  // Campos em edição
  const [status, setStatus] = useState('pago')
  const [valorOriginal, setValorOriginal] = useState('')
  const [valorPago, setValorPago] = useState('')
  const [dataPagamento, setDataPagamento] = useState('')
  const [observacao, setObservacao] = useState('')

  function abrirEdicao(p: PagamentoRow) {
    setEditando(p.id)
    setErro(null)
    setStatus(p.status || 'pago')
    setValorOriginal(paraTexto(p.valor_original))
    setValorPago(paraTexto(p.valor_pago))
    setDataPagamento(p.data_pagamento || '')
    setObservacao(p.observacao || '')
  }

  async function salvar(p: PagamentoRow) {
    setSalvando(true); setErro(null)
    try {
      const r = await editarPagamento(p.id, empresaId, imovelId, {
        status,
        valor_pago: toNum(valorPago),
        valor_original: toNum(valorOriginal),
        data_pagamento: dataPagamento || null,
        observacao: observacao || null,
      })
      if (!r.ok) { setErro(r.erro); return }
      setEditando(null)
      router.refresh()
    } finally {
      setSalvando(false)
    }
  }

  async function excluir(p: PagamentoRow) {
    const nomeMes = new Date(p.ano, p.mes - 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
    if (!confirm(`Excluir o registro de ${nomeMes}? Esta ação não pode ser desfeita.`)) return
    setSalvando(true); setErro(null)
    try {
      const r = await excluirPagamento(p.id, empresaId, imovelId)
      if (!r.ok) { setErro(r.erro); return }
      setEditando(null)
      router.refresh()
    } finally {
      setSalvando(false)
    }
  }

  if (pagamentos.length === 0) {
    return <p className="text-sm text-gray-400 text-center py-4">Nenhum pagamento registrado.</p>
  }

  return (
    <div className="space-y-2">
      {erro && <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{erro}</div>}
      {pagamentos.map(p => {
        const statusColor = p.status === 'pago' ? 'bg-green-100 text-green-700' : p.status === 'atrasado' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
        const nomeMes = new Date(p.ano, p.mes - 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
        const emEdicao = editando === p.id

        if (emEdicao) {
          return (
            <div key={p.id} className="border border-blue-200 bg-blue-50/40 rounded-lg p-3">
              <p className="text-sm font-semibold text-gray-900 capitalize mb-2">{nomeMes}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="text-xs text-gray-600">
                  Status
                  <select value={status} onChange={e => setStatus(e.target.value)}
                    className="mt-0.5 w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm bg-white">
                    <option value="pago">Pago</option>
                    <option value="atrasado">Atrasado</option>
                    <option value="pendente">Pendente</option>
                  </select>
                </label>
                <label className="text-xs text-gray-600">
                  Data do pagamento
                  <input type="date" value={dataPagamento} onChange={e => setDataPagamento(e.target.value)}
                    className="mt-0.5 w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm" />
                </label>
                <label className="text-xs text-gray-600">
                  Valor original (aluguel)
                  <input type="text" inputMode="decimal" value={valorOriginal} onChange={e => setValorOriginal(e.target.value)}
                    placeholder="0,00" className="mt-0.5 w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm text-right" />
                </label>
                <label className="text-xs text-gray-600">
                  Valor pago (com juros, se houver)
                  <input type="text" inputMode="decimal" value={valorPago} onChange={e => setValorPago(e.target.value)}
                    placeholder="0,00" className="mt-0.5 w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm text-right" />
                </label>
                <label className="text-xs text-gray-600 sm:col-span-2">
                  Observação (opcional)
                  <input type="text" value={observacao} onChange={e => setObservacao(e.target.value)}
                    className="mt-0.5 w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm" />
                </label>
              </div>
              <div className="flex items-center justify-between mt-3">
                <button onClick={() => excluir(p)} disabled={salvando}
                  className="text-xs font-medium text-red-600 hover:text-red-800 disabled:opacity-50">🗑 Excluir registro</button>
                <div className="flex items-center gap-2">
                  <button onClick={() => setEditando(null)} disabled={salvando}
                    className="text-sm text-gray-500 px-3 py-1.5 rounded-lg hover:bg-gray-100">Cancelar</button>
                  <button onClick={() => salvar(p)} disabled={salvando}
                    className="text-sm font-semibold text-white bg-green-600 px-4 py-1.5 rounded-lg hover:bg-green-700 disabled:opacity-60">
                    {salvando ? 'Salvando…' : 'Salvar'}
                  </button>
                </div>
              </div>
            </div>
          )
        }

        return (
          <div key={p.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0 group">
            <div>
              <p className="text-sm font-medium text-gray-900 capitalize">{nomeMes}</p>
              {p.data_pagamento && (
                <p className="text-xs text-gray-400">Pago em {new Date(p.data_pagamento + 'T12:00:00').toLocaleDateString('pt-BR')}</p>
              )}
              {p.extras.length > 0 && (
                <p className="text-xs text-indigo-600 font-medium">
                  + Extras: {brl(soma(p.extras))} · {p.extras.map(e => e.descricao || 'extra').join(', ')}
                </p>
              )}
              {p.descontos.length > 0 && (
                <p className="text-xs text-rose-600 font-medium">
                  − Descontos: {brl(soma(p.descontos))} · {p.descontos.map(d => d.descricao || 'desconto').join(', ')}
                </p>
              )}
              {p.observacao && <p className="text-xs text-gray-400">{p.observacao}</p>}
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{brl(p.valor_pago ?? p.valor_original ?? 0)}</p>
                {p.valor_pago != null && p.valor_original != null && p.valor_pago > p.valor_original && (
                  <p className="text-xs text-red-500">+{brl(p.valor_pago - p.valor_original)} juros</p>
                )}
              </div>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColor}`}>
                {p.status === 'pago' ? 'Pago' : p.status === 'atrasado' ? 'Atrasado' : 'Pendente'}
              </span>
              <button onClick={() => abrirEdicao(p)}
                className="text-xs font-medium text-blue-600 hover:text-blue-800 opacity-0 group-hover:opacity-100 transition-opacity"
                title="Editar registro">✏️ Editar</button>
            </div>
          </div>
        )
      })}
    </div>
  )
}

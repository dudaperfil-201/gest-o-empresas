'use client'

import { useState } from 'react'
import { registrarPagamento } from '@/app/actions/empresas'

const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

export default function PagamentoForm({ imovelId, empresaId, valorAluguel, juros, mesAtual, anoAtual }: {
  imovelId: string
  empresaId: string
  valorAluguel: number
  juros: number
  mesAtual: number
  anoAtual: number
}) {
  const [mes, setMes] = useState(mesAtual)
  const [ano, setAno] = useState(anoAtual)
  const [dataPagamento, setDataPagamento] = useState(new Date().toISOString().slice(0, 10))
  const [loading, setLoading] = useState(false)
  const [sucesso, setSucesso] = useState(false)

  const vencimento = new Date(ano, mes - 1, 10)
  const pagamento = new Date(dataPagamento + 'T12:00:00')
  const diasAtraso = Math.max(0, Math.floor((pagamento.getTime() - vencimento.getTime()) / 86400000))
  const mesesAtraso = diasAtraso > 0 ? Math.ceil(diasAtraso / 30) : 0
  const valorJuros = mesesAtraso > 0 ? valorAluguel * (juros / 100) * mesesAtraso : 0
  const valorTotal = valorAluguel + valorJuros

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const fd = new FormData()
    fd.append('imovel_id', imovelId)
    fd.append('empresa_id', empresaId)
    fd.append('mes', String(mes))
    fd.append('ano', String(ano))
    fd.append('valor_original', String(valorAluguel))
    fd.append('valor_pago', String(valorTotal))
    fd.append('data_pagamento', dataPagamento)
    const obs = (e.currentTarget.querySelector('[name=observacao]') as HTMLInputElement)?.value
    if (obs) fd.append('observacao', obs)
    await registrarPagamento(fd)
    setLoading(false)
    setSucesso(true)
    setTimeout(() => setSucesso(false), 3000)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Mês</label>
          <select value={mes} onChange={e => setMes(parseInt(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            {MESES.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Ano</label>
          <input type="number" value={ano} onChange={e => setAno(parseInt(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Data do pagamento</label>
          <input type="date" value={dataPagamento} onChange={e => setDataPagamento(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Observação</label>
          <input name="observacao" placeholder="Opcional"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
      </div>

      <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-1">
        <div className="flex justify-between text-gray-600">
          <span>Aluguel base</span>
          <span>R$ {valorAluguel.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
        </div>
        {valorJuros > 0 && (
          <div className="flex justify-between text-red-600">
            <span>Juros ({mesesAtraso}× {juros}% = {mesesAtraso * juros}%) — {diasAtraso} dias atraso</span>
            <span>R$ {valorJuros.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
          </div>
        )}
        <div className="flex justify-between font-semibold text-gray-900 border-t border-gray-200 pt-1 mt-1">
          <span>Total</span>
          <span>R$ {valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
        </div>
      </div>

      <button type="submit" disabled={loading}
        className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-60">
        {sucesso ? '✓ Registrado!' : loading ? 'Salvando...' : '✓ Registrar pagamento'}
      </button>
    </form>
  )
}

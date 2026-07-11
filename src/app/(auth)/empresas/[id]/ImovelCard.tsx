'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { alternarPagamento, registrarPagamentoComAtraso } from '@/app/actions/empresas'

interface Props {
  imovel: { id: string; endereco: string; valor_aluguel: number | null }
  empresaId: string
  pago: boolean
  atrasado: boolean
  disponivel: boolean
}

export default function ImovelCard({ imovel, empresaId, pago, atrasado, disponivel }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [estaPago, setEstaPago] = useState(pago)
  const [estaAtrasado, setEstaAtrasado] = useState(atrasado)
  useEffect(() => setEstaPago(pago), [pago])
  useEffect(() => setEstaAtrasado(atrasado), [atrasado])

  const [modalAberto, setModalAberto] = useState(false)
  const [valorTexto, setValorTexto] = useState('')

  async function handlePagou() {
    setLoading(true)
    setEstaPago(v => !v) // feedback imediato
    setEstaAtrasado(false)
    try {
      await alternarPagamento(imovel.id, empresaId)
      router.refresh()
    } catch {
      setEstaPago(pago) // desfaz se der erro
      setEstaAtrasado(atrasado)
    } finally {
      setLoading(false)
    }
  }

  async function confirmarAtraso() {
    const valor = parseFloat(valorTexto.replace(',', '.'))
    if (isNaN(valor) || valor <= 0) return
    setLoading(true)
    try {
      await registrarPagamentoComAtraso(imovel.id, empresaId, valor)
      setEstaAtrasado(true)
      setEstaPago(false)
      setModalAberto(false)
      setValorTexto('')
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={`flex items-center justify-between border rounded-xl px-5 py-4 transition-all ${
      disponivel ? 'bg-red-50 border-red-300 hover:border-red-400' : 'bg-white border-gray-200 hover:border-gray-300'
    }`}>
      <Link href={`/empresas/${empresaId}/imoveis/${imovel.id}`} className="flex-1 min-w-0">
        <p className={`font-medium truncate ${disponivel ? 'text-red-700' : 'text-gray-900'}`}>{imovel.endereco}</p>
        <p className={`text-sm mt-0.5 ${disponivel ? 'text-red-500' : 'text-gray-500'}`}>
          R$ {(imovel.valor_aluguel ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
        </p>
      </Link>

      {disponivel ? (
        <span className="ml-4 shrink-0 text-sm font-bold px-5 py-2 rounded-lg text-white bg-red-600">
          DISPONÍVEL
        </span>
      ) : (
        <div className="ml-4 shrink-0 flex gap-2">
          <button
            onClick={handlePagou}
            disabled={loading}
            className={`text-sm font-semibold px-4 py-2 rounded-lg text-white transition-colors disabled:opacity-60 ${
              estaPago ? 'bg-green-700 hover:bg-green-800' : 'bg-green-600 hover:bg-green-700'
            }`}
          >
            {estaPago ? '✓ PAGO' : 'PAGOU'}
          </button>
          <button
            onClick={() => setModalAberto(true)}
            disabled={loading}
            className={`text-sm font-semibold px-4 py-2 rounded-lg text-white transition-colors disabled:opacity-60 ${
              estaAtrasado ? 'bg-amber-600 hover:bg-amber-700' : 'bg-amber-500 hover:bg-amber-600'
            }`}
          >
            {estaAtrasado ? '✓ COM ATRASO' : 'PAGOU COM ATRASO'}
          </button>
        </div>
      )}

      {modalAberto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => !loading && setModalAberto(false)}
        >
          <div className="bg-white rounded-xl p-5 w-full max-w-sm shadow-xl" onClick={e => e.stopPropagation()}>
            <h3 className="font-semibold text-gray-900">Pagamento com atraso</h3>
            <p className="text-sm text-gray-500 mt-0.5 truncate">{imovel.endereco}</p>
            <p className="text-xs text-gray-400 mt-3">
              Aluguel cadastrado: R$ {(imovel.valor_aluguel ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
            <label className="block text-xs font-medium text-gray-600 mt-3 mb-1">Valor pago (com multa)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              autoFocus
              value={valorTexto}
              onChange={e => setValorTexto(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') confirmarAtraso() }}
              placeholder="0,00"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
            <div className="flex gap-2 mt-4">
              <button
                onClick={confirmarAtraso}
                disabled={loading || parseFloat(valorTexto.replace(',', '.')) > 0 === false}
                className="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-semibold hover:bg-amber-700 transition-colors disabled:opacity-60"
              >
                {loading ? 'Salvando...' : 'Confirmar'}
              </button>
              <button
                onClick={() => setModalAberto(false)}
                disabled={loading}
                className="px-4 py-2 border border-gray-300 text-gray-600 rounded-lg text-sm hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

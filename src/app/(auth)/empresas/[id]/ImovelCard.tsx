'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { alternarPagamento, registrarPagamentoComAtraso, registrarExtras } from '@/app/actions/empresas'

interface Props {
  imovel: { id: string; endereco: string; valor_aluguel: number | null }
  empresaId: string
  pago: boolean
  atrasado: boolean
  disponivel: boolean
  valorExtras?: number | null
  descricaoExtras?: string | null
}

const brl = (v: number) => v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })

export default function ImovelCard({ imovel, empresaId, pago, atrasado, disponivel, valorExtras, descricaoExtras }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [estaPago, setEstaPago] = useState(pago)
  const [estaAtrasado, setEstaAtrasado] = useState(atrasado)
  useEffect(() => setEstaPago(pago), [pago])
  useEffect(() => setEstaAtrasado(atrasado), [atrasado])

  const [modalAberto, setModalAberto] = useState(false)
  const [valorTexto, setValorTexto] = useState('')

  // Extras (energia, condomínio, etc.) pagos além do aluguel.
  const [extrasValor, setExtrasValor] = useState<number>(valorExtras ?? 0)
  const [extrasDesc, setExtrasDesc] = useState<string>(descricaoExtras ?? '')
  useEffect(() => setExtrasValor(valorExtras ?? 0), [valorExtras])
  useEffect(() => setExtrasDesc(descricaoExtras ?? ''), [descricaoExtras])
  const [modalExtras, setModalExtras] = useState(false)
  const [extrasValorTexto, setExtrasValorTexto] = useState('')
  const [extrasDescTexto, setExtrasDescTexto] = useState('')

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

  function abrirExtras() {
    setExtrasValorTexto(extrasValor > 0 ? String(extrasValor) : '')
    setExtrasDescTexto(extrasDesc)
    setModalExtras(true)
  }

  async function confirmarExtras() {
    const valor = parseFloat(extrasValorTexto.replace(',', '.')) || 0
    setLoading(true)
    try {
      await registrarExtras(imovel.id, empresaId, valor, extrasDescTexto)
      setExtrasValor(valor > 0 ? valor : 0)
      setExtrasDesc(extrasDescTexto.trim())
      setModalExtras(false)
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  const temExtras = extrasValor > 0

  return (
    <div className={`flex items-center justify-between border rounded-xl px-5 py-4 transition-all ${
      disponivel ? 'bg-red-50 border-red-300 hover:border-red-400' : 'bg-white border-gray-200 hover:border-gray-300'
    }`}>
      <Link href={`/empresas/${empresaId}/imoveis/${imovel.id}`} className="flex-1 min-w-0">
        <p className={`font-medium truncate ${disponivel ? 'text-red-700' : 'text-gray-900'}`}>{imovel.endereco}</p>
        <p className={`text-sm mt-0.5 ${disponivel ? 'text-red-500' : 'text-gray-500'}`}>
          R$ {brl(imovel.valor_aluguel ?? 0)}
        </p>
        {temExtras && (
          <p className="text-xs mt-0.5 text-indigo-600 font-medium truncate">
            + Extras: R$ {brl(extrasValor)}{extrasDesc ? ` · ${extrasDesc}` : ''}
          </p>
        )}
      </Link>

      {disponivel ? (
        <span className="ml-4 shrink-0 text-sm font-bold px-5 py-2 rounded-lg text-white bg-red-600">
          DISPONÍVEL
        </span>
      ) : (
        <div className="ml-4 shrink-0 flex flex-wrap gap-2 justify-end">
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
          <button
            onClick={abrirExtras}
            disabled={loading}
            className={`text-sm font-semibold px-4 py-2 rounded-lg text-white transition-colors disabled:opacity-60 ${
              temExtras ? 'bg-indigo-700 hover:bg-indigo-800' : 'bg-indigo-500 hover:bg-indigo-600'
            }`}
          >
            {temExtras ? '✓ EXTRAS' : 'EXTRAS'}
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
              Aluguel cadastrado: R$ {brl(imovel.valor_aluguel ?? 0)}
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

      {modalExtras && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => !loading && setModalExtras(false)}
        >
          <div className="bg-white rounded-xl p-5 w-full max-w-sm shadow-xl" onClick={e => e.stopPropagation()}>
            <h3 className="font-semibold text-gray-900">Extras (além do aluguel)</h3>
            <p className="text-sm text-gray-500 mt-0.5 truncate">{imovel.endereco}</p>
            <p className="text-xs text-gray-400 mt-3">
              Energia, condomínio, etc. Entra no total do mês, registrado à parte do aluguel.
            </p>
            <label className="block text-xs font-medium text-gray-600 mt-3 mb-1">Valor dos extras (R$)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              autoFocus
              value={extrasValorTexto}
              onChange={e => setExtrasValorTexto(e.target.value)}
              placeholder="0,00"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <label className="block text-xs font-medium text-gray-600 mt-3 mb-1">Descrição (opcional)</label>
            <input
              type="text"
              value={extrasDescTexto}
              onChange={e => setExtrasDescTexto(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') confirmarExtras() }}
              placeholder="ex: energia + condomínio"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <div className="flex gap-2 mt-4">
              <button
                onClick={confirmarExtras}
                disabled={loading}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-60"
              >
                {loading ? 'Salvando...' : 'Salvar'}
              </button>
              <button
                onClick={() => setModalExtras(false)}
                disabled={loading}
                className="px-4 py-2 border border-gray-300 text-gray-600 rounded-lg text-sm hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
            </div>
            <p className="text-[11px] text-gray-400 mt-3">Para remover os extras, salve com o valor 0.</p>
          </div>
        </div>
      )}
    </div>
  )
}

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { alternarPagamento } from '@/app/actions/empresas'

interface Props {
  imovel: { id: string; endereco: string; valor_aluguel: number | null }
  empresaId: string
  pago: boolean
}

export default function ImovelCard({ imovel, empresaId, pago }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [estaPago, setEstaPago] = useState(pago)
  useEffect(() => setEstaPago(pago), [pago])

  async function handlePagou() {
    setLoading(true)
    setEstaPago(v => !v) // feedback imediato
    try {
      await alternarPagamento(imovel.id, empresaId)
      router.refresh()
    } catch {
      setEstaPago(pago) // desfaz se der erro
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-between bg-white border border-gray-200 rounded-xl px-5 py-4 hover:border-gray-300 transition-all">
      <Link href={`/empresas/${empresaId}/imoveis/${imovel.id}`} className="flex-1 min-w-0">
        <p className="font-medium text-gray-900 truncate">{imovel.endereco}</p>
        <p className="text-sm text-gray-500 mt-0.5">
          R$ {(imovel.valor_aluguel ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
        </p>
      </Link>

      <button
        onClick={handlePagou}
        disabled={loading}
        className={`ml-4 shrink-0 text-sm font-semibold px-5 py-2 rounded-lg text-white transition-colors disabled:opacity-60 ${
          estaPago ? 'bg-green-700 hover:bg-green-800' : 'bg-green-600 hover:bg-green-700'
        }`}
      >
        {estaPago ? '✓ PAGO' : 'PAGOU'}
      </button>
    </div>
  )
}

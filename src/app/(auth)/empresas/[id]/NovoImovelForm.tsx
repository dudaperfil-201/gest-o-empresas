'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { criarImovel } from '@/app/actions/empresas'

export default function NovoImovelForm({ empresaId }: { empresaId: string }) {
  const router = useRouter()
  const [aberto, setAberto] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const fd = new FormData(e.currentTarget)
    fd.append('empresa_id', empresaId)
    await criarImovel(fd)
    router.refresh()
    setLoading(false)
    setAberto(false)
  }

  return (
    <div className="relative shrink-0">
      <button
        onClick={() => setAberto(v => !v)}
        className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors whitespace-nowrap"
      >
        + Adicionar imóvel
      </button>

      {aberto && (
        <div className="absolute right-0 mt-2 z-20 w-80 bg-white border border-gray-200 rounded-xl shadow-lg p-4">
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <input name="endereco" required placeholder="Nome do imóvel"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <input name="valor_aluguel" type="number" step="0.01" placeholder="Valor do aluguel (R$)"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <div className="flex gap-2">
              <button type="submit" disabled={loading}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-60">
                {loading ? 'Salvando...' : 'Adicionar'}
              </button>
              <button type="button" onClick={() => setAberto(false)}
                className="px-4 py-2 border border-gray-300 text-gray-600 rounded-lg text-sm hover:bg-gray-50 transition-colors">
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}

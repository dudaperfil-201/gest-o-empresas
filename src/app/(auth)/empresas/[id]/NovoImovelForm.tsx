'use client'

import { useState } from 'react'
import { criarImovel } from '@/app/actions/empresas'

export default function NovoImovelForm({ empresaId }: { empresaId: string }) {
  const [loading, setLoading] = useState(false)
  const [sucesso, setSucesso] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const fd = new FormData(e.currentTarget)
    fd.append('empresa_id', empresaId)
    await criarImovel(fd)
    setLoading(false)
    setSucesso(true)
    ;(e.target as HTMLFormElement).reset()
    setTimeout(() => setSucesso(false), 3000)
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
      <input name="endereco" required placeholder="Endereço do imóvel"
        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
      <input name="valor_aluguel" type="number" step="0.01" required placeholder="Valor do aluguel (R$)"
        className="w-48 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
      <button type="submit" disabled={loading}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-60">
        {sucesso ? '✓ Salvo' : loading ? 'Salvando...' : 'Adicionar'}
      </button>
    </form>
  )
}

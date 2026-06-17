'use client'

import { useState } from 'react'
import Link from 'next/link'
import { apagarImovel, editarImovel } from '@/app/actions/empresas'

interface Props {
  imovel: { id: string; endereco: string; valor_aluguel: number | null; ativo: boolean }
  inquilinoNome: string | null
  statusColor: string
  statusLabel: string
  empresaId: string
}

export default function ImovelCard({ imovel, inquilinoNome, statusColor, statusLabel, empresaId }: Props) {
  const [editando, setEditando] = useState(false)
  const [confirmando, setConfirmando] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleApagar() {
    setLoading(true)
    await apagarImovel(imovel.id, empresaId)
  }

  async function handleEditar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const fd = new FormData(e.currentTarget)
    fd.append('id', imovel.id)
    fd.append('empresa_id', empresaId)
    await editarImovel(fd)
    setLoading(false)
    setEditando(false)
  }

  if (editando) {
    return (
      <form onSubmit={handleEditar} className="bg-white border border-blue-300 rounded-xl px-5 py-4 flex flex-col sm:flex-row gap-3">
        <input name="endereco" defaultValue={imovel.endereco} required
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        <input name="valor_aluguel" type="number" step="0.01" defaultValue={imovel.valor_aluguel ?? 0} required
          className="w-44 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        <div className="flex gap-2">
          <button type="submit" disabled={loading}
            className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-60">
            {loading ? '...' : 'Salvar'}
          </button>
          <button type="button" onClick={() => setEditando(false)}
            className="px-3 py-2 border border-gray-300 text-gray-600 rounded-lg text-sm hover:bg-gray-50">
            Cancelar
          </button>
        </div>
      </form>
    )
  }

  return (
    <div className="flex items-center justify-between bg-white border border-gray-200 rounded-xl px-5 py-4 hover:border-gray-300 transition-all">
      <Link href={`/empresas/${empresaId}/imoveis/${imovel.id}`} className="flex-1 min-w-0">
        <p className="font-medium text-gray-900">{imovel.endereco}</p>
        <p className="text-sm text-gray-500 mt-0.5">{inquilinoNome ?? 'Sem inquilino'}</p>
      </Link>
      <div className="flex items-center gap-3 ml-4">
        <span className="text-sm font-medium text-gray-700 hidden sm:block">
          R$ {(imovel.valor_aluguel ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
        </span>
        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusColor}`}>{statusLabel}</span>
        <button onClick={() => setEditando(true)}
          className="text-xs text-blue-600 border border-blue-200 px-2.5 py-1 rounded-lg hover:bg-blue-50 transition-colors">
          Editar
        </button>
        {confirmando ? (
          <div className="flex gap-1">
            <button onClick={handleApagar} disabled={loading}
              className="text-xs text-white bg-red-500 px-2.5 py-1 rounded-lg hover:bg-red-600 disabled:opacity-60">
              {loading ? '...' : 'Confirmar'}
            </button>
            <button onClick={() => setConfirmando(false)}
              className="text-xs text-gray-600 border border-gray-200 px-2.5 py-1 rounded-lg hover:bg-gray-50">
              Não
            </button>
          </div>
        ) : (
          <button onClick={() => setConfirmando(true)}
            className="text-xs text-red-600 border border-red-200 px-2.5 py-1 rounded-lg hover:bg-red-50 transition-colors">
            Apagar
          </button>
        )}
      </div>
    </div>
  )
}

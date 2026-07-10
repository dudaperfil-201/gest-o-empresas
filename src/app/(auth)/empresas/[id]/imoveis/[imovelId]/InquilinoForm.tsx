'use client'

import { useState } from 'react'
import { salvarInquilino } from '@/app/actions/empresas'

interface Inquilino {
  id: string
  nome: string
  cpf?: string
  telefone?: string
  email?: string
  data_inicio?: string
  juros_mes?: number
}

export default function InquilinoForm({ imovelId, empresaId, inquilino, valorAluguel }: {
  imovelId: string
  empresaId: string
  inquilino: Inquilino | null
  valorAluguel: number
}) {
  const [editing, setEditing] = useState(!inquilino)
  const [loading, setLoading] = useState(false)

  if (!editing && inquilino) {
    return (
      <div className="space-y-2">
        <div className="flex justify-between items-start">
          <div>
            <p className="font-medium text-gray-900">{inquilino.nome}</p>
            {inquilino.telefone && <p className="text-sm text-gray-500">Tel: {inquilino.telefone}</p>}
            {inquilino.email && <p className="text-sm text-gray-500">{inquilino.email}</p>}
            {inquilino.data_inicio && (
              <p className="text-sm text-gray-500">
                Início do contrato: {new Date(inquilino.data_inicio + 'T12:00:00').toLocaleDateString('pt-BR')}
              </p>
            )}
          </div>
          <button onClick={() => setEditing(true)} className="text-sm text-blue-600 hover:underline">Editar</button>
        </div>
      </div>
    )
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const fd = new FormData(e.currentTarget)
    fd.append('imovel_id', imovelId)
    fd.append('empresa_id', empresaId)
    if (inquilino) fd.append('id', inquilino.id)
    await salvarInquilino(fd)
    setLoading(false)
    setEditing(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Nome do inquilino *</label>
          <input name="nome" required defaultValue={inquilino?.nome}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Telefone</label>
          <input name="telefone" defaultValue={inquilino?.telefone ?? ''}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">E-mail</label>
          <input name="email" type="email" defaultValue={inquilino?.email ?? ''}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Data de início do contrato</label>
          <input name="data_inicio" type="date" defaultValue={inquilino?.data_inicio ?? ''}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Valor do aluguel (R$)</label>
          <input name="valor_aluguel" type="number" step="0.01" min="0" placeholder="0,00" defaultValue={valorAluguel || ''}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
      </div>
      <div className="flex gap-2">
        <button type="submit" disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-60">
          {loading ? 'Salvando...' : 'Salvar'}
        </button>
        {inquilino && (
          <button type="button" onClick={() => setEditing(false)}
            className="px-4 py-2 border border-gray-300 text-gray-600 rounded-lg text-sm hover:bg-gray-50 transition-colors">
            Cancelar
          </button>
        )}
      </div>
    </form>
  )
}

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { criarUsuario, alterarPapel, excluirUsuario, type UsuarioItem } from '@/app/actions/usuarios'

type Papel = 'imoveis' | 'ambos' | 'admin'

const PAPEL_LABEL: Record<Papel, string> = {
  imoveis: 'Imóveis',
  ambos: 'Imóveis + Financeiro',
  admin: 'Admin (tudo)',
}

export default function UsuariosCliente({ usuarios }: { usuarios: UsuarioItem[] }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')
  const [criado, setCriado] = useState<{ email: string; senha: string; papel: Papel } | null>(null)

  async function handleCriar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setErro('')
    setLoading(true)
    const form = e.currentTarget
    const fd = new FormData(form)
    const papel: Papel = fd.get('admin') === 'on' ? 'admin' : fd.get('financeiro') === 'on' ? 'ambos' : 'imoveis'
    try {
      const res = await criarUsuario(fd)
      if (res.ok) {
        setCriado({ email: (fd.get('email') as string).trim().toLowerCase(), senha: fd.get('senha') as string, papel })
        form.reset()
        router.refresh()
      } else {
        setErro(res.erro)
      }
    } finally {
      setLoading(false)
    }
  }

  async function handlePapel(id: string, papel: Papel) {
    setErro('')
    const res = await alterarPapel(id, papel)
    if (!res.ok) setErro(res.erro)
    router.refresh()
  }

  async function handleExcluir(id: string, email: string) {
    if (!confirm(`Remover o acesso de "${email}"? A pessoa não conseguirá mais entrar.`)) return
    setErro('')
    const res = await excluirUsuario(id)
    if (!res.ok) setErro(res.erro)
    router.refresh()
  }

  const link = typeof window !== 'undefined' ? window.location.origin : ''

  return (
    <div className="space-y-6">
      {erro && <p className="text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded-lg">{erro}</p>}

      {/* Acesso recém-criado — pronto para enviar */}
      {criado && (
        <div className="bg-green-50 border border-green-300 rounded-xl p-4">
          <p className="font-semibold text-green-800 mb-2">✅ Acesso criado! Envie estes dados para a pessoa:</p>
          <div className="text-sm text-gray-700 space-y-1 bg-white rounded-lg p-3 border border-green-200">
            <p><b>Link:</b> {link}</p>
            <p><b>E-mail:</b> {criado.email}</p>
            <p><b>Senha:</b> {criado.senha}</p>
            <p><b>Permissão:</b> {PAPEL_LABEL[criado.papel]}</p>
          </div>
          <button
            onClick={() => navigator.clipboard?.writeText(`Acesse: ${link}\nE-mail: ${criado.email}\nSenha: ${criado.senha}`)}
            className="mt-2 text-xs text-green-700 hover:underline"
          >
            📋 Copiar dados para enviar
          </button>
        </div>
      )}

      {/* Formulário de novo acesso */}
      <form onSubmit={handleCriar} className="bg-white border border-gray-200 rounded-xl p-5">
        <h3 className="font-medium text-gray-900 mb-3">Adicionar pessoa</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Nome</label>
            <input name="nome" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Nome da pessoa" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">E-mail *</label>
            <input name="email" type="email" required className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="pessoa@email.com" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Senha *</label>
            <input name="senha" required minLength={6} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="mínimo 6 caracteres" />
          </div>
        </div>

        {/* Seleção de módulos */}
        <div className="mt-4">
          <label className="block text-xs font-medium text-gray-600 mb-2">Permissões (o que a pessoa pode acessar)</label>
          <div className="flex flex-col gap-2 text-sm text-gray-700">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked disabled className="w-4 h-4 accent-blue-600" />
              🏢 Imóveis <span className="text-xs text-gray-400">(sempre incluído)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" name="financeiro" className="w-4 h-4 accent-green-600" />
              💰 Financeiro
            </label>
            <label className="flex items-center gap-2 cursor-pointer mt-1 pt-2 border-t border-gray-100">
              <input type="checkbox" name="admin" className="w-4 h-4 accent-gray-700" />
              👥 Administrador <span className="text-xs text-gray-400">(pode gerenciar usuários)</span>
            </label>
          </div>
        </div>

        <button type="submit" disabled={loading} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-60">
          {loading ? 'Criando...' : '+ Criar acesso'}
        </button>
      </form>

      {/* Lista de usuários */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <h3 className="font-medium text-gray-900 px-5 pt-5 pb-2">Pessoas com acesso ({usuarios.length})</h3>
        <div className="divide-y divide-gray-100">
          {usuarios.map(u => (
            <div key={u.id} className="flex items-center gap-3 px-5 py-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{u.nome || u.email}</p>
                <p className="text-xs text-gray-500 truncate">{u.email}</p>
              </div>
              {u.ehVoce ? (
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">Você · {PAPEL_LABEL[u.papel]}</span>
              ) : (
                <>
                  <select
                    value={u.papel}
                    onChange={e => handlePapel(u.id, e.target.value as Papel)}
                    className="text-xs border border-gray-300 rounded-lg px-2 py-1 bg-white"
                  >
                    <option value="imoveis">Imóveis</option>
                    <option value="ambos">Imóveis + Financeiro</option>
                    <option value="admin">Admin</option>
                  </select>
                  <button onClick={() => handleExcluir(u.id, u.email)} className="text-xs text-red-500 hover:text-red-700 px-2 py-1">
                    Remover
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { criarUsuario, atualizarPermissoes, excluirUsuario, type UsuarioItem } from '@/app/actions/usuarios'

type Papel = 'imoveis' | 'ambos' | 'admin'

const PAPEL_LABEL: Record<Papel, string> = {
  imoveis: 'Imóveis',
  ambos: 'Imóveis + Financeiro',
  admin: 'Admin (tudo)',
}

// Resumo curto dos módulos que a pessoa acessa (para a lista).
function resumoAcessos(u: UsuarioItem): string {
  const m = ['🏢 Imóveis']
  if (u.papel === 'ambos' || u.papel === 'admin') m.push('💰 Financeiro')
  if (u.frota) m.push('🚗 Frota')
  if (u.papel === 'admin') m.push('👥 Admin')
  return m.join(' · ')
}

export default function UsuariosCliente({ usuarios }: { usuarios: UsuarioItem[] }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')
  const [criado, setCriado] = useState<{ email: string; senha: string; papel: Papel; frota: boolean } | null>(null)

  // Painel de edição de permissões (por pessoa).
  const [editando, setEditando] = useState<UsuarioItem | null>(null)
  const [edFinanceiro, setEdFinanceiro] = useState(false)
  const [edFrota, setEdFrota] = useState(false)
  const [edAdmin, setEdAdmin] = useState(false)
  const [salvando, setSalvando] = useState(false)

  function abrirEdicao(u: UsuarioItem) {
    setErro('')
    setEditando(u)
    setEdFinanceiro(u.papel === 'ambos' || u.papel === 'admin')
    setEdFrota(u.frota)
    setEdAdmin(u.papel === 'admin')
  }

  async function salvarEdicao() {
    if (!editando) return
    setSalvando(true)
    setErro('')
    const papel: Papel = edAdmin ? 'admin' : edFinanceiro ? 'ambos' : 'imoveis'
    // Admin sempre vê a Frota; senão vale a caixinha.
    const res = await atualizarPermissoes(editando.id, papel, edAdmin ? true : edFrota)
    setSalvando(false)
    if (!res.ok) { setErro(res.erro); return }
    setEditando(null)
    router.refresh()
  }

  async function handleCriar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setErro('')
    setLoading(true)
    const form = e.currentTarget
    const fd = new FormData(form)
    const papel: Papel = fd.get('admin') === 'on' ? 'admin' : fd.get('financeiro') === 'on' ? 'ambos' : 'imoveis'
    const frota = fd.get('frota') === 'on' || papel === 'admin'
    try {
      const res = await criarUsuario(fd)
      if (res.ok) {
        setCriado({ email: (fd.get('email') as string).trim().toLowerCase(), senha: fd.get('senha') as string, papel, frota })
        form.reset()
        router.refresh()
      } else {
        setErro(res.erro)
      }
    } finally {
      setLoading(false)
    }
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
            <p><b>Permissão:</b> {PAPEL_LABEL[criado.papel]}{criado.frota ? ' + 🚗 Frota' : ''}</p>
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
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" name="frota" className="w-4 h-4 accent-amber-600" />
              🚗 Frota
            </label>
            <label className="flex items-center gap-2 cursor-pointer mt-1 pt-2 border-t border-gray-100">
              <input type="checkbox" name="admin" className="w-4 h-4 accent-gray-700" />
              👥 Administrador <span className="text-xs text-gray-400">(vê tudo e gerencia usuários)</span>
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
                <p className="text-xs text-gray-400 mt-0.5 truncate">{resumoAcessos(u)}</p>
              </div>
              {u.ehVoce ? (
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">Você</span>
              ) : (
                <>
                  <button onClick={() => abrirEdicao(u)} className="text-xs font-medium text-blue-600 hover:text-blue-800 border border-blue-200 rounded-lg px-3 py-1 hover:bg-blue-50">
                    ✏️ Editar
                  </button>
                  <button onClick={() => handleExcluir(u.id, u.email)} className="text-xs text-red-500 hover:text-red-700 px-2 py-1">
                    Remover
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Modal de edição de permissões */}
      {editando && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => !salvando && setEditando(null)}>
          <div className="bg-white rounded-xl p-5 w-full max-w-md shadow-xl" onClick={e => e.stopPropagation()}>
            <h3 className="font-semibold text-gray-900">Editar permissões</h3>
            <p className="text-sm text-gray-500 mt-0.5 truncate">{editando.nome || editando.email}</p>

            <div className="flex flex-col gap-2 text-sm text-gray-700 mt-4">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked disabled className="w-4 h-4 accent-blue-600" />
                🏢 Imóveis <span className="text-xs text-gray-400">(sempre incluído)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={edFinanceiro} onChange={e => setEdFinanceiro(e.target.checked)} className="w-4 h-4 accent-green-600" />
                💰 Financeiro
              </label>
              <label className={`flex items-center gap-2 ${edAdmin ? 'opacity-60' : 'cursor-pointer'}`}>
                <input type="checkbox" checked={edAdmin ? true : edFrota} disabled={edAdmin} onChange={e => setEdFrota(e.target.checked)} className="w-4 h-4 accent-amber-600" />
                🚗 Frota {edAdmin && <span className="text-xs text-gray-400">(admin já vê)</span>}
              </label>
              <label className="flex items-center gap-2 cursor-pointer mt-1 pt-2 border-t border-gray-100">
                <input type="checkbox" checked={edAdmin} onChange={e => setEdAdmin(e.target.checked)} className="w-4 h-4 accent-gray-700" />
                👥 Administrador <span className="text-xs text-gray-400">(vê tudo e gerencia usuários)</span>
              </label>
            </div>

            <div className="flex items-center justify-end gap-2 mt-5">
              <button onClick={() => setEditando(null)} disabled={salvando} className="px-4 py-2 text-sm text-gray-600 rounded-lg hover:bg-gray-100">Cancelar</button>
              <button onClick={salvarEdicao} disabled={salvando} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-60">
                {salvando ? 'Salvando…' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

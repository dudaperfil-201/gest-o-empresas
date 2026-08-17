'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { criarUsuario, atualizarPermissoes, excluirUsuario, type UsuarioItem, type Permissoes } from '@/app/actions/usuarios'

// As 5 categorias, na ordem em que aparecem.
const CATEGORIAS: { chave: keyof Permissoes; titulo: string; desc: string; cor: string }[] = [
  { chave: 'relatorios', titulo: '📊 Relatórios', desc: 'Relatório Mensal, Em Atraso e Break Even (leitura).', cor: 'accent-blue-600' },
  { chave: 'imoveis', titulo: '🏢 Imóveis', desc: 'Gestão de imóveis, inquilinos e pagamentos.', cor: 'accent-blue-600' },
  { chave: 'financeiro', titulo: '💰 Financeiro', desc: 'Módulo financeiro e investimentos.', cor: 'accent-green-600' },
  { chave: 'frota', titulo: '🚗 Frota', desc: 'Cadastro e gestão dos veículos.', cor: 'accent-amber-600' },
  { chave: 'administrador', titulo: '👥 Administrador', desc: 'Acesso a TUDO + gerenciar usuários.', cor: 'accent-gray-700' },
]

const VAZIO: Permissoes = { relatorios: false, imoveis: false, financeiro: false, frota: false, administrador: false }

// Resumo curto das categorias liberadas (para a lista).
function resumo(u: UsuarioItem): string {
  if (u.administrador) return '👥 Administrador (tudo)'
  const m: string[] = []
  if (u.imoveis) m.push('🏢 Imóveis')
  if (u.financeiro) m.push('💰 Financeiro')
  if (u.frota) m.push('🚗 Frota')
  if (u.relatorios) m.push('📊 Relatórios')
  return m.length ? m.join(' · ') : 'Sem acesso'
}

export default function UsuariosCliente({ usuarios }: { usuarios: UsuarioItem[] }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')
  const [criado, setCriado] = useState<{ email: string; senha: string; perms: Permissoes } | null>(null)

  // Permissões do formulário de criação.
  const [novo, setNovo] = useState<Permissoes>({ ...VAZIO, imoveis: true, relatorios: true })

  // Painel de edição.
  const [editando, setEditando] = useState<UsuarioItem | null>(null)
  const [edPerms, setEdPerms] = useState<Permissoes>({ ...VAZIO })
  const [salvando, setSalvando] = useState(false)

  function abrirEdicao(u: UsuarioItem) {
    setErro('')
    setEditando(u)
    setEdPerms({ relatorios: u.relatorios, imoveis: u.imoveis, financeiro: u.financeiro, frota: u.frota, administrador: u.administrador })
  }

  async function salvarEdicao() {
    if (!editando) return
    setSalvando(true)
    setErro('')
    const res = await atualizarPermissoes(editando.id, edPerms)
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
    try {
      const res = await criarUsuario(fd)
      if (res.ok) {
        setCriado({ email: (fd.get('email') as string).trim().toLowerCase(), senha: fd.get('senha') as string, perms: novo })
        form.reset()
        setNovo({ ...VAZIO, imoveis: true, relatorios: true })
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

  // Bloco reutilizável das 5 caixinhas. `comNames` gera os inputs com name (para o
  // FormData da criação). Quando ADMINISTRADOR está marcado, as outras aparecem
  // marcadas e travadas (admin = tudo), mas o estado real das outras é preservado.
  const caixas = (perms: Permissoes, setPerms: (p: Permissoes) => void, comNames: boolean) => (
    <div className="flex flex-col gap-2">
      {CATEGORIAS.map(cat => {
        const ehAdmin = cat.chave === 'administrador'
        const travado = !ehAdmin && perms.administrador // admin implica tudo
        const marcado = ehAdmin ? perms.administrador : (perms.administrador || perms[cat.chave])
        return (
          <label key={cat.chave} className={`flex items-start gap-2 rounded-lg border px-3 py-2 transition-colors ${marcado ? 'border-blue-300 bg-blue-50/50' : 'border-gray-200'} ${travado ? 'opacity-70' : 'cursor-pointer hover:bg-gray-50'}`}>
            <input
              type="checkbox"
              {...(comNames ? { name: cat.chave } : {})}
              checked={marcado}
              disabled={travado}
              onChange={e => setPerms({ ...perms, [cat.chave]: e.target.checked })}
              className={`mt-0.5 w-4 h-4 ${cat.cor}`}
            />
            <span className="text-sm">
              <span className="font-medium text-gray-800">{cat.titulo}</span>
              <span className="block text-xs text-gray-500">{cat.desc}{travado && ' — incluído no Administrador'}</span>
            </span>
          </label>
        )
      })}
      {/* Quando admin está marcado, garante que o FormData envie as outras como ligadas. */}
      {comNames && perms.administrador && CATEGORIAS.filter(c => c.chave !== 'administrador').map(c => (
        <input key={c.chave} type="hidden" name={c.chave} value="on" />
      ))}
    </div>
  )

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
            <p><b>Acessos:</b> {resumo({ ...criado.perms, id: '', email: '', nome: '', ehVoce: false })}</p>
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

        <div className="mt-4">
          <label className="block text-xs font-medium text-gray-600 mb-2">Categorias liberadas</label>
          {caixas(novo, setNovo, true)}
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
                <p className="text-xs text-gray-400 mt-0.5 truncate">{resumo(u)}</p>
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
          <div className="bg-white rounded-xl p-5 w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h3 className="font-semibold text-gray-900">Editar permissões</h3>
            <p className="text-sm text-gray-500 mt-0.5 truncate mb-4">{editando.nome || editando.email}</p>

            {caixas(edPerms, setEdPerms, false)}

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

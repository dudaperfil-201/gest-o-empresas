'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { criarUsuario, atualizarPermissoes, excluirUsuario, type UsuarioItem } from '@/app/actions/usuarios'

type Papel = 'relatorios' | 'imoveis' | 'ambos' | 'admin'

const PAPEL_LABEL: Record<Papel, string> = {
  relatorios: 'Somente Relatórios',
  imoveis: 'Imóveis',
  ambos: 'Imóveis + Financeiro',
  admin: 'Admin (tudo)',
}

// Opções do tipo de acesso (base). A Frota é uma caixa extra à parte.
const TIPOS: { valor: Papel; titulo: string; desc: string }[] = [
  { valor: 'relatorios', titulo: '📊 Somente Relatórios', desc: 'Só vê os relatórios (Mensal, Em Atraso, Break Even). Não mexe em nada.' },
  { valor: 'imoveis', titulo: '🏢 Imóveis', desc: 'Gestão de imóveis, inquilinos e pagamentos.' },
  { valor: 'ambos', titulo: '💰 Imóveis + Financeiro', desc: 'Tudo dos Imóveis mais o módulo Financeiro.' },
  { valor: 'admin', titulo: '👥 Administrador', desc: 'Vê tudo e gerencia usuários.' },
]

// Resumo curto dos módulos que a pessoa acessa (para a lista).
function resumoAcessos(u: UsuarioItem): string {
  if (u.papel === 'relatorios') return '📊 Somente Relatórios'
  const m = ['🏢 Imóveis']
  if (u.papel === 'ambos' || u.papel === 'admin') m.push('💰 Financeiro')
  if (u.frota) m.push('🚗 Frota')
  if (u.papel === 'admin') m.push('👥 Admin')
  return m.join(' · ')
}

const temFrota = (p: Papel) => p === 'imoveis' || p === 'ambos'

export default function UsuariosCliente({ usuarios }: { usuarios: UsuarioItem[] }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')
  const [criado, setCriado] = useState<{ email: string; senha: string; papel: Papel; frota: boolean } | null>(null)

  // Estado do formulário de criação.
  const [novoTipo, setNovoTipo] = useState<Papel>('imoveis')
  const [novoFrota, setNovoFrota] = useState(false)

  // Painel de edição de permissões (por pessoa).
  const [editando, setEditando] = useState<UsuarioItem | null>(null)
  const [edTipo, setEdTipo] = useState<Papel>('imoveis')
  const [edFrota, setEdFrota] = useState(false)
  const [salvando, setSalvando] = useState(false)

  function abrirEdicao(u: UsuarioItem) {
    setErro('')
    setEditando(u)
    setEdTipo(u.papel)
    setEdFrota(u.frota)
  }

  async function salvarEdicao() {
    if (!editando) return
    setSalvando(true)
    setErro('')
    const res = await atualizarPermissoes(editando.id, edTipo, temFrota(edTipo) ? edFrota : false)
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
    const frota = temFrota(novoTipo) && novoFrota
    try {
      const res = await criarUsuario(fd)
      if (res.ok) {
        setCriado({ email: (fd.get('email') as string).trim().toLowerCase(), senha: fd.get('senha') as string, papel: novoTipo, frota })
        form.reset()
        setNovoTipo('imoveis')
        setNovoFrota(false)
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

  // Bloco reutilizável de escolha do tipo + Frota (usado na criação e na edição).
  const seletorTipo = (tipo: Papel, setTipo: (p: Papel) => void, frota: boolean, setFrota: (b: boolean) => void, comNames: boolean) => (
    <div className="flex flex-col gap-2">
      {TIPOS.map(t => (
        <label key={t.valor} className={`flex items-start gap-2 rounded-lg border px-3 py-2 cursor-pointer transition-colors ${tipo === t.valor ? 'border-blue-400 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'}`}>
          <input
            type="radio" {...(comNames ? { name: 'tipo' } : {})} value={t.valor}
            checked={tipo === t.valor} onChange={() => setTipo(t.valor)}
            className="mt-0.5 w-4 h-4 accent-blue-600"
          />
          <span className="text-sm">
            <span className="font-medium text-gray-800">{t.titulo}</span>
            <span className="block text-xs text-gray-500">{t.desc}</span>
          </span>
        </label>
      ))}
      <label className={`flex items-center gap-2 mt-1 text-sm ${temFrota(tipo) ? 'text-gray-700 cursor-pointer' : 'text-gray-300'}`}>
        <input
          type="checkbox" {...(comNames ? { name: 'frota' } : {})}
          checked={temFrota(tipo) ? frota : false} disabled={!temFrota(tipo)}
          onChange={e => setFrota(e.target.checked)}
          className="w-4 h-4 accent-amber-600"
        />
        🚗 Frota {!temFrota(tipo) && <span className="text-xs text-gray-300">(não se aplica)</span>}
      </label>
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

        {/* Tipo de acesso */}
        <div className="mt-4">
          <label className="block text-xs font-medium text-gray-600 mb-2">Tipo de acesso</label>
          {seletorTipo(novoTipo, setNovoTipo, novoFrota, setNovoFrota, true)}
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
          <div className="bg-white rounded-xl p-5 w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h3 className="font-semibold text-gray-900">Editar permissões</h3>
            <p className="text-sm text-gray-500 mt-0.5 truncate mb-4">{editando.nome || editando.email}</p>

            {seletorTipo(edTipo, setEdTipo, edFrota, setEdFrota, false)}

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

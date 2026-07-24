'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { loginInquilino } from '@/app/actions/inquilinos'

export default function LoginInquilinoPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)

  async function entrar(e: React.FormEvent) {
    e.preventDefault()
    setErro('')
    setCarregando(true)
    try {
      const r = await loginInquilino(email, senha)
      if (r.ok) {
        router.replace('/area-inquilino/portal')
      } else {
        setErro(r.erro ?? 'Não foi possível entrar.')
        setCarregando(false)
      }
    } catch {
      setErro('Erro ao entrar. Tente de novo.')
      setCarregando(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <h1 className="text-xl font-semibold text-gray-900">Área do Inquilino</h1>
          <p className="text-sm text-gray-500 mt-1">Acesse seu contrato e boletos</p>
        </div>

        <form onSubmit={entrar} className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">E-mail</label>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)} autoFocus required
              placeholder="seu@email.com"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Senha</label>
            <input
              type="password" value={senha} onChange={e => setSenha(e.target.value)} required
              placeholder="Senha recebida"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {erro && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{erro}</p>}

          <button
            type="submit" disabled={carregando}
            className="w-full py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-60"
          >
            {carregando ? 'Entrando...' : 'Entrar'}
          </button>

          <p className="text-xs text-gray-400 text-center">
            Recebeu seu acesso com a administração? Use o e-mail e a senha enviados.
          </p>
        </form>
      </div>
    </div>
  )
}

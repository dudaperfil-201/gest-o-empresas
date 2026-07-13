import Link from 'next/link'
import { exigirAdmin } from '@/lib/auth'
import { listarUsuarios } from '@/app/actions/usuarios'
import UsuariosCliente from './UsuariosCliente'

export default async function UsuariosPage() {
  await exigirAdmin() // só admin acessa
  const usuarios = await listarUsuarios()

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
        <Link href="/" className="hover:text-blue-600">Início</Link>
        <span>/</span>
        <span className="text-gray-900 font-medium">Usuários</span>
      </div>

      <div className="flex items-center gap-3 mb-6">
        <span className="text-3xl">👥</span>
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Usuários</h2>
          <p className="text-sm text-gray-500 mt-0.5">Crie acessos e defina o que cada pessoa pode ver</p>
        </div>
      </div>

      <UsuariosCliente usuarios={usuarios} />
    </div>
  )
}

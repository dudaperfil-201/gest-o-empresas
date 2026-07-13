import { redirect } from 'next/navigation'
import { logout } from '@/app/actions/auth'
import { getSessao } from '@/lib/auth'
import Link from 'next/link'

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const sessao = await getSessao()
  if (!sessao) redirect('/login')
  const ehAdmin = sessao.ehAdmin
  const podeFinanceiro = sessao.podeFinanceiro

  return (
    <div className="min-h-screen flex flex-col bg-slate-100">
      {/* Topo: apenas o logotipo */}
      <header className="bg-white shadow-sm px-4 py-2 flex items-center justify-center">
        <Link href="/" className="shrink-0">
          <img src="/logo-hase.png" alt="HASE Management" className="h-48 w-auto object-contain" />
        </Link>
      </header>

      {/* Conteúdo: botões compactos à esquerda, ao lado das empresas */}
      <div className="flex-1 flex gap-4 p-4 md:p-6 pb-24 md:pb-6">
        <nav className="hidden md:flex flex-col gap-2 shrink-0">
          <Link href="/" className="px-4 py-2 text-sm font-medium text-blue-700 border border-blue-200 rounded-lg bg-white hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all whitespace-nowrap">
            🏠 Início
          </Link>
          <Link href="/imoveis" className="px-4 py-2 text-sm font-medium text-blue-700 border border-blue-200 rounded-lg bg-white hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all whitespace-nowrap">
            🏢 Imóveis
          </Link>
          {podeFinanceiro && (
            <Link href="/financeiro" className="px-4 py-2 text-sm font-medium text-green-700 border border-green-200 rounded-lg bg-white hover:bg-green-600 hover:text-white hover:border-green-600 transition-all whitespace-nowrap">
              💰 Financeiro
            </Link>
          )}
          {ehAdmin && (
            <Link href="/usuarios" className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg bg-white hover:bg-gray-700 hover:text-white hover:border-gray-700 transition-all whitespace-nowrap">
              👥 Usuários
            </Link>
          )}
          <form action={logout} className="mt-1">
            <button type="submit" className="w-full px-4 py-2 text-sm text-gray-500 border border-gray-200 rounded-lg bg-white hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all">
              Sair
            </button>
          </form>
        </nav>

        <main className="flex-1 min-w-0">{children}</main>
      </div>

      {/* Menu inferior (mobile) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-10 bg-white border-t border-gray-200 flex items-center justify-around px-1 py-2">
        <Link href="/" className="flex flex-col items-center gap-0.5 px-3 py-1 text-blue-700">
          <span className="text-xl">🏠</span>
          <span className="text-[10px] font-medium">Início</span>
        </Link>
        <Link href="/imoveis" className="flex flex-col items-center gap-0.5 px-3 py-1 text-blue-700">
          <span className="text-xl">🏢</span>
          <span className="text-[10px] font-medium">Imóveis</span>
        </Link>
        {podeFinanceiro && (
          <Link href="/financeiro" className="flex flex-col items-center gap-0.5 px-3 py-1 text-green-700">
            <span className="text-xl">💰</span>
            <span className="text-[10px] font-medium">Financeiro</span>
          </Link>
        )}
        {ehAdmin && (
          <Link href="/usuarios" className="flex flex-col items-center gap-0.5 px-3 py-1 text-gray-600">
            <span className="text-xl">👥</span>
            <span className="text-[10px] font-medium">Usuários</span>
          </Link>
        )}
        <form action={logout}>
          <button type="submit" className="flex flex-col items-center gap-0.5 px-4 py-1 text-gray-500">
            <span className="text-xl">🚪</span>
            <span className="text-[10px] font-medium">Sair</span>
          </button>
        </form>
      </nav>
    </div>
  )
}

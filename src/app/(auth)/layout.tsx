import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { logout } from '@/app/actions/auth'
import Link from 'next/link'

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: usuario } = await supabase
    .from('usuarios')
    .select('nome')
    .eq('id', user.id)
    .single()

  return (
    <div className="min-h-screen flex flex-col bg-slate-100">
      <header className="bg-white shadow-sm px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <div>
          <h1 className="text-lg font-bold text-gray-900">Gestão Empresas</h1>
          <p className="text-xs text-gray-500">Controle de aluguéis</p>
        </div>

        <nav className="hidden md:flex items-center gap-2">
          <Link href="/" className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium text-blue-700 border border-blue-200 rounded-full bg-white hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all">
            🏢 Empresas
          </Link>
          <Link href="/relatorio" className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium text-blue-700 border border-blue-200 rounded-full bg-white hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all">
            📊 Relatório
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-gray-700 hidden sm:block">{usuario?.nome ?? user.email}</span>
          <form action={logout}>
            <button type="submit" className="text-sm text-gray-500 border border-gray-200 px-3 py-1.5 rounded-full hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all">
              Sair
            </button>
          </form>
        </div>
      </header>

      <main className="flex-1 p-4 md:p-6 pb-24 md:pb-6">{children}</main>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-10 bg-white border-t border-gray-200 flex items-center justify-around px-1 py-2">
        <Link href="/" className="flex flex-col items-center gap-0.5 px-4 py-1 text-blue-700">
          <span className="text-xl">🏢</span>
          <span className="text-[10px] font-medium">Empresas</span>
        </Link>
        <Link href="/relatorio" className="flex flex-col items-center gap-0.5 px-4 py-1 text-blue-700">
          <span className="text-xl">📊</span>
          <span className="text-[10px] font-medium">Relatório</span>
        </Link>
      </nav>
    </div>
  )
}

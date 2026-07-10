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
      {/* Topo: apenas o logotipo */}
      <header className="bg-white shadow-sm px-4 py-2 flex items-center justify-center">
        <Link href="/" className="shrink-0">
          <img src="/logo-hase.png" alt="HASE Management" className="h-48 w-auto object-contain" />
        </Link>
      </header>

      <div className="flex-1 flex">
        {/* Menu lateral vertical (desktop) */}
        <aside className="hidden md:flex md:flex-col w-52 shrink-0 bg-white border-r border-gray-200 p-4">
          <nav className="flex flex-col gap-2">
            <Link href="/" className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-700 rounded-lg hover:bg-blue-600 hover:text-white transition-all">
              🏢 Empresas
            </Link>
            <Link href="/relatorio" className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-700 rounded-lg hover:bg-blue-600 hover:text-white transition-all">
              📊 Relatório
            </Link>
          </nav>

          <div className="mt-auto pt-4 border-t border-gray-100">
            <p className="text-sm font-medium text-gray-700 px-1 mb-2 truncate">{usuario?.nome ?? user.email}</p>
            <form action={logout}>
              <button type="submit" className="w-full text-sm text-gray-500 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all">
                Sair
              </button>
            </form>
          </div>
        </aside>

        <main className="flex-1 p-4 md:p-6 pb-24 md:pb-6">{children}</main>
      </div>

      {/* Menu inferior (mobile) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-10 bg-white border-t border-gray-200 flex items-center justify-around px-1 py-2">
        <Link href="/" className="flex flex-col items-center gap-0.5 px-4 py-1 text-blue-700">
          <span className="text-xl">🏢</span>
          <span className="text-[10px] font-medium">Empresas</span>
        </Link>
        <Link href="/relatorio" className="flex flex-col items-center gap-0.5 px-4 py-1 text-blue-700">
          <span className="text-xl">📊</span>
          <span className="text-[10px] font-medium">Relatório</span>
        </Link>
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

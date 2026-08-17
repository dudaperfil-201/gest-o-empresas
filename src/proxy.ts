import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const { pathname } = request.nextUrl

  // Rotas de cron têm autenticação própria (secret / user-agent) — não exigem sessão.
  if (pathname.startsWith('/api/cron')) return supabaseResponse

  // Área do Inquilino: portal externo com login PRÓPRIO (cookie inquilino_session).
  // Não usa a sessão da equipe (Supabase Auth); o portal se protege sozinho.
  if (pathname.startsWith('/area-inquilino')) return supabaseResponse

  if (!user && pathname !== '/login') {
    return NextResponse.redirect(new URL('/login', request.url))
  }
  if (user && pathname === '/login') {
    return NextResponse.redirect(new URL('/', request.url))
  }

  // Controle de acesso por MÓDULO (permissões independentes na tabela usuarios).
  // Feito aqui no proxy para cobrir também páginas client (ex.: /empresas/nova).
  // ADMINISTRADOR (ou o dono) enxerga tudo. Rota sem permissão → primeira disponível.
  if (user) {
    const { data: perfil } = await supabase
      .from('usuarios')
      .select('relatorios, imoveis, financeiro, frota, administrador')
      .eq('id', user.id)
      .maybeSingle()
    const OWNER = 'dudaperfil@gmail.com'
    const ehAdmin = perfil?.administrador === true || user.email === OWNER
    const perms = {
      imoveis: ehAdmin || perfil?.imoveis === true,
      financeiro: ehAdmin || perfil?.financeiro === true,
      frota: ehAdmin || perfil?.frota === true,
      relatorios: ehAdmin || perfil?.relatorios === true,
    }

    const p = pathname
    const precisa: keyof typeof perms | 'admin' | null =
      (p.startsWith('/imoveis') || p.startsWith('/empresas') || p.startsWith('/lembretes')) ? 'imoveis' :
      (p.startsWith('/financeiro') || p.startsWith('/comissao')) ? 'financeiro' :
      p.startsWith('/frota') ? 'frota' :
      p.startsWith('/usuarios') ? 'admin' :
      (p.startsWith('/relatorio') || p.startsWith('/break-even') || p.startsWith('/documentos') || p.startsWith('/api/relatorio') || p.startsWith('/api/break-even')) ? 'relatorios' :
      null

    if (precisa) {
      const liberado = precisa === 'admin' ? ehAdmin : perms[precisa]
      if (!liberado) {
        const destino = perms.imoveis ? '/imoveis' : perms.financeiro ? '/financeiro' : perms.frota ? '/frota' : perms.relatorios ? '/relatorio' : '/'
        if (destino !== p) return NextResponse.redirect(new URL(destino, request.url))
      }
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}

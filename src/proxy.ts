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

  // Usuário "Somente Relatórios": só pode navegar nos relatórios (Mensal, Em Atraso,
  // Break Even) e nos exports de Excel deles. Qualquer outra rota volta pra /relatorio.
  if (user) {
    const { data: perfil } = await supabase
      .from('usuarios')
      .select('papel')
      .eq('id', user.id)
      .maybeSingle()
    if (perfil?.papel === 'relatorios') {
      const permitido =
        pathname.startsWith('/relatorio') ||        // /relatorio e /relatorio-atraso
        pathname.startsWith('/break-even') ||
        pathname.startsWith('/api/relatorio') ||    // exports do mensal e do atraso
        pathname.startsWith('/api/break-even')
      if (!permitido) return NextResponse.redirect(new URL('/relatorio', request.url))
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}

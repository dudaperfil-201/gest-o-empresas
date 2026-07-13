import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

// Dono do sistema — sempre admin (segurança extra caso a tabela usuarios falhe).
export const OWNER_EMAIL = 'dudaperfil@gmail.com'

// Papéis:
// - imoveis: só o módulo Imóveis
// - ambos:   Imóveis + Financeiro (sem gerenciar usuários)
// - admin:   tudo (Imóveis + Financeiro + gerenciar usuários)
export type Papel = 'imoveis' | 'ambos' | 'admin'

export function normalizarPapel(bruto?: string | null): Papel {
  if (bruto === 'admin') return 'admin'
  if (bruto === 'ambos') return 'ambos'
  return 'imoveis'
}

export interface Sessao {
  userId: string
  email: string
  nome: string
  papel: Papel
  podeFinanceiro: boolean
  ehAdmin: boolean
}

// Retorna a sessão atual com o papel (permissão). null se não logado.
export async function getSessao(): Promise<Sessao | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: perfil } = await supabase
    .from('usuarios')
    .select('nome, papel')
    .eq('id', user.id)
    .maybeSingle()

  const papel = normalizarPapel(perfil?.papel ?? (user.email === OWNER_EMAIL ? 'admin' : 'imoveis'))

  return {
    userId: user.id,
    email: user.email ?? '',
    nome: perfil?.nome ?? user.email ?? '',
    papel,
    podeFinanceiro: papel === 'ambos' || papel === 'admin',
    ehAdmin: papel === 'admin',
  }
}

// Guarda: exige acesso ao Financeiro, senão manda para os Imóveis.
export async function exigirFinanceiro(): Promise<Sessao> {
  const sessao = await getSessao()
  if (!sessao) redirect('/login')
  if (!sessao.podeFinanceiro) redirect('/imoveis')
  return sessao
}

// Guarda: exige admin (gerenciar usuários), senão manda para os Imóveis.
export async function exigirAdmin(): Promise<Sessao> {
  const sessao = await getSessao()
  if (!sessao) redirect('/login')
  if (!sessao.ehAdmin) redirect('/imoveis')
  return sessao
}

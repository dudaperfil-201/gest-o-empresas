import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

// Dono do sistema — sempre admin (segurança extra caso a tabela usuarios falhe).
export const OWNER_EMAIL = 'dudaperfil@gmail.com'

export type Papel = 'admin' | 'imoveis'

export interface Sessao {
  userId: string
  email: string
  nome: string
  papel: Papel
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

  const papelBruto = perfil?.papel ?? (user.email === OWNER_EMAIL ? 'admin' : 'imoveis')
  const papel: Papel = papelBruto === 'admin' ? 'admin' : 'imoveis'

  return {
    userId: user.id,
    email: user.email ?? '',
    nome: perfil?.nome ?? user.email ?? '',
    papel,
    ehAdmin: papel === 'admin',
  }
}

// Guarda de rota: exige admin, senão manda para os Imóveis (área permitida a todos).
export async function exigirAdmin(): Promise<Sessao> {
  const sessao = await getSessao()
  if (!sessao) redirect('/login')
  if (!sessao.ehAdmin) redirect('/imoveis')
  return sessao
}

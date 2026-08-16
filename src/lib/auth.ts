import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

// Dono do sistema — sempre admin (segurança extra caso a tabela usuarios falhe).
export const OWNER_EMAIL = 'dudaperfil@gmail.com'

// Papéis:
// - relatorios: acesso SÓ de leitura aos relatórios (Mensal, Em Atraso, Break Even).
//               Não vê nem gerencia nada além disso.
// - imoveis:    só o módulo Imóveis
// - ambos:      Imóveis + Financeiro (sem gerenciar usuários)
// - admin:      tudo (Imóveis + Financeiro + gerenciar usuários)
export type Papel = 'relatorios' | 'imoveis' | 'ambos' | 'admin'

export function normalizarPapel(bruto?: string | null): Papel {
  if (bruto === 'admin') return 'admin'
  if (bruto === 'ambos') return 'ambos'
  if (bruto === 'relatorios') return 'relatorios'
  return 'imoveis'
}

export interface Sessao {
  userId: string
  email: string
  nome: string
  papel: Papel
  podeFinanceiro: boolean
  podeFrota: boolean
  soRelatorios: boolean
  ehAdmin: boolean
}

// Retorna a sessão atual com o papel (permissão). null se não logado.
export async function getSessao(): Promise<Sessao | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: perfil } = await supabase
    .from('usuarios')
    .select('nome, papel, frota')
    .eq('id', user.id)
    .maybeSingle()

  const papel = normalizarPapel(perfil?.papel ?? (user.email === OWNER_EMAIL ? 'admin' : 'imoveis'))
  const ehAdmin = papel === 'admin'
  const soRelatorios = papel === 'relatorios'

  return {
    userId: user.id,
    email: user.email ?? '',
    nome: perfil?.nome ?? user.email ?? '',
    papel,
    podeFinanceiro: papel === 'ambos' || ehAdmin,
    // Frota: liberada 1 a 1 pelo admin. O admin/dono sempre enxerga.
    podeFrota: ehAdmin || perfil?.frota === true,
    soRelatorios,
    ehAdmin,
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

// Guarda: exige acesso à Frota, senão manda para os Imóveis.
export async function exigirFrota(): Promise<Sessao> {
  const sessao = await getSessao()
  if (!sessao) redirect('/login')
  if (!sessao.podeFrota) redirect('/imoveis')
  return sessao
}

// Guarda: exige acesso de GESTÃO (não pode ser "somente relatórios"). Quem é só
// relatórios cai nos relatórios. Use nas telas de gestão (imóveis, empresas, etc).
export async function exigirGestao(): Promise<Sessao> {
  const sessao = await getSessao()
  if (!sessao) redirect('/login')
  if (sessao.soRelatorios) redirect('/relatorio')
  return sessao
}

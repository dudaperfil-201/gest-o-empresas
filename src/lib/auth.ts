import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

// Dono do sistema — sempre administrador (segurança extra caso a tabela usuarios falhe).
export const OWNER_EMAIL = 'dudaperfil@gmail.com'

// Permissões por MÓDULO, independentes (marcadas por pessoa na tela Usuários):
// RELATÓRIOS, IMÓVEIS, FINANCEIRO, FROTA e ADMINISTRADOR. ADMINISTRADOR implica
// acesso a tudo (todas as capacidades abaixo ficam true) + gerenciar usuários.
export interface Sessao {
  userId: string
  email: string
  nome: string
  ehAdmin: boolean
  podeImoveis: boolean
  podeFinanceiro: boolean
  podeFrota: boolean
  podeRelatorios: boolean
}

// Retorna a sessão atual com as permissões. null se não logado.
export async function getSessao(): Promise<Sessao | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: perfil } = await supabase
    .from('usuarios')
    .select('nome, relatorios, imoveis, financeiro, frota, administrador')
    .eq('id', user.id)
    .maybeSingle()

  const ehAdmin = perfil?.administrador === true || user.email === OWNER_EMAIL

  return {
    userId: user.id,
    email: user.email ?? '',
    nome: perfil?.nome ?? user.email ?? '',
    ehAdmin,
    // Admin enxerga tudo; os demais dependem de cada caixinha.
    podeImoveis: ehAdmin || perfil?.imoveis === true,
    podeFinanceiro: ehAdmin || perfil?.financeiro === true,
    podeFrota: ehAdmin || perfil?.frota === true,
    podeRelatorios: ehAdmin || perfil?.relatorios === true,
  }
}

// Primeira rota disponível para a pessoa (para onde mandar após bloqueio ou login).
// '/' (home) só quando não há nenhum módulo — a home mostra o aviso "sem acesso".
export function primeiraRota(s: Pick<Sessao, 'podeImoveis' | 'podeFinanceiro' | 'podeFrota' | 'podeRelatorios'>): string {
  if (s.podeImoveis) return '/imoveis'
  if (s.podeFinanceiro) return '/financeiro'
  if (s.podeFrota) return '/frota'
  if (s.podeRelatorios) return '/relatorios'
  return '/'
}

// Guarda genérica: exige uma capacidade (campo booleano da Sessao). Sem sessão →
// login; sem a permissão → primeira rota disponível da pessoa.
async function exigir(campo: 'ehAdmin' | 'podeImoveis' | 'podeFinanceiro' | 'podeFrota' | 'podeRelatorios'): Promise<Sessao> {
  const sessao = await getSessao()
  if (!sessao) redirect('/login')
  if (!sessao[campo]) redirect(primeiraRota(sessao))
  return sessao
}

export const exigirImoveis = () => exigir('podeImoveis')
export const exigirFinanceiro = () => exigir('podeFinanceiro')
export const exigirFrota = () => exigir('podeFrota')
export const exigirRelatorios = () => exigir('podeRelatorios')
export const exigirAdmin = () => exigir('ehAdmin')
// Compat: telas de GESTÃO de imóveis (imóveis, empresas) usam este nome.
export const exigirGestao = () => exigir('podeImoveis')

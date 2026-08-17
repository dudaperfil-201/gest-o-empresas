'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { getSessao, OWNER_EMAIL } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

// As 5 permissões independentes por módulo.
export type Permissoes = {
  relatorios: boolean
  imoveis: boolean
  financeiro: boolean
  frota: boolean
  administrador: boolean
}

export interface UsuarioItem extends Permissoes {
  id: string
  email: string
  nome: string
  ehVoce: boolean
}

// `papel` legado é mantido em sincronia só por compatibilidade (a coluna pode ter
// NOT NULL e algum leitor antigo pode existir). O acesso real vem das 5 colunas.
function papelLegado(p: Permissoes): string {
  if (p.administrador) return 'admin'
  if (p.financeiro) return 'ambos'
  if (p.imoveis) return 'imoveis'
  if (p.relatorios) return 'relatorios'
  return 'imoveis'
}

// Todas as operações na tabela `usuarios` usam o client ADMIN (service role, sem
// sessão de usuário) para passar por cima da RLS — o client normal do servidor
// age como o usuário logado e a RLS bloquearia o insert/update.

export async function listarUsuarios(): Promise<UsuarioItem[]> {
  const sessao = await getSessao()
  if (!sessao?.ehAdmin) return []

  const admin = createAdminClient()
  const { data } = await admin.auth.admin.listUsers()
  const { data: perfis } = await admin.from('usuarios').select('id, nome, relatorios, imoveis, financeiro, frota, administrador')
  const mapa = new Map((perfis ?? []).map(p => [p.id, p]))

  return (data?.users ?? []).map(u => {
    const perfil = mapa.get(u.id)
    // Dono é sempre administrador (mesmo sem linha na tabela).
    const ehDono = u.email === OWNER_EMAIL
    return {
      id: u.id,
      email: u.email ?? '',
      nome: perfil?.nome ?? '',
      relatorios: perfil?.relatorios === true,
      imoveis: perfil?.imoveis === true,
      financeiro: perfil?.financeiro === true,
      frota: perfil?.frota === true,
      administrador: ehDono || perfil?.administrador === true,
      ehVoce: u.id === sessao.userId,
    }
  })
}

// Lê as 5 caixinhas do FormData.
function lerPermissoes(fd: FormData): Permissoes {
  return {
    relatorios: fd.get('relatorios') === 'on',
    imoveis: fd.get('imoveis') === 'on',
    financeiro: fd.get('financeiro') === 'on',
    frota: fd.get('frota') === 'on',
    administrador: fd.get('administrador') === 'on',
  }
}

export async function criarUsuario(formData: FormData): Promise<{ ok: true } | { ok: false; erro: string }> {
  const sessao = await getSessao()
  if (!sessao?.ehAdmin) return { ok: false, erro: 'Sem permissão.' }

  const nome = (formData.get('nome') as string || '').trim()
  const email = (formData.get('email') as string || '').trim().toLowerCase()
  const senha = (formData.get('senha') as string || '')
  const perms = lerPermissoes(formData)

  if (!email || !senha) return { ok: false, erro: 'E-mail e senha são obrigatórios.' }
  if (senha.length < 6) return { ok: false, erro: 'A senha precisa ter ao menos 6 caracteres.' }

  const admin = createAdminClient()
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: senha,
    email_confirm: true, // já entra sem precisar confirmar e-mail
  })
  if (error || !data.user) return { ok: false, erro: error?.message ?? 'Erro ao criar usuário.' }

  const { error: erroPerfil } = await admin.from('usuarios').upsert({
    id: data.user.id, nome: nome || email, ...perms, papel: papelLegado(perms),
  })
  if (erroPerfil) return { ok: false, erro: 'Usuário criado, mas falhou ao salvar as permissões: ' + erroPerfil.message }

  revalidatePath('/usuarios')
  return { ok: true }
}

// Atualiza as 5 permissões (caixas independentes) de um usuário.
export async function atualizarPermissoes(
  id: string,
  perms: Permissoes,
): Promise<{ ok: true } | { ok: false; erro: string }> {
  const sessao = await getSessao()
  if (!sessao?.ehAdmin) return { ok: false, erro: 'Sem permissão.' }
  if (id === sessao.userId) return { ok: false, erro: 'Você não pode alterar as suas próprias permissões.' }

  const admin = createAdminClient()
  // Garante o nome (coluna obrigatória) mesmo para linhas ainda inexistentes.
  const { data: existente } = await admin.from('usuarios').select('nome').eq('id', id).maybeSingle()
  let nome = existente?.nome
  if (!nome) {
    const { data: u } = await admin.auth.admin.getUserById(id)
    nome = u.user?.email ?? 'Usuário'
  }
  const { error } = await admin.from('usuarios').upsert({ id, nome, ...perms, papel: papelLegado(perms) })
  if (error) return { ok: false, erro: error.message }

  revalidatePath('/usuarios')
  return { ok: true }
}

export async function excluirUsuario(id: string): Promise<{ ok: true } | { ok: false; erro: string }> {
  const sessao = await getSessao()
  if (!sessao?.ehAdmin) return { ok: false, erro: 'Sem permissão.' }
  if (id === sessao.userId) return { ok: false, erro: 'Você não pode excluir a si mesmo.' }

  const admin = createAdminClient()
  const { error } = await admin.auth.admin.deleteUser(id)
  if (error) return { ok: false, erro: error.message }
  await admin.from('usuarios').delete().eq('id', id)

  revalidatePath('/usuarios')
  return { ok: true }
}

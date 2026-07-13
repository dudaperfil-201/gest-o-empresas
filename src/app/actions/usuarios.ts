'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { getSessao, OWNER_EMAIL, type Papel } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

export interface UsuarioItem {
  id: string
  email: string
  nome: string
  papel: Papel
  ehVoce: boolean
}

// Todas as operações na tabela `usuarios` usam o client ADMIN (service role, sem
// sessão de usuário) para passar por cima da RLS — o client normal do servidor
// age como o usuário logado e a RLS bloquearia o insert/update.

export async function listarUsuarios(): Promise<UsuarioItem[]> {
  const sessao = await getSessao()
  if (!sessao?.ehAdmin) return []

  const admin = createAdminClient()
  const { data } = await admin.auth.admin.listUsers()
  const { data: perfis } = await admin.from('usuarios').select('id, nome, papel')
  const mapa = new Map((perfis ?? []).map(p => [p.id, p]))

  return (data?.users ?? []).map(u => {
    const perfil = mapa.get(u.id)
    const papelBruto = perfil?.papel ?? (u.email === OWNER_EMAIL ? 'admin' : 'imoveis')
    return {
      id: u.id,
      email: u.email ?? '',
      nome: perfil?.nome ?? '',
      papel: (papelBruto === 'admin' ? 'admin' : 'imoveis') as Papel,
      ehVoce: u.id === sessao.userId,
    }
  })
}

export async function criarUsuario(formData: FormData): Promise<{ ok: true } | { ok: false; erro: string }> {
  const sessao = await getSessao()
  if (!sessao?.ehAdmin) return { ok: false, erro: 'Sem permissão.' }

  const nome = (formData.get('nome') as string || '').trim()
  const email = (formData.get('email') as string || '').trim().toLowerCase()
  const senha = (formData.get('senha') as string || '')
  const papel: Papel = (formData.get('papel') as string) === 'admin' ? 'admin' : 'imoveis'

  if (!email || !senha) return { ok: false, erro: 'E-mail e senha são obrigatórios.' }
  if (senha.length < 6) return { ok: false, erro: 'A senha precisa ter ao menos 6 caracteres.' }

  const admin = createAdminClient()
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: senha,
    email_confirm: true, // já entra sem precisar confirmar e-mail
  })
  if (error || !data.user) return { ok: false, erro: error?.message ?? 'Erro ao criar usuário.' }

  const { error: erroPerfil } = await admin.from('usuarios').upsert({ id: data.user.id, nome: nome || email, papel })
  if (erroPerfil) return { ok: false, erro: 'Usuário criado, mas falhou ao salvar o papel: ' + erroPerfil.message }

  revalidatePath('/usuarios')
  return { ok: true }
}

export async function alterarPapel(id: string, papel: Papel): Promise<{ ok: true } | { ok: false; erro: string }> {
  const sessao = await getSessao()
  if (!sessao?.ehAdmin) return { ok: false, erro: 'Sem permissão.' }
  if (id === sessao.userId) return { ok: false, erro: 'Você não pode alterar o seu próprio papel.' }

  const admin = createAdminClient()
  // Garante o nome (coluna obrigatória) mesmo para linhas ainda inexistentes.
  const { data: existente } = await admin.from('usuarios').select('nome').eq('id', id).maybeSingle()
  let nome = existente?.nome
  if (!nome) {
    const { data: u } = await admin.auth.admin.getUserById(id)
    nome = u.user?.email ?? 'Usuário'
  }
  const { error } = await admin.from('usuarios').upsert({ id, nome, papel })
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

'use server'

import { createClient } from '@/lib/supabase/server'
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

export async function listarUsuarios(): Promise<UsuarioItem[]> {
  const sessao = await getSessao()
  if (!sessao?.ehAdmin) return []

  const admin = createAdminClient()
  const { data } = await admin.auth.admin.listUsers()

  const supabase = await createClient()
  const { data: perfis } = await supabase.from('usuarios').select('id, nome, papel')
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

  const supabase = await createClient()
  const { error: erroPerfil } = await supabase.from('usuarios').upsert({ id: data.user.id, nome: nome || email, papel })
  if (erroPerfil) return { ok: false, erro: 'Usuário criado, mas falhou ao salvar o papel: ' + erroPerfil.message }

  revalidatePath('/usuarios')
  return { ok: true }
}

export async function alterarPapel(id: string, papel: Papel): Promise<{ ok: true } | { ok: false; erro: string }> {
  const sessao = await getSessao()
  if (!sessao?.ehAdmin) return { ok: false, erro: 'Sem permissão.' }
  if (id === sessao.userId) return { ok: false, erro: 'Você não pode alterar o seu próprio papel.' }

  const supabase = await createClient()
  const { error } = await supabase.from('usuarios').update({ papel }).eq('id', id)
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

  const supabase = await createClient()
  await supabase.from('usuarios').delete().eq('id', id)

  revalidatePath('/usuarios')
  return { ok: true }
}

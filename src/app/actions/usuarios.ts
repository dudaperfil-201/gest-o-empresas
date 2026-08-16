'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { getSessao, OWNER_EMAIL, normalizarPapel, type Papel } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

export interface UsuarioItem {
  id: string
  email: string
  nome: string
  papel: Papel
  frota: boolean
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
  const { data: perfis } = await admin.from('usuarios').select('id, nome, papel, frota')
  const mapa = new Map((perfis ?? []).map(p => [p.id, p]))

  return (data?.users ?? []).map(u => {
    const perfil = mapa.get(u.id)
    const papelBruto = perfil?.papel ?? (u.email === OWNER_EMAIL ? 'admin' : 'imoveis')
    const papel = normalizarPapel(papelBruto)
    return {
      id: u.id,
      email: u.email ?? '',
      nome: perfil?.nome ?? '',
      papel,
      // Admin/dono sempre enxerga a Frota; os demais dependem da coluna.
      frota: papel === 'admin' || perfil?.frota === true,
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
  // Tipo de acesso (radio): relatorios | imoveis | ambos | admin. A Frota é uma caixa
  // extra que só faz sentido para quem faz gestão de imóveis (imoveis/ambos).
  const papel = normalizarPapel(formData.get('tipo') as string)
  const podeFrota = papel === 'imoveis' || papel === 'ambos'
  const frota = podeFrota && formData.get('frota') === 'on'

  if (!email || !senha) return { ok: false, erro: 'E-mail e senha são obrigatórios.' }
  if (senha.length < 6) return { ok: false, erro: 'A senha precisa ter ao menos 6 caracteres.' }

  const admin = createAdminClient()
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: senha,
    email_confirm: true, // já entra sem precisar confirmar e-mail
  })
  if (error || !data.user) return { ok: false, erro: error?.message ?? 'Erro ao criar usuário.' }

  const { error: erroPerfil } = await admin.from('usuarios').upsert({ id: data.user.id, nome: nome || email, papel, frota })
  if (erroPerfil) return { ok: false, erro: 'Usuário criado, mas falhou ao salvar o papel: ' + erroPerfil.message }

  revalidatePath('/usuarios')
  return { ok: true }
}

// Atualiza as permissões de um usuário: papel (Imóveis / +Financeiro / Admin) e o
// acesso à Frota. Admin já enxerga a Frota de qualquer jeito, então guardamos frota
// só quando ainda não é admin (evita "prender" o flag caso rebaixe o papel depois).
export async function atualizarPermissoes(
  id: string,
  papel: Papel,
  frota: boolean,
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
  // Frota só é guardada para quem faz gestão de imóveis (admin já vê; relatórios não vê).
  const podeFrota = papel === 'imoveis' || papel === 'ambos'
  const { error } = await admin.from('usuarios').upsert({ id, nome, papel, frota: podeFrota && frota })
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

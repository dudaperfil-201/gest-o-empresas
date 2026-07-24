'use server'

import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { COOKIE_NAME, criarToken } from '@/lib/auth-inquilino'

const BUCKET = 'documentos-inquilino'

// Senha curta e legível (sem 0/O/1/I para não confundir).
function gerarSenha(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let s = ''
  for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)]
  return s
}

function sanitizar(nome: string): string {
  return nome.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9._-]/g, '_')
}

// ───────────────────────── PORTAL: login / logout ─────────────────────────

export async function loginInquilino(email: string, senha: string): Promise<{ ok: boolean; erro?: string }> {
  const supabase = await createClient()
  const alvo = (email ?? '').trim().toLowerCase()
  const senhaLimpa = (senha ?? '').trim()
  if (!alvo || !senhaLimpa) return { ok: false, erro: 'Informe e-mail e senha.' }

  // Busca por e-mail (case-insensitive) e confere a senha em texto (senha_acesso),
  // que é o que enviamos ao inquilino. Tolera duplicados/variações de caixa.
  const { data } = await supabase
    .from('inquilinos')
    .select('id, email, senha_acesso')
    .ilike('email', alvo)
  const candidatos = (data ?? []).filter(i => (i.email ?? '').trim().toLowerCase() === alvo)

  for (const i of candidatos) {
    if (i.senha_acesso != null && i.senha_acesso.trim() === senhaLimpa) {
      const cookieStore = await cookies()
      cookieStore.set(COOKIE_NAME, criarToken(i.id), {
        httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: 30 * 24 * 60 * 60,
      })
      return { ok: true }
    }
  }
  return { ok: false, erro: 'E-mail ou senha incorretos.' }
}

export async function logoutInquilino() {
  const cookieStore = await cookies()
  cookieStore.delete(COOKIE_NAME)
  redirect('/area-inquilino')
}

// ─────────────── LADO DO DONO (equipe logada): liberar acesso ───────────────

export async function liberarAcessoInquilino(
  inquilinoId: string, empresaId: string, imovelId: string
): Promise<{ ok: boolean; senha?: string; email?: string; erro?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, erro: 'Não autenticado' }

  const { data: inq } = await supabase
    .from('inquilinos').select('id, email, senha_acesso').eq('id', inquilinoId).maybeSingle()
  if (!inq) return { ok: false, erro: 'Inquilino não encontrado.' }
  if (!inq.email) return { ok: false, erro: 'Cadastre o e-mail do inquilino antes de liberar o acesso.' }

  // Mantém a senha se já existe (estável); cria uma nova só na primeira vez.
  let senha = inq.senha_acesso
  if (!senha) {
    senha = gerarSenha()
    const { error } = await supabase.from('inquilinos').update({ senha_acesso: senha }).eq('id', inquilinoId)
    if (error) return { ok: false, erro: error.message }
  }
  revalidatePath(`/empresas/${empresaId}/imoveis/${imovelId}`)
  return { ok: true, senha, email: inq.email }
}

// Upload de CONTRATO (uma via) ou BOLETO (com mês de referência). Só a equipe logada.
export async function uploadDocumentoInquilino(formData: FormData): Promise<{ ok: boolean; erro?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, erro: 'Não autenticado' }

  const inquilinoId = formData.get('inquilino_id') as string
  const empresaId = formData.get('empresa_id') as string
  const imovelId = formData.get('imovel_id') as string
  const tipo = formData.get('tipo') as string // 'contrato' | 'boleto'
  const mesRef = (formData.get('mes_ref') as string | null) ?? ''
  const file = formData.get('arquivo') as File | null

  if (!file || file.size === 0 || !inquilinoId || !['contrato', 'boleto'].includes(tipo)) {
    return { ok: false, erro: 'Dados inválidos.' }
  }
  const safe = sanitizar(file.name || 'documento.pdf')
  let path: string
  if (tipo === 'contrato') {
    path = `${inquilinoId}/contrato/${Date.now()}_${safe}`
  } else {
    const mes = /^\d{4}-\d{2}$/.test(mesRef) ? mesRef : new Date().toISOString().slice(0, 7)
    path = `${inquilinoId}/boletos/${mes}__${Date.now()}_${safe}`
  }

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: file.type || 'application/octet-stream', upsert: false,
  })
  if (error) return { ok: false, erro: error.message }
  revalidatePath(`/empresas/${empresaId}/imoveis/${imovelId}`)
  return { ok: true }
}

// Upload de VÁRIOS boletos de uma vez (ex.: 12 meses de contrato). Ordena os
// arquivos por nome e distribui em meses consecutivos a partir de `mes_inicial`
// (1º arquivo → mês inicial, 2º → mês seguinte, ...).
export async function uploadBoletosEmLote(formData: FormData): Promise<{ ok: boolean; enviados?: number; erro?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, erro: 'Não autenticado' }

  const inquilinoId = formData.get('inquilino_id') as string
  const empresaId = formData.get('empresa_id') as string
  const imovelId = formData.get('imovel_id') as string
  const mesInicial = (formData.get('mes_inicial') as string) ?? ''
  const files = formData.getAll('arquivos').filter((f): f is File => f instanceof File && f.size > 0)

  if (!inquilinoId || files.length === 0 || !/^\d{4}-\d{2}$/.test(mesInicial)) {
    return { ok: false, erro: 'Escolha o mês inicial e ao menos um arquivo.' }
  }
  // Ordena por nome (numérico) para casar com a ordem dos meses.
  files.sort((a, b) => a.name.localeCompare(b.name, 'pt', { numeric: true }))

  const [ano0, mes0] = mesInicial.split('-').map(Number)
  let enviados = 0
  for (let i = 0; i < files.length; i++) {
    const d = new Date(ano0, mes0 - 1 + i, 1)
    const mesStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const path = `${inquilinoId}/boletos/${mesStr}__${Date.now()}_${i}_${sanitizar(files[i].name || 'boleto.pdf')}`
    const { error } = await supabase.storage.from(BUCKET).upload(path, files[i], {
      contentType: files[i].type || 'application/pdf', upsert: false,
    })
    if (!error) enviados++
  }
  revalidatePath(`/empresas/${empresaId}/imoveis/${imovelId}`)
  return enviados > 0 ? { ok: true, enviados } : { ok: false, erro: 'Não foi possível enviar os boletos.' }
}

export async function removerDocumentoInquilino(path: string, empresaId: string, imovelId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  await supabase.storage.from(BUCKET).remove([path])
  revalidatePath(`/empresas/${empresaId}/imoveis/${imovelId}`)
}

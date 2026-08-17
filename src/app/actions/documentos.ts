'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { getSessao } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

// Documentos importantes arquivados MÊS A MÊS na área Relatório e Documentos.
// Ficam num bucket privado; quem tem a permissão de Relatórios VÊ; só ADMIN sobe/remove.
// Operações de Storage usam o client ADMIN (a RLS bloqueia o client logado).
const BUCKET = 'documentos-mensais'
const sanitizar = (nome: string) =>
  (nome || 'documento').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w.\-]+/g, '_').slice(-90)
const nomeAmigavel = (nomeArquivo: string) => nomeArquivo.replace(/^\d+_/, '').replace(/_/g, ' ')

type Resultado = { ok: true } | { ok: false; erro: string }
export type DocItem = { nome: string; path: string; url: string; tamanho: number; criadoEm: string }
export type MesDocs = { ano: number; mes: number; docs: DocItem[] }

// Lista os documentos agrupados por mês (mais recentes primeiro), com URL assinada.
export async function listarDocumentos(): Promise<MesDocs[]> {
  const admin = createAdminClient()
  let pastas
  try {
    const r = await admin.storage.from(BUCKET).list('', { limit: 1000 })
    pastas = r.data
  } catch {
    return [] // bucket ainda não existe
  }
  const meses: MesDocs[] = []
  for (const pasta of pastas ?? []) {
    if (pasta.id !== null) continue // ignora arquivo solto na raiz
    const m = /^(\d{4})-(\d{2})$/.exec(pasta.name)
    if (!m) continue
    const { data: arquivos } = await admin.storage.from(BUCKET).list(pasta.name, {
      limit: 1000, sortBy: { column: 'created_at', order: 'desc' },
    })
    const docs: DocItem[] = []
    for (const a of arquivos ?? []) {
      if (a.id === null) continue
      const path = `${pasta.name}/${a.name}`
      const { data: s } = await admin.storage.from(BUCKET).createSignedUrl(path, 3600)
      docs.push({
        nome: nomeAmigavel(a.name),
        path,
        url: s?.signedUrl ?? '',
        tamanho: (a.metadata?.size as number) ?? 0,
        criadoEm: a.created_at ?? '',
      })
    }
    if (docs.length) meses.push({ ano: +m[1], mes: +m[2], docs })
  }
  meses.sort((a, b) => (b.ano - a.ano) || (b.mes - a.mes))
  return meses
}

// Sobe um ou mais documentos para um mês. Só ADMIN.
export async function uploadDocumento(formData: FormData): Promise<Resultado> {
  const sessao = await getSessao()
  if (!sessao?.ehAdmin) return { ok: false, erro: 'Sem permissão.' }

  const ano = parseInt(formData.get('ano') as string, 10)
  const mes = parseInt(formData.get('mes') as string, 10)
  if (!ano || !mes || mes < 1 || mes > 12) return { ok: false, erro: 'Mês inválido.' }
  const arquivos = (formData.getAll('arquivos') as File[]).filter(f => f && f.size > 0)
  if (arquivos.length === 0) return { ok: false, erro: 'Selecione ao menos um arquivo.' }

  const admin = createAdminClient()
  await admin.storage.createBucket(BUCKET, { public: false }).catch(() => {})
  const pasta = `${ano}-${String(mes).padStart(2, '0')}`
  let i = 0
  for (const file of arquivos) {
    const bytes = new Uint8Array(await file.arrayBuffer())
    const path = `${pasta}/${Date.now()}_${i++}_${sanitizar(file.name)}`
    const { error } = await admin.storage.from(BUCKET).upload(path, bytes, {
      contentType: file.type || 'application/octet-stream', upsert: false,
    })
    if (error) return { ok: false, erro: error.message }
  }
  revalidatePath('/documentos')
  return { ok: true }
}

// Remove um documento. Só ADMIN.
export async function removerDocumento(path: string): Promise<Resultado> {
  const sessao = await getSessao()
  if (!sessao?.ehAdmin) return { ok: false, erro: 'Sem permissão.' }
  if (!path) return { ok: false, erro: 'Documento inválido.' }
  const admin = createAdminClient()
  const { error } = await admin.storage.from(BUCKET).remove([path])
  if (error) return { ok: false, erro: error.message }
  revalidatePath('/documentos')
  return { ok: true }
}

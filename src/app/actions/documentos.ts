'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { getSessao } from '@/lib/auth'
import { PASTAS, pastaPorSlug, type Pasta } from '@/lib/documentos'
import { revalidatePath } from 'next/cache'

// Documentos importantes, arquivados em PASTAS (Extratos, Histórico…) e, dentro de cada
// pasta, MÊS A MÊS. Bucket privado; quem tem a permissão de Relatórios VÊ; só ADMIN
// sobe/remove. Operações de Storage usam o client ADMIN (a RLS bloqueia o client logado).
const BUCKET = 'documentos-mensais'
const sanitizar = (nome: string) =>
  (nome || 'documento').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w.\-]+/g, '_').slice(-90)
const nomeAmigavel = (nomeArquivo: string) => nomeArquivo.replace(/^\d+_\d+_/, '').replace(/^\d+_/, '').replace(/_/g, ' ')

type Resultado = { ok: true } | { ok: false; erro: string }
export type DocItem = { nome: string; path: string; url: string; tamanho: number; criadoEm: string }
export type MesDocs = { ano: number; mes: number; docs: DocItem[] }
export type PastaInfo = Pasta & { qtd: number }

// Lista as pastas configuradas com a quantidade de documentos em cada uma.
export async function listarPastas(): Promise<PastaInfo[]> {
  const admin = createAdminClient()
  const out: PastaInfo[] = []
  for (const p of PASTAS) {
    let qtd = 0
    try {
      const { data: meses } = await admin.storage.from(BUCKET).list(p.slug, { limit: 1000 })
      for (const m of meses ?? []) {
        if (m.id !== null || !/^\d{4}-\d{2}$/.test(m.name)) continue
        const { data: arqs } = await admin.storage.from(BUCKET).list(`${p.slug}/${m.name}`, { limit: 1000 })
        qtd += (arqs ?? []).filter(a => a.id !== null).length
      }
    } catch { /* bucket/pasta ainda não existe */ }
    out.push({ ...p, qtd })
  }
  return out
}

// Lista os documentos de UMA pasta, agrupados por mês (recentes primeiro), com URL assinada.
export async function listarDocumentos(pastaSlug: string): Promise<MesDocs[]> {
  if (!pastaPorSlug(pastaSlug)) return []
  const admin = createAdminClient()
  let subs
  try {
    const r = await admin.storage.from(BUCKET).list(pastaSlug, { limit: 1000 })
    subs = r.data
  } catch {
    return []
  }
  const meses: MesDocs[] = []
  for (const sub of subs ?? []) {
    if (sub.id !== null) continue
    const m = /^(\d{4})-(\d{2})$/.exec(sub.name)
    if (!m) continue
    const { data: arquivos } = await admin.storage.from(BUCKET).list(`${pastaSlug}/${sub.name}`, {
      limit: 1000, sortBy: { column: 'created_at', order: 'desc' },
    })
    const docs: DocItem[] = []
    for (const a of arquivos ?? []) {
      if (a.id === null) continue
      const path = `${pastaSlug}/${sub.name}/${a.name}`
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

// Sobe um ou mais documentos para uma pasta/mês. Só ADMIN.
export async function uploadDocumento(formData: FormData): Promise<Resultado> {
  const sessao = await getSessao()
  if (!sessao?.ehAdmin) return { ok: false, erro: 'Sem permissão.' }

  const pasta = (formData.get('pasta') as string) || ''
  if (!pastaPorSlug(pasta)) return { ok: false, erro: 'Pasta inválida.' }
  const ano = parseInt(formData.get('ano') as string, 10)
  const mes = parseInt(formData.get('mes') as string, 10)
  if (!ano || !mes || mes < 1 || mes > 12) return { ok: false, erro: 'Mês inválido.' }
  const arquivos = (formData.getAll('arquivos') as File[]).filter(f => f && f.size > 0)
  if (arquivos.length === 0) return { ok: false, erro: 'Selecione ao menos um arquivo.' }

  const admin = createAdminClient()
  await admin.storage.createBucket(BUCKET, { public: false }).catch(() => {})
  const dir = `${pasta}/${ano}-${String(mes).padStart(2, '0')}`
  let i = 0
  for (const file of arquivos) {
    const bytes = new Uint8Array(await file.arrayBuffer())
    const path = `${dir}/${Date.now()}_${i++}_${sanitizar(file.name)}`
    const { error } = await admin.storage.from(BUCKET).upload(path, bytes, {
      contentType: file.type || 'application/octet-stream', upsert: false,
    })
    if (error) return { ok: false, erro: error.message }
  }
  revalidatePath(`/documentos/${pasta}`)
  revalidatePath('/documentos')
  return { ok: true }
}

// Remove um documento pelo path completo (pasta/mes/arquivo). Só ADMIN.
export async function removerDocumento(path: string): Promise<Resultado> {
  const sessao = await getSessao()
  if (!sessao?.ehAdmin) return { ok: false, erro: 'Sem permissão.' }
  if (!path) return { ok: false, erro: 'Documento inválido.' }
  const admin = createAdminClient()
  const { error } = await admin.storage.from(BUCKET).remove([path])
  if (error) return { ok: false, erro: error.message }
  const pasta = path.split('/')[0]
  revalidatePath(`/documentos/${pasta}`)
  revalidatePath('/documentos')
  return { ok: true }
}

'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { getSessao } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { PESSOAS, type Pessoa, type Cambio, type Comprovante } from '@/lib/cambios'

// Câmbios da La Jolla — operações R$→US$ mensais que abastecem a conta (Itaú Miami).
// Registros na tabela `lajolla_cambios`; comprovantes (PDFs) no bucket privado
// `comprovantes-cambio`, na pasta <id do câmbio>. Operações de Storage/gravação usam
// o client ADMIN (a RLS bloqueia o client logado). Quem tem permissão de Financeiro vê.
// Constantes/tipos ficam em @/lib/cambios (arquivo 'use server' só exporta funções).
const BUCKET = 'comprovantes-cambio'

const sanitizar = (nome: string) =>
  (nome || 'comprovante').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w.\-]+/g, '_').slice(-90)
const nomeAmigavel = (nomeArquivo: string) => nomeArquivo.replace(/^\d+_\d+_/, '').replace(/_/g, ' ')

// Converte texto pt-BR ("24.332,34") ou padrão ("24332.34") em número. '' → null.
function paraNumero(v: FormDataEntryValue | null): number | null {
  if (v == null) return null
  const s = String(v).trim()
  if (!s) return null
  const norm = s.replace(/\s/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.')
  const n = Number(norm)
  return Number.isFinite(n) ? n : null
}

type Resultado = { ok: true } | { ok: false; erro: string }

// Lista os comprovantes de um câmbio (bucket/<id>) com URL assinada (1h).
async function comprovantesDe(admin: ReturnType<typeof createAdminClient>, id: string): Promise<Comprovante[]> {
  const out: Comprovante[] = []
  try {
    const { data: arqs } = await admin.storage.from(BUCKET).list(id, { limit: 100 })
    for (const a of arqs ?? []) {
      if (a.id === null) continue
      const path = `${id}/${a.name}`
      const { data: s } = await admin.storage.from(BUCKET).createSignedUrl(path, 3600)
      out.push({ nome: nomeAmigavel(a.name), path, url: s?.signedUrl ?? '' })
    }
  } catch { /* bucket ainda não existe */ }
  return out
}

export async function listarCambios(): Promise<Cambio[]> {
  const sessao = await getSessao()
  if (!sessao?.podeFinanceiro) return []
  const admin = createAdminClient()
  const { data } = await admin
    .from('lajolla_cambios')
    .select('*')
    .order('data', { ascending: false })
    .order('criado_em', { ascending: false })
  const out: Cambio[] = []
  for (const r of data ?? []) {
    out.push({
      id: r.id,
      data: r.data,
      quem: r.quem,
      valorUsd: Number(r.valor_usd),
      taxa: r.taxa != null ? Number(r.taxa) : null,
      valorBrl: r.valor_brl != null ? Number(r.valor_brl) : null,
      iof: Number(r.iof ?? 0),
      valorDebitado: r.valor_debitado != null ? Number(r.valor_debitado) : null,
      instituicao: r.instituicao ?? null,
      referencia: r.referencia ?? null,
      obs: r.obs ?? null,
      comprovantes: await comprovantesDe(admin, r.id),
    })
  }
  return out
}

// Adiciona um câmbio (+ comprovantes). Quem tem permissão de Financeiro pode lançar.
export async function adicionarCambio(formData: FormData): Promise<Resultado> {
  const sessao = await getSessao()
  if (!sessao?.podeFinanceiro) return { ok: false, erro: 'Sem permissão.' }

  const data = String(formData.get('data') || '').trim()
  const quem = String(formData.get('quem') || '').trim()
  const valorUsd = paraNumero(formData.get('valorUsd'))
  if (!data) return { ok: false, erro: 'Informe a data da operação.' }
  if (!PESSOAS.includes(quem as Pessoa)) return { ok: false, erro: 'Selecione quem fez o câmbio.' }
  if (valorUsd == null || valorUsd <= 0) return { ok: false, erro: 'Informe o valor em US$.' }

  const admin = createAdminClient()
  const { data: inserido, error } = await admin
    .from('lajolla_cambios')
    .insert({
      data,
      quem,
      valor_usd: valorUsd,
      taxa: paraNumero(formData.get('taxa')),
      valor_brl: paraNumero(formData.get('valorBrl')),
      iof: paraNumero(formData.get('iof')) ?? 0,
      valor_debitado: paraNumero(formData.get('valorDebitado')),
      instituicao: (String(formData.get('instituicao') || '').trim()) || null,
      referencia: (String(formData.get('referencia') || '').trim()) || null,
      obs: (String(formData.get('obs') || '').trim()) || null,
    })
    .select('id')
    .single()
  if (error || !inserido) return { ok: false, erro: error?.message || 'Não consegui salvar o câmbio.' }

  const arquivos = (formData.getAll('comprovantes') as File[]).filter(f => f && f.size > 0)
  if (arquivos.length) {
    await admin.storage.createBucket(BUCKET, { public: false }).catch(() => {})
    let i = 0
    for (const file of arquivos) {
      const bytes = new Uint8Array(await file.arrayBuffer())
      const path = `${inserido.id}/${Date.now()}_${i++}_${sanitizar(file.name)}`
      await admin.storage.from(BUCKET).upload(path, bytes, {
        contentType: file.type || 'application/pdf', upsert: false,
      })
    }
  }

  revalidatePath('/financeiro/cambios')
  return { ok: true }
}

// Remove um câmbio e seus comprovantes.
export async function removerCambio(id: string): Promise<Resultado> {
  const sessao = await getSessao()
  if (!sessao?.podeFinanceiro) return { ok: false, erro: 'Sem permissão.' }
  if (!id) return { ok: false, erro: 'Câmbio inválido.' }
  const admin = createAdminClient()
  try {
    const { data: arqs } = await admin.storage.from(BUCKET).list(id, { limit: 100 })
    if (arqs?.length) await admin.storage.from(BUCKET).remove(arqs.map(a => `${id}/${a.name}`))
  } catch { /* sem comprovantes */ }
  const { error } = await admin.from('lajolla_cambios').delete().eq('id', id)
  if (error) return { ok: false, erro: error.message }
  revalidatePath('/financeiro/cambios')
  return { ok: true }
}

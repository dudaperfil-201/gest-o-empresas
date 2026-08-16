'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

// Bucket (privado) dos documentos dos veículos (CRLV etc.). Operações de Storage usam
// o client ADMIN (service role) — o client logado é bloqueado pela RLS do Storage.
const BUCKET_DOC = 'documentos-veiculo'
const sanitizar = (nome: string) => nome.replace(/[^\w.\-]+/g, '_').slice(-80)

// Módulo FROTA VEÍCULOS — cadastro dos veículos. Fase 1 (só cadastro).

export type Veiculo = {
  id: string
  empresa_id: string | null
  placa: string | null
  marca: string | null
  modelo: string | null
  ano: number | null
  cor: string | null
  renavam: string | null
  km_atual: number | null
  observacoes: string | null
  ativo: boolean
  created_at: string
  fipe_valor: number | null
  fipe_ref: string | null
  fipe_atualizado_em: string | null
}
type Resultado = { ok: true } | { ok: false; erro: string }

type DadosVeiculo = {
  empresa_id: string | null
  placa: string
  marca: string
  modelo: string
  ano: number | null
  cor: string
  renavam: string
  km_atual: number | null
  observacoes: string
}

// Lista os veículos (ativos e inativos). Tolerante: se a tabela ainda não existir
// (migração não rodada), retorna vazio sem quebrar a tela.
export async function getVeiculos(): Promise<Veiculo[]> {
  try {
    const supabase = await createClient()
    const { data } = await supabase.from('veiculos').select('*').order('created_at', { ascending: false })
    return (data as Veiculo[]) ?? []
  } catch {
    return []
  }
}

function normalizar(d: DadosVeiculo) {
  return {
    empresa_id: d.empresa_id || null,
    placa: (d.placa ?? '').trim().toUpperCase() || null,
    marca: (d.marca ?? '').trim() || null,
    modelo: (d.modelo ?? '').trim() || null,
    ano: d.ano && d.ano > 1900 ? d.ano : null,
    cor: (d.cor ?? '').trim() || null,
    renavam: (d.renavam ?? '').trim() || null,
    km_atual: d.km_atual != null && d.km_atual >= 0 ? d.km_atual : null,
    observacoes: (d.observacoes ?? '').trim() || null,
  }
}

export async function criarVeiculo(dados: DadosVeiculo): Promise<Resultado> {
  const v = normalizar(dados)
  if (!v.placa && !v.modelo) return { ok: false, erro: 'Informe ao menos a placa ou o modelo.' }
  const supabase = await createClient()
  const { error } = await supabase.from('veiculos').insert(v)
  if (error) return { ok: false, erro: error.message }
  revalidatePath('/frota')
  return { ok: true }
}

export async function editarVeiculo(id: string, dados: DadosVeiculo & { ativo?: boolean }): Promise<Resultado> {
  const v = normalizar(dados)
  const supabase = await createClient()
  const { error } = await supabase.from('veiculos').update({ ...v, ativo: dados.ativo ?? true }).eq('id', id)
  if (error) return { ok: false, erro: error.message }
  revalidatePath('/frota')
  return { ok: true }
}

export async function apagarVeiculo(id: string): Promise<Resultado> {
  const supabase = await createClient()
  const { error } = await supabase.from('veiculos').delete().eq('id', id)
  if (error) return { ok: false, erro: error.message }
  // Apaga também o documento do veículo no Storage (se houver).
  try {
    const admin = createAdminClient()
    const { data } = await admin.storage.from(BUCKET_DOC).list(id)
    if (data?.length) await admin.storage.from(BUCKET_DOC).remove(data.map(a => `${id}/${a.name}`))
  } catch { /* bucket pode não existir ainda */ }
  revalidatePath('/frota')
  return { ok: true }
}

// Anexa (ou substitui) o DOCUMENTO do veículo (foto/PDF do CRLV). Cria o bucket se
// preciso e mantém só 1 documento por veículo.
export async function uploadDocumentoVeiculo(formData: FormData): Promise<Resultado> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, erro: 'Não autenticado.' }

  const veiculoId = formData.get('veiculo_id') as string
  const file = formData.get('arquivo') as File | null
  if (!veiculoId || !file || file.size === 0) return { ok: false, erro: 'Selecione um arquivo.' }

  const admin = createAdminClient()
  // Garante o bucket (privado). Ignora erro se já existir.
  await admin.storage.createBucket(BUCKET_DOC, { public: false }).catch(() => {})
  // Substitui: remove documentos antigos do veículo.
  try {
    const { data: antigos } = await admin.storage.from(BUCKET_DOC).list(veiculoId)
    if (antigos?.length) await admin.storage.from(BUCKET_DOC).remove(antigos.map(a => `${veiculoId}/${a.name}`))
  } catch { /* pasta pode não existir */ }

  const bytes = new Uint8Array(await file.arrayBuffer())
  const path = `${veiculoId}/${Date.now()}_${sanitizar(file.name || 'documento.pdf')}`
  const { error } = await admin.storage.from(BUCKET_DOC).upload(path, bytes, {
    contentType: file.type || 'application/octet-stream', upsert: false,
  })
  if (error) return { ok: false, erro: error.message }
  revalidatePath('/frota')
  return { ok: true }
}

export async function removerDocumentoVeiculo(veiculoId: string): Promise<Resultado> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, erro: 'Não autenticado.' }
  const admin = createAdminClient()
  try {
    const { data } = await admin.storage.from(BUCKET_DOC).list(veiculoId)
    if (data?.length) await admin.storage.from(BUCKET_DOC).remove(data.map(a => `${veiculoId}/${a.name}`))
  } catch { /* nada a remover */ }
  revalidatePath('/frota')
  return { ok: true }
}

'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

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
  revalidatePath('/frota')
  return { ok: true }
}

import { createAdminClient } from '@/lib/supabase/admin'

// FIPE (tabela de preços de veículos) via API pública Parallelum. Cada veículo guarda
// os códigos FIPE (marca/modelo/ano); o robô mensal busca o valor e grava no veículo.
const FIPE = 'https://parallelum.com.br/fipe/api/v1/carros'

// "R$ 201.616,00" → 201616.00
function parseValor(s: unknown): number | null {
  if (s == null) return null
  const n = parseFloat(String(s).replace(/[^\d,]/g, '').replace(/\./g, '').replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

export type ValorFipe = { valor: number | null; ref: string | null; codigo: string | null }

// Busca o valor atual de um veículo pelos códigos FIPE (marca/modelo/ano).
export async function buscarValorFipe(marcaCod: string, modeloCod: string, anoCod: string): Promise<ValorFipe> {
  try {
    const r = await fetch(`${FIPE}/marcas/${marcaCod}/modelos/${modeloCod}/anos/${anoCod}`, { cache: 'no-store' })
    if (!r.ok) return { valor: null, ref: null, codigo: null }
    const d = await r.json()
    return { valor: parseValor(d?.Valor), ref: d?.MesReferencia ?? null, codigo: d?.CodigoFipe ?? null }
  } catch {
    return { valor: null, ref: null, codigo: null }
  }
}

// Atualiza o valor FIPE de TODOS os veículos que têm o vínculo (códigos) preenchido.
// Roda no cron mensal. Usa o client admin (sem sessão de usuário).
export async function atualizarFipeVeiculos() {
  const supabase = createAdminClient()
  const { data: veiculos } = await supabase
    .from('veiculos')
    .select('id, fipe_marca_cod, fipe_modelo_cod, fipe_ano_cod')
    .not('fipe_marca_cod', 'is', null)

  let atualizados = 0, falhas = 0
  for (const v of veiculos ?? []) {
    const { valor, ref } = await buscarValorFipe(v.fipe_marca_cod, v.fipe_modelo_cod, v.fipe_ano_cod)
    if (valor == null) { falhas++; continue }
    await supabase.from('veiculos')
      .update({ fipe_valor: valor, fipe_ref: ref, fipe_atualizado_em: new Date().toISOString() })
      .eq('id', v.id)
    atualizados++
  }
  return { ok: true, total: (veiculos ?? []).length, atualizados, falhas }
}

// Cálculo do IR 2026 (reforma Lei 15.270/2025) sobre a distribuição de lucros à família.
// Duas regras novas:
//  (1) IRRF na fonte: 10% quando UMA empresa paga a UMA pessoa física mais de R$ 50 mil
//      no MÊS — e os 10% incidem sobre o TOTAL pago no mês (não só o excedente).
//      Distribuição a PJ é ISENTA.
//  (2) IRPFM (imposto mínimo de alta renda): alíquota pela RENDA ANUAL total da pessoa
//      física — 0% até R$ 600 mil, sobe linear até 10% em R$ 1,2 mi, e trava em 10%
//      acima disso. É um MÍNIMO: só cobra a diferença do que já foi pago no ano.
//
// ⚠️ Estimativa de PLANEJAMENTO. O "redutor" anti-bitributação (que considera o IRPJ+CSLL
// já pago pela empresa) entra numa 2ª etapa. Pessoa marcada como PJ não paga os 10% nem
// entra no IRPFM (o imposto mínimo é da pessoa física).

export const LIMITE_IRRF_MES = 50000
export const IRRF_ALIQ = 0.10
export const IRPFM_PISO = 600000
export const IRPFM_TETO = 1200000
export const IRPFM_ALIQ_MAX = 0.10

export type TipoPessoa = 'pf' | 'pj'

// IRRF retido sobre a distribuição de UM mês, de UMA empresa, a UMA pessoa física.
export function irrfMes(valorMes: number): number {
  return valorMes > LIMITE_IRRF_MES ? valorMes * IRRF_ALIQ : 0
}

// Alíquota do IRPFM pela renda anual total (fração 0..0,10).
// Fórmula: alíquota(%) = renda ÷ 60.000 − 10  →  fração = isso ÷ 100.
export function aliquotaIRPFM(rendaAnual: number): number {
  if (rendaAnual <= IRPFM_PISO) return 0
  if (rendaAnual >= IRPFM_TETO) return IRPFM_ALIQ_MAX
  return (rendaAnual / 60000 - 10) / 100
}

export type ResultadoPessoa = {
  distribuicaoAnual: number // soma de (valor_mensal × 12) de todas as empresas
  irrfAnual: number         // IRRF de 10% retido no ano (só PF)
  outrosRendimentos: number // outros rendimentos anuais (base do IRPFM)
  rendaAnual: number        // distribuição + outros
  aliquota: number          // alíquota do IRPFM
  impostoMinimo: number     // renda anual × alíquota
  aPagar: number            // max(0, imposto mínimo − IRRF já retido)
}

// Resultado anual de uma pessoa. `valoresMes` = o que ela recebe/mês de CADA empresa.
export function calcularPessoa(tipo: TipoPessoa, valoresMes: number[], outros: number): ResultadoPessoa {
  const distribuicaoAnual = valoresMes.reduce((s, v) => s + (v || 0) * 12, 0)
  const irrfAnual = tipo === 'pf' ? valoresMes.reduce((s, v) => s + irrfMes(v || 0) * 12, 0) : 0
  const rendaAnual = distribuicaoAnual + (outros || 0)
  const aliquota = tipo === 'pf' ? aliquotaIRPFM(rendaAnual) : 0
  const impostoMinimo = rendaAnual * aliquota
  const aPagar = Math.max(0, impostoMinimo - irrfAnual)
  return { distribuicaoAnual, irrfAnual, outrosRendimentos: outros || 0, rendaAnual, aliquota, impostoMinimo, aPagar }
}

// ── Formatação ──
export const brl = (n: number) => 'R$ ' + (n || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
export const pctFmt = (f: number) => (f * 100).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) + '%'

// Texto pt-BR ("12.500,00") ou simples ("12500.5") → número. Vazio → 0.
export function toNum(s: string): number {
  const c = (s ?? '').trim().replace(/\s/g, '')
  if (!c) return 0
  const norm = c.includes(',') ? c.replace(/\./g, '').replace(',', '.') : c
  const n = parseFloat(norm)
  return isFinite(n) ? n : 0
}

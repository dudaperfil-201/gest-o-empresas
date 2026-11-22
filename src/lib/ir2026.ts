// Cálculo do IR 2026 sobre a renda que o grupo familiar leva para a pessoa física,
// organizado nas TRÊS TRILHAS tributárias da estrutura real:
//
//  Trilha 1 — HOLDINGS de topo (Black Fortune, OB Holding) que distribuem a PF.
//  Trilha 2 — DIRETAS à PF (Oyster→Janara, Summit→Roseli).
//     → As trilhas 1 e 2 são "dividendo": reforma Lei 15.270/2025.
//        (a) IRRF 10% na fonte quando UMA fonte paga a UMA PF > R$ 50 mil no MÊS
//            (incide sobre o TOTAL do mês, não só o excedente);
//        (b) IRPFM (imposto mínimo de alta renda) sobre a renda anual: 0% até R$ 600 mil,
//            sobe linear até 10% em R$ 1,2 mi, trava em 10%. É um mínimo: abate o IRRF já retido.
//
//  Trilha 3 — CASOS ESPECIAIS, regime próprio (NÃO é dividendo 10%):
//     • offshore (La Jolla, Bahamas) → Lei 14.754/2023, ~15%/ano sobre o lucro da controlada;
//     • fundo (FIM Golden Sky) → tributação de fundo (come-cotas/resgate), ~15%.
//     Valor lançado na trilha 3 é ANUAL (lucro do ano), não mensal.
//
// Elos PJ→PJ (IMG→PAN→Black Fortune, METVISA/E.M.E→OB Holding) são 'intermediaria':
// ISENTOS e fora do cálculo — entram só como contexto da cadeia.
//
// ⚠️ Estimativa de PLANEJAMENTO. O redutor anti-bitributação (IRPJ+CSLL já pago) e a
// eventual interação da trilha 3 com o IRPFM ficam para próximas etapas.

export const LIMITE_IRRF_MES = 50000
export const IRRF_ALIQ = 0.10
export const IRPFM_PISO = 600000
export const IRPFM_TETO = 1200000
export const IRPFM_ALIQ_MAX = 0.10
export const OFFSHORE_ALIQ = 0.15 // Lei 14.754/2023 (controlada no exterior)
export const FUNDO_ALIQ = 0.15    // fundo (come-cotas / longo prazo) — padrão de planejamento

export type TipoPessoa = 'pf' | 'pj'
export type Trilha = 'holding' | 'direta' | 'offshore' | 'fundo' | 'intermediaria'

export const TRILHA_INFO: Record<Trilha, {
  label: string; curto: string; desc: string; grupo: 'dividendo' | 'especial' | 'isenta'; anual: boolean
}> = {
  holding:       { label: 'Holding de topo', curto: 'Holding', desc: 'distribui à PF (dividendo)',          grupo: 'dividendo', anual: false },
  direta:        { label: 'Direta à PF',      curto: 'Direta',  desc: 'operacional paga direto à PF',        grupo: 'dividendo', anual: false },
  offshore:      { label: 'Offshore',         curto: 'Offshore',desc: 'exterior · Lei 14.754/2023 (~15%)',   grupo: 'especial',  anual: true  },
  fundo:         { label: 'Fundo',            curto: 'Fundo',   desc: 'fundo de investimento (~15%)',         grupo: 'especial',  anual: true  },
  intermediaria: { label: 'Cadeia isenta',    curto: 'Isenta',  desc: 'PJ→PJ, não distribui à PF',            grupo: 'isenta',    anual: false },
}

export function ehDividendo(t: Trilha) { return TRILHA_INFO[t].grupo === 'dividendo' }
export function ehEspecial(t: Trilha) { return TRILHA_INFO[t].grupo === 'especial' }

// IRRF retido sobre a distribuição de UM mês, de UMA fonte, a UMA pessoa física.
export function irrfMes(valorMes: number): number {
  return valorMes > LIMITE_IRRF_MES ? valorMes * IRRF_ALIQ : 0
}

// Alíquota do IRPFM pela renda anual total (fração 0..0,10).
export function aliquotaIRPFM(rendaAnual: number): number {
  if (rendaAnual <= IRPFM_PISO) return 0
  if (rendaAnual >= IRPFM_TETO) return IRPFM_ALIQ_MAX
  return (rendaAnual / 60000 - 10) / 100
}

// Um lançamento da pessoa: a trilha da fonte e o valor (mensal p/ dividendo, anual p/ especial).
export type Lancamento = { trilha: Trilha; valor: number }

export type ResultadoPessoa = {
  // Trilhas 1 e 2 (dividendo)
  dividendoAnual: number     // Σ (valor mensal × 12) das fontes holding/direta
  irrfAnual: number          // IRRF 10% retido no ano (só PF)
  outrosRendimentos: number  // outros rendimentos anuais (entram na base do IRPFM)
  rendaAnual: number         // dividendoAnual + outros (base do IRPFM)
  aliquota: number           // alíquota do IRPFM
  impostoMinimo: number      // renda anual × alíquota
  dividendoAPagar: number    // max(0, imposto mínimo − IRRF já retido)
  // Trilha 3 (especial)
  offshoreAnual: number
  fundoAnual: number
  impostoOffshore: number
  impostoFundo: number
  impostoT3: number          // offshore + fundo
  // Totais
  totalImposto: number       // IRRF retido + dividendo a pagar + imposto trilha 3
}

export function calcularPessoa(tipo: TipoPessoa, lancamentos: Lancamento[], outros: number): ResultadoPessoa {
  const pf = tipo === 'pf'
  const div = lancamentos.filter(l => ehDividendo(l.trilha))
  const dividendoAnual = div.reduce((s, l) => s + (l.valor || 0) * 12, 0)
  const irrfAnual = pf ? div.reduce((s, l) => s + irrfMes(l.valor || 0) * 12, 0) : 0
  const rendaAnual = dividendoAnual + (outros || 0)
  const aliquota = pf ? aliquotaIRPFM(rendaAnual) : 0
  const impostoMinimo = rendaAnual * aliquota
  const dividendoAPagar = Math.max(0, impostoMinimo - irrfAnual)

  const offshoreAnual = lancamentos.filter(l => l.trilha === 'offshore').reduce((s, l) => s + (l.valor || 0), 0)
  const fundoAnual = lancamentos.filter(l => l.trilha === 'fundo').reduce((s, l) => s + (l.valor || 0), 0)
  const impostoOffshore = pf ? offshoreAnual * OFFSHORE_ALIQ : 0
  const impostoFundo = pf ? fundoAnual * FUNDO_ALIQ : 0
  const impostoT3 = impostoOffshore + impostoFundo

  const totalImposto = irrfAnual + dividendoAPagar + impostoT3

  return {
    dividendoAnual, irrfAnual, outrosRendimentos: outros || 0, rendaAnual, aliquota,
    impostoMinimo, dividendoAPagar,
    offshoreAnual, fundoAnual, impostoOffshore, impostoFundo, impostoT3,
    totalImposto,
  }
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

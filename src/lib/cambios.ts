// Constantes e tipos dos câmbios da La Jolla. Fica FORA da server action porque um
// arquivo 'use server' só pode exportar funções async (não constantes/objetos).

export const PESSOAS = ['Eduardo', 'Serginho'] as const
export type Pessoa = (typeof PESSOAS)[number]

// Moedas estrangeiras aceitas no câmbio. `cod` é o que vai pro banco (coluna `moeda`).
export const MOEDAS = [
  { cod: 'USD', simbolo: 'US$', nome: 'Dólar americano' },
  { cod: 'CHF', simbolo: 'CHF', nome: 'Franco suíço' },
  { cod: 'EUR', simbolo: '€',   nome: 'Euro' },
  { cod: 'GBP', simbolo: '£',   nome: 'Libra esterlina' },
] as const
export type MoedaCod = (typeof MOEDAS)[number]['cod']
export const MOEDAS_COD = MOEDAS.map(m => m.cod) as readonly string[]

export const simboloMoeda = (cod: string): string =>
  MOEDAS.find(m => m.cod === cod)?.simbolo ?? cod

// Ex.: formatarMoeda('CHF', 10000) → "CHF 10.000,00"
export const formatarMoeda = (cod: string, valor: number): string =>
  `${simboloMoeda(cod)} ${valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

export type Comprovante = { nome: string; path: string; url: string }

// Campos extraídos automaticamente de um comprovante de câmbio (Itaú) lido do PDF.
export type DadosComprovante = {
  data: string          // ISO (yyyy-mm-dd) ou ''
  referencia: string
  quem: string          // 'Eduardo' | 'Serginho' | '' (pelo nome do cliente)
  moeda: string         // USD, CHF, EUR…
  valorMoeda: number | null
  taxa: number | null
  valorBrl: number | null
  iof: number | null
  valorDebitado: number | null
  instituicao: string
}

export type Cambio = {
  id: string
  data: string          // ISO date
  quem: string
  moeda: string         // moeda estrangeira (USD, CHF, EUR…)
  valorMoeda: number    // valor na moeda estrangeira (coluna valor_usd, por herança)
  taxa: number | null
  valorBrl: number | null
  iof: number
  valorDebitado: number | null
  instituicao: string | null
  referencia: string | null
  obs: string | null
  comprovantes: Comprovante[]
}

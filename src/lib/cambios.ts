// Constantes e tipos dos câmbios da La Jolla. Fica FORA da server action porque um
// arquivo 'use server' só pode exportar funções async (não constantes/objetos).

export const PESSOAS = ['Eduardo', 'Serginho'] as const
export type Pessoa = (typeof PESSOAS)[number]

export type Comprovante = { nome: string; path: string; url: string }

export type Cambio = {
  id: string
  data: string          // ISO date
  quem: string
  valorUsd: number
  taxa: number | null
  valorBrl: number | null
  iof: number
  valorDebitado: number | null
  instituicao: string | null
  referencia: string | null
  obs: string | null
  comprovantes: Comprovante[]
}

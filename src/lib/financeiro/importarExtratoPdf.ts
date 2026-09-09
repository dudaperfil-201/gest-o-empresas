// Parser de extrato XP "Posição a mercado mensal" (PDF de texto) → saldos do fecho do mês.
// Extrai Saldo bruto / líquido / em conta e a data da posição. O PDF NÃO identifica a
// carteira do app (titular mascarado), então o vínculo com a conta é feito na tela (o
// usuário escolhe a carteira antes de importar).
import pdfParse from 'pdf-parse/lib/pdf-parse.js'

export type ExtratoPdf = {
  ano: number
  mes: number
  dataPosicao: string | null
  saldoBruto: number | null
  saldoLiquido: number | null
  saldoEmConta: number | null
}

// "8.457.062,35" → 8457062.35 (pt-BR). null se não achar/!finito.
function num(texto: string, re: RegExp): number | null {
  const m = texto.match(re)
  if (!m) return null
  const v = Number(m[1].replace(/\./g, '').replace(',', '.'))
  return Number.isFinite(v) ? Math.round(v * 100) / 100 : null
}

export async function parseExtratoXP(buf: Buffer): Promise<ExtratoPdf> {
  const { text } = await pdfParse(buf)
  // Os rótulos do XP quebram linha no meio ("Saldo \nlíquido") — daí o \s+.
  const saldoBruto = num(text, /Saldo\s+bruto\s*R\$\s*([\d.,]+)/i)
  const saldoLiquido = num(text, /Saldo\s+l[íi]quido\s*R\$\s*([\d.,]+)/i)
  const saldoEmConta = num(text, /Saldo\s+em\s+conta\s*R\$\s*([\d.,]+)/i)
  const md = text.match(/Data da posi[çc][ãa]o:\s*(\d{2})\/(\d{2})\/(\d{4})/i)
  return {
    ano: md ? Number(md[3]) : 0,
    mes: md ? Number(md[2]) : 0,
    dataPosicao: md ? `${md[1]}/${md[2]}/${md[3]}` : null,
    saldoBruto,
    saldoLiquido,
    saldoEmConta,
  }
}

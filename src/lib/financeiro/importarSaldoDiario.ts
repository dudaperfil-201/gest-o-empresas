// Parser da planilha "SALDO DIÁRIO" (arquivo .xls da controladoria) → saldos bancários
// do FECHO do mês, já mapeados na estrutura do Financeiro (carteira/banco/linha).
//
// A planilha tem uma aba por mês ("AGO-2026", "SET-2026", …). Pegamos a aba mais recente
// que JÁ TEM dados (Total Geral preenchido) e lemos a última coluna com movimento (o fecho).
//
// O mapeamento é intencionalmente EXPLÍCITO: só trazemos as linhas de conta bancária que
// casam com uma carteira do app. As posições de investimento (XP Ações/COE/Renda Fixa,
// La Jolla, RNX, imóveis, etc.) NÃO vêm daqui — logo, não são tocadas.
import * as XLSX from 'xlsx'

export type ImportItem = {
  carteira_slug: string
  banco: string
  investimento: string
  valor: number
  valor_moeda: number | null
  rotulo: string // "Empresa · Banco · Linha" — só para o preview
}

export type ResultadoImport = {
  ano: number
  mes: number
  aba: string
  dataFecho: string | null
  parcial: boolean // true = mês ainda em andamento (não fechou no último dia)
  itens: ImportItem[]
  ignorados: string[]
}

const MES_ABREV: Record<string, number> = {
  JAN: 1, FEV: 2, MAR: 3, ABR: 4, MAI: 5, MAIO: 5, JUN: 6,
  JUL: 7, AGO: 8, SET: 9, OUT: 10, NOV: 11, DEZ: 12,
}

// Bloco "IMG – BANCOS" (topo da aba): saldos operacionais do grupo IMG.
const TOP_BANCOS: Record<string, [string, string, string]> = {
  BRASIL: ['img-brasil', 'Banco do Brasil', 'Saldo'],
  BRADESCO: ['img-brasil', 'Bradesco', 'Saldo'],
  SICOOB: ['img-brasil', 'Sicoob', 'Saldo'],
  ITAU: ['img-brasil', 'Itaú', 'Saldo'],
  FINAXIS: ['fidic-golden-sky', 'Banco Finaxis', 'Caixa'],
  OYSTER: ['oyster', 'Itaú', 'Saldo'],
  SEASTAR: ['seastar', 'Itaú', 'Saldo'],
}

// Seção "por empresa" (parte de baixo da aba): cabeçalho = nome da empresa; abaixo, as
// contas dela. Só as empresas cujas contas bancárias vêm desta planilha.
const EMPRESAS: Record<string, string> = {
  PAN: 'pan',
  EME: 'eme',
  METVISA: 'metvisa',
  SUMMIT: 'summit',
  'BLACK FORTUNE': 'black-fortune',
  'OB HOLDING': 'ob-holding',
}

type Aoa = (string | number | boolean | null | undefined)[][]

const norm = (v: unknown) => String(v ?? '').trim().toUpperCase()
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)

// Serial do Excel → "dd/mm/aaaa" (base 1899-12-30).
function serialParaData(serial: number): string | null {
  if (!isNum(serial) || serial < 30000 || serial > 90000) return null
  const ms = Date.UTC(1899, 11, 30) + Math.round(serial) * 86400000
  const d = new Date(ms)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${p(d.getUTCDate())}/${p(d.getUTCMonth() + 1)}/${d.getUTCFullYear()}`
}

// Última coluna com movimento na aba (a partir da linha "Total Geral").
function acharColunaFecho(aoa: Aoa): number {
  const tg = aoa.findIndex(r => norm(r?.[1]) === 'TOTAL GERAL')
  if (tg < 0) return -1
  let col = -1
  const linha = aoa[tg]
  for (let c = 2; c < linha.length; c++) if (isNum(linha[c]) && linha[c] !== 0) col = c
  return col
}

// Serial do Excel do dia do fecho (a coluna `col` na linha das datas).
function serialFecho(aoa: Aoa, col: number): number | null {
  for (const r of aoa) {
    if ((r?.[1] == null || r[1] === '') && isNum(r?.[2]) && (r[2] as number) > 40000) {
      const s = r[col]
      if (isNum(s)) return s
    }
  }
  return null
}

// O fecho cai no ÚLTIMO dia do mês? (mês "completo" vs. mês corrente parcial)
function mesCompleto(serial: number | null, ano: number, mes: number): boolean {
  const d = serial != null ? serialParaData(serial) : null
  if (!d) return false
  const dia = Number(d.slice(0, 2))
  const ultimoDia = new Date(Date.UTC(ano, mes, 0)).getUTCDate() // dia 0 do mês seguinte
  return dia >= ultimoDia
}

// Escolhe a aba do ÚLTIMO MÊS FECHADO (fecho no último dia do mês). Se só existir mês
// parcial (corrente), usa esse mesmo, mas sinaliza via `parcial`. Retorna a aba + metadados.
function escolherAba(wb: XLSX.WorkBook) {
  const re = /^(JAN|FEV|MAR|ABR|MAIO|MAI|JUN|JUL|AGO|SET|OUT|NOV|DEZ)-(\d{4})$/
  const comDados = wb.SheetNames
    .map(nome => {
      const m = re.exec(nome.trim().toUpperCase())
      if (!m) return null
      return { nome, ano: Number(m[2]), mes: MES_ABREV[m[1]] }
    })
    .filter((x): x is { nome: string; ano: number; mes: number } => !!x)
    .map(c => {
      const aoa = XLSX.utils.sheet_to_json(wb.Sheets[c.nome], { header: 1, raw: true }) as Aoa
      const col = acharColunaFecho(aoa)
      return { ...c, aoa, col }
    })
    .filter(c => c.col >= 0)
    .sort((a, b) => b.ano * 100 + b.mes - (a.ano * 100 + a.mes))

  if (comDados.length === 0) return null
  // Primeiro mês (do mais recente) que esteja COMPLETO.
  const completo = comDados.find(c => mesCompleto(serialFecho(c.aoa, c.col), c.ano, c.mes))
  const escolhido = completo ?? comDados[0]
  return { ...escolhido, parcial: !completo }
}

export function parseSaldoDiario(buf: ArrayBuffer | Buffer): ResultadoImport {
  const wb = XLSX.read(buf, { type: 'buffer' })
  const alvo = escolherAba(wb)
  if (!alvo) throw new Error('Não encontrei nenhuma aba de mês com dados (ex.: "AGO-2026") na planilha.')

  const { aoa, col, nome, ano, mes, parcial } = alvo
  const itens: ImportItem[] = []
  const ignorados: string[] = []
  const vistos = new Set<string>()
  const cent = (n: number) => Math.round(n * 100) / 100
  const add = (slug: string, banco: string, inv: string, valor: number, rotulo: string, valorMoeda: number | null = null) => {
    const k = `${slug}|${banco}|${inv}`
    if (vistos.has(k)) return
    vistos.add(k)
    itens.push({ carteira_slug: slug, banco, investimento: inv, valor: cent(valor), valor_moeda: valorMoeda != null ? cent(valorMoeda) : null, rotulo })
  }
  const cell = (row: number): number | undefined => {
    const v = aoa[row]?.[col]
    return isNum(v) ? v : undefined
  }

  // 1) Bloco IMG – BANCOS
  const hBancos = aoa.findIndex(r => norm(r?.[1]).includes('BANCOS'))
  if (hBancos >= 0) {
    for (let r = hBancos + 1; r < aoa.length; r++) {
      const label = norm(aoa[r]?.[1])
      if (label.includes('CÂMBIOS EM ABERTO') || label.includes('PAGAMENTOS')) break
      const alvoTop = TOP_BANCOS[label]
      const v = cell(r)
      if (alvoTop && v !== undefined) add(alvoTop[0], alvoTop[1], alvoTop[2], v, `IMG · ${label}`)
    }
  }

  // 2) Câmbios em aberto (Dólar / Euro) → IMG-Brasil · Câmbio
  const cc = aoa.findIndex(r => norm(r?.[1]).includes('CÂMBIOS EM ABERTO'))
  if (cc >= 0) {
    const moedas: [number, string][] = [[cc + 1, 'Dólar'], [cc + 2, 'Euro']]
    for (const [r, nomeMoeda] of moedas) {
      const rs = cell(r)
      const emMoeda = aoa[r]?.[1] // col B guarda o valor na moeda original
      if (rs !== undefined && isNum(emMoeda)) {
        add('img-brasil', 'Câmbio', nomeMoeda, rs, `IMG · Câmbio ${nomeMoeda}`, emMoeda)
      }
    }
  }

  // 3) Seção por empresa
  for (let r = 0; r < aoa.length; r++) {
    const slug = EMPRESAS[norm(aoa[r]?.[1])]
    if (!slug) continue
    // Lê as contas logo abaixo do cabeçalho da empresa (até a próxima empresa/bloco).
    for (let s = r + 1; s < aoa.length && s <= r + 5; s++) {
      const label = norm(aoa[s]?.[1])
      if (!label) continue
      if (EMPRESAS[label] || label.includes('BANCOS') || label.includes('CÂMBIOS')) break
      const v = cell(s)
      if (label.includes('INTER')) { if (v !== undefined) add(slug, 'Inter', 'Em conta', v, `${norm(aoa[r]?.[1])} · Inter`) }
      else if (label.includes('ITA')) { if (v !== undefined) add(slug, 'Itaú', 'Saldo', v, `${norm(aoa[r]?.[1])} · Itaú`) }
      else if (label.includes('XP')) { ignorados.push(`${norm(aoa[r]?.[1])} · XP (posição de investimento — não importada)`) }
    }
  }

  const fechoSerial = serialFecho(aoa, col)
  return { ano, mes, aba: nome, dataFecho: fechoSerial != null ? serialParaData(fechoSerial) : null, parcial, itens, ignorados }
}

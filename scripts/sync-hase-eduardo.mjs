// Sincroniza os investimentos PESSOAIS do Eduardo (app HASE) para dentro do Gestão,
// como a carteira `eduardo-hase` na tabela financeiro_valores. Rodar: `npm run sync:hase`.
//
// - Lê o HASE (tabela investimentos_meses) com a service key do HASE (.env do HASE).
// - Escreve no Gestão (financeiro_valores) com a service key do Gestão (.env.local).
// - FORA: RNX e Itaú (já estão no Gestão), Banco do Brasil/Inter (conta), cofres (espécie).
// - Classificação dos conhecidos no MAP; posição NOVA (não mapeada, não excluída) entra
//   como TRIBUTÁVEL e é LOGADA como "revisar" (p/ eu ajustar o selo quando o dono
//   detalhar melhor os nomes lá no HASE).
// - Sincroniza só os meses que JÁ existem no Gestão (interseção) — não cria mês fantasma.
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const HASE_ENV = 'C:/Users/MICRO/Desktop/HASE PERSONAL/hase-personal/.env'

function env(p) {
  const e = {}
  for (const line of readFileSync(p, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i); if (!m) continue
    let v = m[2].trim(); if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1); e[m[1]] = v
  }
  return e
}

const CARTEIRA = 'eduardo-hase'
// Ficam de FORA (não é investimento pessoal tributável a trazer):
const EXCLUIR = new Set(['RNX', 'BANCO ITAÚ', 'BANCO ITAU', 'BANCO INTER', 'BANCO BRASIL', 'COFRE', 'COFRE DÓLAR', 'COFRE DOLAR'])
// Conhecidos: nome bonito + banco + selo. (trib=false → isento/caixa.)
const MAP = {
  'AVENUE':               { banco: 'Avenue', inv: 'Avenue (ações/ETF exterior)', trib: true },
  'XP ACOES':             { banco: 'XP', inv: 'Ações', trib: true },
  'XP RENDA FIXA':        { banco: 'XP', inv: 'Renda Fixa', trib: true },
  'XP FUNDOS':            { banco: 'XP', inv: 'Fundos', trib: true },
  'XP  ARTICA LONG TERM': { banco: 'XP', inv: 'Ártica Long Term (fundo de ações)', trib: true },
  'ARTICA LONG TERM BTG': { banco: 'BTG', inv: 'Ártica Long Term (fundo de ações)', trib: true },
  'BTG PACTUAL':          { banco: 'BTG', inv: 'Fundo de ações BTG', trib: true },
  'DIVIDENDOS':           { banco: 'XP', inv: 'Dividendos', trib: false },
  'FUNDO IMOBILIARIO':    { banco: 'XP', inv: 'Fundo Imobiliário', trib: false },
  'XP CONTA DIGITAL':     { banco: 'XP', inv: 'Conta Digital (caixa)', trib: false },
}
const bancoHeuristico = (nome) =>
  /^AVENUE/.test(nome) ? 'Avenue' : /BTG/.test(nome) ? 'BTG' : /^XP/.test(nome) ? 'XP' : 'Outros'

async function main() {
  const h = env(HASE_ENV), g = env(join(ROOT, '.env.local'))
  const hase = createClient(h.SUPABASE_URL, h.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
  const gestao = createClient(g.NEXT_PUBLIC_SUPABASE_URL, g.SUPABASE_SECRET_KEY, { auth: { persistSession: false } })

  // Meses que existem no Gestão (interseção p/ não criar mês fantasma).
  const { data: fv, error: e1 } = await gestao.from('financeiro_valores').select('ano,mes')
  if (e1) throw new Error('Gestão: ' + e1.message)
  const mesesGestao = new Set(fv.map(r => r.ano * 100 + r.mes))

  const { data: meses, error: e2 } = await hase.from('investimentos_meses').select('ano,mes,valores').order('ano').order('mes')
  if (e2) throw new Error('HASE: ' + e2.message)

  const rows = []
  const novas = new Set()
  const alvos = []
  for (const m of meses) {
    if (!mesesGestao.has(m.ano * 100 + m.mes)) continue // só meses que o Gestão já tem
    alvos.push(`${m.mes}/${m.ano}`)
    for (const [nome, valor] of Object.entries(m.valores || {})) {
      if (valor == null || EXCLUIR.has(nome.trim().toUpperCase())) continue
      const conf = MAP[nome]
      const banco = conf ? conf.banco : bancoHeuristico(nome)
      const investimento = conf ? conf.inv : nome
      const tributavel = conf ? conf.trib : true
      if (!conf) novas.add(nome)
      rows.push({ carteira_slug: CARTEIRA, banco, investimento, ano: m.ano, mes: m.mes, valor: Number(valor), tributavel })
    }
  }
  console.log('Meses sincronizados:', alvos.join(', ') || '(nenhum)')
  if (novas.size) console.log('⚠️ posições NOVAS (entraram como tributável — revisar selo):', [...novas].join(', '))

  // Regrava: apaga a carteira e insere de novo (idempotente).
  const { error: eDel } = await gestao.from('financeiro_valores').delete().eq('carteira_slug', CARTEIRA)
  if (eDel) throw new Error('Gestão delete: ' + eDel.message)
  if (rows.length) {
    const { error: eIns } = await gestao.from('financeiro_valores').insert(rows)
    if (eIns) throw new Error('Gestão insert: ' + eIns.message)
  }
  console.log(`✓ ${rows.length} linhas gravadas em financeiro_valores (carteira ${CARTEIRA}).`)
}
main().catch(e => { console.error('ERRO:', e.message); process.exit(1) })

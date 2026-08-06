// Semeia financeiro_valores com os saldos ATUAIS do código (jan–jun/2026), fiéis.
// Idempotente (upsert pela PK). Uso: node --experimental-strip-types scripts/seed-financeiro.mjs
import fs from 'fs'
import { CARTEIRAS } from '../src/lib/financeiro/dados.ts'

const env = fs.readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
const get = (k) => (env.match(new RegExp('^' + k + '=(.*)$', 'm')) || [])[1]?.trim().replace(/^["']|["']$/g, '')
const URL_SB = get('NEXT_PUBLIC_SUPABASE_URL')
const KEY = get('SUPABASE_SECRET_KEY') || get('SUPABASE_SERVICE_ROLE_KEY')
const h = { apikey: KEY, Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json' }

const ANO = 2026
const linhas = []
for (const cart of CARTEIRAS) {
  for (const conta of cart.contas) {
    for (const inv of conta.investimentos) {
      inv.valores.forEach((v, i) => {
        if (v === undefined || v === null) return // sem extrato naquele mês
        linhas.push({
          carteira_slug: cart.slug,
          banco: conta.banco,
          investimento: inv.nome,
          ano: ANO,
          mes: i + 1,
          valor: v,
          valor_moeda: inv.valoresMoeda ? (inv.valoresMoeda[i] ?? null) : null,
        })
      })
    }
  }
}

console.log(`Linhas a semear: ${linhas.length}`)
const LOTE = 200
let ok = 0
for (let i = 0; i < linhas.length; i += LOTE) {
  const lote = linhas.slice(i, i + LOTE)
  const r = await fetch(`${URL_SB}/rest/v1/financeiro_valores`, {
    method: 'POST',
    headers: { ...h, Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify(lote),
  })
  if (!r.ok) { console.log('ERRO lote', i, r.status, await r.text()); process.exit(1) }
  ok += lote.length
  process.stdout.write(`  ${ok}/${linhas.length}\r`)
}

const cnt = await fetch(`${URL_SB}/rest/v1/financeiro_valores?select=mes&limit=100000`, { headers: h }).then(r => r.json())
const porMes = cnt.reduce((a, x) => { a[x.mes] = (a[x.mes] || 0) + 1; return a }, {})
console.log('\n✅ Semeado. Registros por mês:', porMes, '| total:', cnt.length)

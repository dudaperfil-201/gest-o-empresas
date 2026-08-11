import { createAdminClient } from '@/lib/supabase/admin'

// Robô diário: baixa o CSV oficial do Tesouro Transparente (histórico completo, ~14 MB),
// extrai os títulos atrelados à inflação (Tesouro IPCA+) da data-base mais recente e
// grava um resumo leve na tabela tesouro_ipca (o painel lê de lá).

const CSV_URL =
  'https://www.tesourotransparente.gov.br/ckan/dataset/df56aa42-484a-4a59-8184-7676580c81e3/resource/796d2059-14e9-44e3-80c9-2d9e30b405c1/download/PrecoTaxaTesouroDireto.csv'

// "1.242,04" / "8,06" → número; vazio → null
function toNum(s: string): number | null {
  const c = (s ?? '').trim()
  if (!c) return null
  const n = parseFloat(c.replace(/\./g, '').replace(',', '.'))
  return Number.isFinite(n) ? n : null
}
// "10/08/2026" → "2026-08-10"
function dataISO(d: string): string | null {
  const [a, b, c] = (d ?? '').split('/')
  return a && b && c ? `${c}-${b}-${a}` : null
}
const ord = (d: string) => { const [a, b, c] = (d ?? '').split('/'); return (c ?? '') + (b ?? '') + (a ?? '') }

export type ResultadoTesouro = { ok: boolean; gravados?: number; data_base?: string; mensagem: string }

export async function atualizarTesouroIpca(): Promise<ResultadoTesouro> {
  let txt: string
  try {
    const resp = await fetch(CSV_URL, { headers: { 'User-Agent': 'Mozilla/5.0' }, cache: 'no-store' })
    if (!resp.ok) return { ok: false, mensagem: `Falha ao baixar o CSV (HTTP ${resp.status}).` }
    txt = await resp.text()
  } catch (e) {
    return { ok: false, mensagem: 'Erro de rede ao baixar o CSV: ' + (e instanceof Error ? e.message : String(e)) }
  }

  const linhas = txt.split(/\r?\n/)
  // Colunas: Tipo;Venc;DataBase;TaxaCompra;TaxaVenda;PUCompra;PUVenda;PUBase
  let maxData = '00000000'
  const ipca: string[][] = []
  for (let i = 1; i < linhas.length; i++) {
    const col = linhas[i].split(';')
    if (col.length < 6) continue
    if (!/IPCA/i.test(col[0])) continue
    ipca.push(col)
    if (ord(col[2]) > ord(maxData)) maxData = col[2]
  }
  const doDia = ipca.filter(c => c[2] === maxData)
  if (doDia.length === 0) return { ok: false, mensagem: 'Nenhum título IPCA encontrado no CSV.' }

  const rows = doDia
    .map(c => ({
      titulo: (c[0] ?? '').trim(),
      vencimento: dataISO(c[1]),
      taxa: toNum(c[3]),
      pu: toNum(c[5]),
      data_base: dataISO(c[2]),
      atualizado_em: new Date().toISOString(),
    }))
    .filter(r => r.titulo && r.vencimento)

  const supabase = createAdminClient()
  // Substitui o conjunto inteiro (títulos vencidos deixam de existir).
  await supabase.from('tesouro_ipca').delete().not('titulo', 'is', null)
  const { error } = await supabase.from('tesouro_ipca').insert(rows)
  if (error) return { ok: false, mensagem: 'Erro ao gravar: ' + error.message }

  return { ok: true, gravados: rows.length, data_base: maxData, mensagem: `${rows.length} títulos IPCA+ atualizados (base ${maxData}).` }
}

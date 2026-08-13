import type { createClient } from '@/lib/supabase/server'

type Supabase = Awaited<ReturnType<typeof createClient>>

const MES_ABREV = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

export type ItemAtraso = {
  imovelId: string
  endereco: string
  inquilino: string
  telefone: string | null
  mes: number
  ano: number
  mesRef: string        // "jun/2026"
  venceEm: string       // ISO date (YYYY-MM-DD)
  dias: number          // dias de atraso
  meses: number         // meses de atraso (p/ juros)
  valor: number         // aluguel base
  valorAtual: number    // aluguel + juros estimado
}

export type EmpresaAtraso = {
  id: string
  nome: string
  itens: ItemAtraso[]
  subtotal: number       // soma dos aluguéis
  subtotalAtual: number  // soma atualizada (c/ juros)
}

// Compila os aluguéis VENCIDOS e ainda NÃO PAGOS de TODAS as empresas — lista de
// cobrança. "Não pago" = não existe pagamento pago/atrasado para aquele imóvel/mês.
// Regras:
//  - só imóveis ativos com inquilino ativo;
//  - considera do mês em que o SISTEMA começou a registrar (menor competência lançada)
//    ou da data_inicio do inquilino (o que for mais recente) — evita acusar meses de
//    antes do app;
//  - o MÊS CORRENTE NÃO entra (ainda está no prazo de pagamento) — só meses já
//    fechados (anteriores ao mês atual);
//  - juros estimado pelo juros_mes do inquilino × meses de atraso.
export async function carregarAtrasos(supabase: Supabase) {
  const hoje = new Date()
  const hojeKey = hoje.getFullYear() * 12 + hoje.getMonth()

  const [{ data: empresas }, { data: imoveis }, { data: inquilinos }, { data: pagamentos }] = await Promise.all([
    supabase.from('empresas').select('id, nome').order('nome'),
    supabase.from('imoveis').select('id, empresa_id, endereco, valor_aluguel, dia_vencimento').eq('ativo', true),
    supabase.from('inquilinos').select('imovel_id, nome, telefone, data_inicio, juros_mes, ativo'),
    supabase.from('pagamentos').select('imovel_id, mes, ano, status'),
  ])

  // Inquilino ativo por imóvel (o primeiro ativo encontrado).
  const inqAtivo: Record<string, { nome: string; telefone: string | null; data_inicio: string | null; juros_mes: number | null }> = {}
  for (const t of inquilinos ?? []) {
    if (t.ativo === false) continue
    if (!inqAtivo[t.imovel_id]) inqAtivo[t.imovel_id] = { nome: t.nome, telefone: t.telefone, data_inicio: t.data_inicio, juros_mes: t.juros_mes }
  }

  // Mês em que o sistema começou (menor competência já lançada em pagamentos).
  const keys = (pagamentos ?? []).map(p => p.ano * 12 + (p.mes - 1))
  const sysStart = keys.length ? Math.min(...keys) : hojeKey
  // Meses JÁ PAGOS (pago/atrasado): `${imovel}|${chaveMes}`.
  const pagos = new Set(
    (pagamentos ?? []).filter(p => p.status === 'pago' || p.status === 'atrasado').map(p => `${p.imovel_id}|${p.ano * 12 + (p.mes - 1)}`)
  )

  const empresasOut: EmpresaAtraso[] = []
  for (const empresa of empresas ?? []) {
    const seus = (imoveis ?? []).filter(i => i.empresa_id === empresa.id)
    const itens: ItemAtraso[] = []
    for (const im of seus) {
      const t = inqAtivo[im.id]
      if (!t) continue // imóvel sem inquilino ativo — ninguém a cobrar
      const diKey = t.data_inicio ? (() => { const d = new Date(t.data_inicio + 'T12:00:00'); return d.getFullYear() * 12 + d.getMonth() })() : sysStart
      const startKey = Math.max(sysStart, diKey)
      const diaVenc = Math.min(im.dia_vencimento || 10, 28)
      const jurosPct = t.juros_mes ?? 1
      const valor = im.valor_aluguel ?? 0
      // k < hojeKey: só meses JÁ FECHADOS. O mês corrente fica de fora (ainda no prazo).
      for (let k = startKey; k < hojeKey; k++) {
        const mes = (k % 12) + 1
        const ano = Math.floor(k / 12)
        const venc = new Date(ano, mes - 1, diaVenc, 12, 0, 0)
        if (pagos.has(`${im.id}|${k}`)) continue     // já pago
        const dias = Math.floor((hoje.getTime() - venc.getTime()) / 86400000)
        const meses = Math.max(1, Math.ceil(dias / 30))
        itens.push({
          imovelId: im.id,
          endereco: im.endereco,
          inquilino: t.nome,
          telefone: t.telefone,
          mes, ano,
          mesRef: `${MES_ABREV[mes - 1]}/${ano}`,
          venceEm: `${ano}-${String(mes).padStart(2, '0')}-${String(diaVenc).padStart(2, '0')}`,
          dias, meses,
          valor,
          valorAtual: valor * (1 + (jurosPct / 100) * meses),
        })
      }
    }
    // Mais atrasado primeiro dentro da empresa.
    itens.sort((a, b) => b.dias - a.dias || a.endereco.localeCompare(b.endereco))
    if (itens.length > 0) {
      empresasOut.push({
        id: empresa.id,
        nome: empresa.nome,
        itens,
        subtotal: itens.reduce((s, i) => s + i.valor, 0),
        subtotalAtual: itens.reduce((s, i) => s + i.valorAtual, 0),
      })
    }
  }

  const totalItens = empresasOut.reduce((s, e) => s + e.itens.length, 0)
  const totalAberto = empresasOut.reduce((s, e) => s + e.subtotal, 0)
  const totalAtual = empresasOut.reduce((s, e) => s + e.subtotalAtual, 0)

  return { empresas: empresasOut, totalItens, totalAberto, totalAtual, desde: MES_ABREV[(sysStart % 12)] + '/' + Math.floor(sysStart / 12) }
}

export type DadosAtrasos = Awaited<ReturnType<typeof carregarAtrasos>>

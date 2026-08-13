import type { createClient } from '@/lib/supabase/server'

type Supabase = Awaited<ReturnType<typeof createClient>>

const MES_ABREV = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

// Dados do relatório mensal de UM mês/ano — usado pela tela e pela exportação Excel,
// para as duas ficarem sempre iguais.
//
// REGIME DE CAIXA (regra fiscal): o aluguel entra no relatório do mês em que foi
// EFETIVAMENTE PAGO (data_pagamento), NUNCA no mês de vencimento/competência. Assim um
// aluguel jamais aparece em dois meses — se aparecesse, geraria imposto em duplicidade.
// Ex.: aluguel de competência julho pago em agosto → conta em AGOSTO. Extras/descontos
// acompanham o aluguel: entram no mês em que o aluguel daquela competência foi pago.
export async function carregarRelatorio(supabase: Supabase, mes: number, ano: number) {
  // Janela do mês pela DATA DE PAGAMENTO: [inicio, fimExcl).
  const inicio = `${ano}-${String(mes).padStart(2, '0')}-01`
  const fimExcl = mes === 12 ? `${ano + 1}-01-01` : `${ano}-${String(mes + 1).padStart(2, '0')}-01`

  const { data: empresas } = await supabase.from('empresas').select('id, nome').order('nome')

  const resultado = await Promise.all((empresas ?? []).map(async empresa => {
    const { data: imoveis } = await supabase
      .from('imoveis')
      .select('id, endereco, valor_aluguel, inquilinos(nome)')
      .eq('empresa_id', empresa.id)
      .eq('ativo', true)
      .order('endereco')

    const ids = (imoveis ?? []).map(i => i.id)
    if (ids.length === 0) return { ...empresa, imoveis: [], somaValor: 0, somaRecebido: 0 }

    // Aluguéis RECEBIDOS neste mês (pela data_pagamento; só pago/atrasado). Extras e
    // descontos entram pelo SEU PRÓPRIO mês (mes/ano do item): o gestor lança/edita o
    // extra no mês em que ele foi pago (regime de caixa), independente do aluguel.
    // Editáveis no Histórico de pagamentos do inquilino.
    const [{ data: pagosRaw }, { data: extrasRaw }, { data: descontosRaw }] = await Promise.all([
      supabase.from('pagamentos').select('imovel_id, status, valor_pago, mes, ano, data_pagamento')
        .in('imovel_id', ids).in('status', ['pago', 'atrasado'])
        .gte('data_pagamento', inicio).lt('data_pagamento', fimExcl),
      supabase.from('extras_itens').select('imovel_id, valor').in('imovel_id', ids).eq('mes', mes).eq('ano', ano),
      supabase.from('descontos_itens').select('imovel_id, valor').in('imovel_id', ids).eq('mes', mes).eq('ano', ano),
    ])

    const extrasSum: Record<string, number> = {}
    for (const e of extrasRaw ?? []) extrasSum[e.imovel_id] = (extrasSum[e.imovel_id] ?? 0) + (e.valor ?? 0)
    const descontosSum: Record<string, number> = {}
    for (const d of descontosRaw ?? []) descontosSum[d.imovel_id] = (descontosSum[d.imovel_id] ?? 0) + (d.valor ?? 0)

    // Agrega por imóvel (um imóvel pode ter mais de um aluguel pago no mês — ex.: mês de
    // acerto em que o inquilino quita dois meses). `ref` = competências recebidas, para a
    // tela avisar quando o valor é de um mês diferente do relatório.
    type Agg = { valor_pago: number; atrasado: boolean; refs: string[] }
    const porImovel: Record<string, Agg> = {}
    for (const p of pagosRaw ?? []) {
      const a = porImovel[p.imovel_id] ?? { valor_pago: 0, atrasado: false, refs: [] }
      a.valor_pago += (p.valor_pago ?? 0)
      if (p.status === 'atrasado') a.atrasado = true
      if (p.mes !== mes || p.ano !== ano) a.refs.push(`${MES_ABREV[(p.mes ?? 1) - 1]}/${String(p.ano).slice(2)}`)
      porImovel[p.imovel_id] = a
    }

    const imoveisRel = (imoveis ?? []).map(imovel => {
      const inquilino = Array.isArray(imovel.inquilinos) ? imovel.inquilinos[0] : imovel.inquilinos
      const a = porImovel[imovel.id]
      const pag = a ? { status: a.atrasado ? 'atrasado' : 'pago', valor_pago: a.valor_pago, refs: a.refs } : null
      return { ...imovel, pag, inquilino, extras: extrasSum[imovel.id] ?? 0, descontos: descontosSum[imovel.id] ?? 0 }
    })

    // Empresa: Valor = soma dos aluguéis (carteira); Recebido = caixa do mês
    // (aluguéis pagos + extras − descontos, tudo já filtrado pela data de pagamento).
    const somaValor = imoveisRel.reduce((s, i) => s + (i.valor_aluguel ?? 0), 0)
    const somaRecebido = imoveisRel.reduce((s, i) => s + (i.pag?.valor_pago ?? 0) + (i.extras ?? 0) - (i.descontos ?? 0), 0)

    return { ...empresa, imoveis: imoveisRel, somaValor, somaRecebido }
  }))

  const todos = resultado.flatMap(e => e.imoveis)
  const totalEsperado = todos.reduce((s, i) => s + (i.valor_aluguel ?? 0), 0)
  const totalExtras = todos.reduce((s, i) => s + (i.extras ?? 0), 0)
  const totalDescontos = todos.reduce((s, i) => s + (i.descontos ?? 0), 0)
  const totalRecebido = todos.reduce((s, i) => s + (i.pag?.valor_pago ?? 0), 0) + totalExtras - totalDescontos
  // Pendente = aluguéis da carteira que NÃO entraram no caixa neste mês.
  const totalPendente = todos.filter(i => (i.pag?.valor_pago ?? 0) === 0).reduce((s, i) => s + (i.valor_aluguel ?? 0), 0)

  return { resultado, totalEsperado, totalRecebido, totalPendente }
}

export type DadosRelatorio = Awaited<ReturnType<typeof carregarRelatorio>>

import type { createClient } from '@/lib/supabase/server'

type Supabase = Awaited<ReturnType<typeof createClient>>

// Dados do relatório mensal de UM mês/ano — usado pela tela e pela exportação Excel,
// para as duas ficarem sempre iguais.
export async function carregarRelatorio(supabase: Supabase, mes: number, ano: number) {
  const { data: empresas } = await supabase.from('empresas').select('id, nome').order('nome')

  const resultado = await Promise.all((empresas ?? []).map(async empresa => {
    const { data: imoveis } = await supabase
      .from('imoveis')
      .select('id, endereco, valor_aluguel, inquilinos(nome)')
      .eq('empresa_id', empresa.id)
      .eq('ativo', true)
      .order('endereco')

    const ids = (imoveis ?? []).map(i => i.id)
    const [{ data: pagamentos }, { data: extrasRaw }, { data: descontosRaw }] = ids.length > 0 ? await Promise.all([
      supabase.from('pagamentos').select('imovel_id, status, valor_original, valor_pago').in('imovel_id', ids).eq('mes', mes).eq('ano', ano),
      supabase.from('extras_itens').select('imovel_id, valor').in('imovel_id', ids).eq('mes', mes).eq('ano', ano),
      supabase.from('descontos_itens').select('imovel_id, valor').in('imovel_id', ids).eq('mes', mes).eq('ano', ano),
    ]) : [{ data: [] }, { data: [] }, { data: [] }]

    const pagMap = Object.fromEntries((pagamentos ?? []).map(p => [p.imovel_id, p]))
    const extrasSum: Record<string, number> = {}
    for (const e of extrasRaw ?? []) extrasSum[e.imovel_id] = (extrasSum[e.imovel_id] ?? 0) + (e.valor ?? 0)
    const descontosSum: Record<string, number> = {}
    for (const d of descontosRaw ?? []) descontosSum[d.imovel_id] = (descontosSum[d.imovel_id] ?? 0) + (d.valor ?? 0)

    const imoveisRel = (imoveis ?? []).map(imovel => {
      const pag = pagMap[imovel.id]
      const inquilino = Array.isArray(imovel.inquilinos) ? imovel.inquilinos[0] : imovel.inquilinos
      return { ...imovel, pag, inquilino, extras: extrasSum[imovel.id] ?? 0, descontos: descontosSum[imovel.id] ?? 0 }
    })

    // Somatório da empresa: Valor = soma dos aluguéis; Recebido = pagos (pago/atrasado)
    // + extras − descontos.
    const somaValor = imoveisRel.reduce((s, i) => s + (i.valor_aluguel ?? 0), 0)
    const somaRecebido = imoveisRel
      .filter(i => i.pag?.status === 'pago' || i.pag?.status === 'atrasado')
      .reduce((s, i) => s + (i.pag?.valor_pago ?? 0), 0)
      + imoveisRel.reduce((s, i) => s + (i.extras ?? 0), 0)
      - imoveisRel.reduce((s, i) => s + (i.descontos ?? 0), 0)

    return { ...empresa, imoveis: imoveisRel, somaValor, somaRecebido }
  }))

  const todos = resultado.flatMap(e => e.imoveis)
  const pagos = todos.filter(i => i.pag?.status === 'pago' || i.pag?.status === 'atrasado')
  const totalEsperado = todos.reduce((s, i) => s + (i.valor_aluguel ?? 0), 0)
  const totalExtras = todos.reduce((s, i) => s + (i.extras ?? 0), 0)
  const totalDescontos = todos.reduce((s, i) => s + (i.descontos ?? 0), 0)
  const totalRecebido = pagos.reduce((s, i) => s + (i.pag?.valor_pago ?? 0), 0) + totalExtras - totalDescontos
  const totalPendente = totalEsperado - pagos.reduce((s, i) => s + (i.valor_aluguel ?? 0), 0)

  return { resultado, totalEsperado, totalRecebido, totalPendente }
}

export type DadosRelatorio = Awaited<ReturnType<typeof carregarRelatorio>>

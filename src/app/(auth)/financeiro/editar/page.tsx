import { carregarFinanceiro } from '@/lib/financeiro/carregar'
import { exigirFinanceiro } from '@/lib/auth'
import EditorFinanceiro from './EditorFinanceiro'

export const dynamic = 'force-dynamic'

export default async function EditarFinanceiroPage() {
  await exigirFinanceiro()
  const { carteiras, meses } = await carregarFinanceiro()

  // Lista plana de investimentos (com os valores de cada mês, para pré-preencher).
  const itens = carteiras.flatMap(c => c.contas.flatMap(ct => ct.investimentos.map(inv => ({
    slug: c.slug,
    carteiraNome: c.nome,
    tipo: c.tipo,
    banco: ct.banco,
    nome: inv.nome,
    moeda: inv.moeda ?? null,
    valores: meses.map((_, i) => inv.valores[i] ?? null),
    valoresMoeda: meses.map((_, i) => inv.valoresMoeda?.[i] ?? null),
  }))))

  return <EditorFinanceiro itens={itens} meses={meses} />
}

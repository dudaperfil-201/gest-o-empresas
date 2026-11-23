// Parser do extrato "Posição a mercado mensal" do Itaú (carteiras PF Eduardo/Serginho) —
// PDF de texto, detalhado ativo por ativo. Para cada ativo extrai o Saldo bruto (R$) e
// classifica TRIBUTÁVEL × ISENTO pela própria coluna "IR + IOF" do extrato (IR>0 →
// tributável; 0,00 em CRI/CRA/LIG/deb. incentivada/FII → isento). Recebe o TEXTO já
// extraído do PDF (via pdf-parse), que emite cada célula numa linha, em ordem de leitura.
//
// Âncora robusta: o token "DD/MM/YY" (data da cotação, = fecho do mês) aparece ao fim da
// linha de cada ativo; os 3 números imediatamente antes são [Saldo bruto, Saldo líquido,
// IR + IOF]. O nome é a(s) linha(s) de texto logo acima das células de dados. Validação:
// a soma dos Saldo bruto de TODOS os ativos tem de bater com o "Saldo bruto" do resumo
// (à prova de erro de leitura — igual à La Jolla). O extrato mascara o titular, então a
// carteira (Eduardo × Serginho) é escolhida na tela antes de importar.

export type ItemItau = {
  banco: string // classe de ativo (Pós-fixado, Inflação, …) ou "Caixa"
  investimento: string // nome do ativo
  valor: number // Saldo bruto (R$)
  tributavel: boolean | null // true=tributável, false=isento, null=não classificado
  desempenho: number | null // rentabilidade do MÊS (%) — coluna do próprio extrato
  novo?: boolean
}

export type ResultadoItau = {
  ano: number
  mes: number
  dataPosicao: string | null
  totalBruto: number | null // "Saldo bruto" do resumo
  somaExtraida: number // soma dos Saldo bruto lidos (p/ reconciliar)
  reconciliado: boolean
  emConta: number | null // "Saldo em conta" (caixa)
  somaTrib: number
  somaIsento: number
  itens: ItemItau[]
}

// Classes de ativos do extrato (cabeçalhos/subtotais no detalhamento).
const CLASSES = [
  'Pós-fixado', 'Prefixado', 'Inflação', 'Renda Fixa Ativo', 'Multimercado',
  'Renda variável', 'Renda Variável', 'Internacional',
  'Alternativos Líquidos', 'Alternativos Ilíquidos', 'Valores a liquidar',
]
const normClasse = (c: string) => (c === 'Renda variável' ? 'Renda Variável' : c)

const numBR = (s: string): number | null => {
  const v = Number(String(s).replace(/\./g, '').replace(',', '.'))
  return Number.isFinite(v) ? Math.round(v * 100) / 100 : null
}
const isMoney = (s: string) => /^-?\d{1,3}(\.\d{3})*,\d{2}$/.test((s || '').trim())
// Célula de dado numérico/data/traço (pulada ao buscar o nome do ativo subindo).
const isDataCell = (s: string) =>
  s === '-' || /^\d{2}\/\d{2}\/\d{2,4}$/.test(s || '') || /^-?[\d.]*,\d+$/.test(s || '') || /^\d[\d.]*$/.test(s || '')
const ehNome = (s: string) => /^[A-Za-zÀ-ÿ(]/.test((s || '').trim())
// Rótulos de cabeçalho de página/coluna — param a captura do nome (não são nome de ativo).
const ehHeader = (s: string) =>
  /^(Ativos|Data de|vencto|Quantidade|PU\/Cotação|Saldo bruto|Saldo líquido|IR \+ IOF|Data da|cotação|Alocação|início|Out\/|2026|12M|24M|Início|Rentabilidade|Com gross up|Detalhamento|Tipo da posição|Data da posição|Data de rentabilidade|\(R\$\)|\(%\))/.test((s || '').trim())
  || CLASSES.includes((s || '').trim())

// Classificação de reserva quando a coluna IR vem "—" (ações, FII, ISEN, incentivados).
function classifPorNome(nome: string): boolean | null {
  const n = nome.toUpperCase()
  if (/ISEN|ISENTO/.test(n)) return false
  if (/\(XPML|\bFII\b|FDO ?IMOB|IMOBILI[ÁA]RI/.test(n)) return false // FII: rendimento isento
  if (/\(KNCE|\bFIDC\b|KINEA CR[ÉE]D/.test(n)) return false // crédito imobiliário isento
  if (/\([A-Z]{4}\d\)/.test(n)) return true // ação → ganho de capital (tributável)
  if (/\b(CRI|CRA|LIG|LCI|LCA|LCD)\b/.test(n)) return false
  if (/INCENT|\bINFRA\b/.test(n)) return false
  return null
}

export function parsePosicaoItau(text: string): ResultadoItau {
  const L = text.split('\n').map(s => s.trim())
  const ini = L.findIndex(s => /^IR \+ IOF/.test(s)) // começo do detalhamento
  const fimMov = L.findIndex((s, i) => i > ini && /^Movimentações/.test(s))
  const fim = fimMov < 0 ? L.length : fimMov

  const md = text.match(/Data da posição:\s*(\d{2})\/(\d{2})\/(\d{4})/)
  const ano = md ? Number(md[3]) : 0
  const mes = md ? Number(md[2]) : 0
  const dataPosicao = md ? `${md[1]}/${md[2]}/${md[3]}` : null
  const totalBruto = (() => { const m = text.match(/Saldo\s*bruto\s*R\$\s*([\d.,]+)/i); return m ? numBR(m[1]) : null })()
  const emConta = (() => { const m = text.match(/Saldo em\s*conta\s*R\$\s*([\d.,]+)/i); return m ? numBR(m[1]) : null })()
  // Âncora de cada ativo: a "data da cotação" = data da posição (fecho do mês), em 2 dígitos
  // de ano. Aparece ao fim da linha do ativo, logo após [bruto, líquido, IR+IOF]. Específica
  // do mês (não um regex genérico de data, que pegaria data de início/alocação também).
  const anchor = md ? `${md[1]}/${md[2]}/${md[3].slice(2)}` : null

  type Bruto = { classe: string; nome: string; valor: number; tributavel: boolean | null; desempenho: number | null }
  const brutos: Bruto[] = []
  let classe = ''
  if (ini >= 0 && anchor) {
    for (let j = ini; j < fim; j++) {
      if (CLASSES.includes(L[j])) { classe = normClasse(L[j]); continue }
      if (L[j] !== anchor) continue
      const bruto = L[j - 3]
      if (!isMoney(bruto)) continue
      // Nome: junta as linhas de texto contíguas logo acima das células de dados do ativo.
      const parts: string[] = []
      let started = false
      for (let k = j - 4; k >= 0 && k > j - 18; k--) {
        const s = L[k]
        if (!started) {
          if (isDataCell(s)) continue
          if (ehNome(s) && !ehHeader(s)) { started = true; parts.unshift(s); continue }
          break
        } else {
          if (ehNome(s) && !ehHeader(s)) parts.unshift(s); else break
        }
      }
      if (!parts.length) continue
      const nome = parts.join(' ').replace(/\s+/g, ' ').trim()
      const ir = L[j - 1]
      const irNum = ir === '-' || ir === '' ? null : numBR(ir)
      const tributavel = irNum == null ? classifPorNome(nome) : irNum > 0
      // Desempenho do MÊS (%): após a âncora vêm [Alocação %, Data de início, Rentab Out].
      // O 3º token (j+3) é a rentabilidade do mês que o próprio extrato calcula.
      const rp = L[j + 3]
      const desempenho = /^-?\d{1,3},\d{2}$/.test(rp || '') ? numBR(rp) : null
      brutos.push({ classe: classe || 'Outros', nome, valor: numBR(bruto) ?? 0, tributavel, desempenho })
    }
  }

  // Reconciliação: soma de TODOS os brutos lidos × "Saldo bruto" do resumo.
  const somaExtraida = Math.round(brutos.reduce((s, b) => s + b.valor, 0) * 100) / 100
  const reconciliado = totalBruto != null && Math.abs(somaExtraida - totalBruto) < 1

  // Itens para gravar: exclui "Valores a liquidar" (recebíveis transitórios) e saldos zero.
  const itens: ItemItau[] = brutos
    .filter(b => b.classe !== 'Valores a liquidar' && b.valor !== 0)
    .map(b => ({ banco: b.classe, investimento: b.nome, valor: b.valor, tributavel: b.tributavel, desempenho: b.desempenho }))
  // Caixa (Saldo em conta) — fora do "Saldo bruto", entra como linha própria não classificada.
  if (emConta != null && emConta > 0) itens.push({ banco: 'Caixa', investimento: 'Em conta', valor: emConta, tributavel: null, desempenho: null })

  const somaTrib = Math.round(itens.filter(i => i.tributavel === true).reduce((s, i) => s + i.valor, 0) * 100) / 100
  const somaIsento = Math.round(itens.filter(i => i.tributavel === false).reduce((s, i) => s + i.valor, 0) * 100) / 100

  return { ano, mes, dataPosicao, totalBruto, somaExtraida, reconciliado, emConta, somaTrib, somaIsento, itens }
}

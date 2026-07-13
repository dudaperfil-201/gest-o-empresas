// Dados de investimentos extraídos da planilha INVESTIMENTOS.xlsx — posição mensal de 2026.
// valores[i] corresponde a MESES_2026[i] (Jan..Mai/2026). Blank na planilha = 0.
// Enquanto os saldos vêm da planilha, ficam aqui embutidos; ao migrarmos para
// atualização em app, isso vira tabela no Supabase.

export const MESES_2026 = [
  { abrev: 'JAN', nome: 'JANEIRO' },
  { abrev: 'FEV', nome: 'FEVEREIRO' },
  { abrev: 'MAR', nome: 'MARÇO' },
  { abrev: 'ABR', nome: 'ABRIL' },
  { abrev: 'MAI', nome: 'MAIO' },
  { abrev: 'JUN', nome: 'JUNHO' },
]

// Cada carteira/conta pode ter menos meses que o total (dados chegam por extrato,
// mês a mês). valores[i] === undefined = "ainda sem extrato" para aquele mês.

export interface Investimento { nome: string; valores: number[]; moeda?: string; valoresMoeda?: number[] }
export interface Conta { banco: string; investimentos: Investimento[] }
export interface Carteira { slug: string; nome: string; tipo: 'brasil' | 'internacional'; contas: Conta[] }

export const CARTEIRAS: Carteira[] = [
  {
    slug: 'ob-holding', nome: 'OB Holding', tipo: 'brasil', contas: [
      { banco: 'XP', investimentos: [
        { nome: 'Ações', valores: [128743.20, 103929.90, 114167.10, 119321.70, 119318.10] },
        { nome: 'COE', valores: [1195.75, 1216.53, 1226.12, 1242.90, 1256.48] },
        { nome: 'Dividendos', valores: [467.52, 336.00, 0, 0, 604.80] },
        { nome: 'Em conta', valores: [0, 1213.17, 381.72, 462.27, 481.20] },
      ] },
      { banco: 'Inter', investimentos: [
        { nome: 'Em conta', valores: [5593.22, 18294.83, 52847.43, 8049.20, 108842.09, 0] },
      ] },
      { banco: 'Itaú', investimentos: [
        { nome: 'Saldo', valores: [0, 0, 74396.50, 183482.91, 101939.92, 51577.18] },
      ] },
    ],
  },
  {
    slug: 'metvisa', nome: 'METVISA', tipo: 'brasil', contas: [
      // Junho/2026 (índice 5) importado do extrato XP (posição 30/06/2026).
      { banco: 'XP', investimentos: [
        { nome: 'Renda Fixa', valores: [270761.18, 283028.06, 285134.16, 288832.21, 292373.81, 224764.14] },
        { nome: 'COE', valores: [100225.39, 101690.44, 102559.32, 103863.43, 104942.76, 106155.18] },
        { nome: 'Proventos', valores: [216.36, 216.36, 216.36, 0, 0, 0] },
        { nome: 'Em conta', valores: [0, 0, 0, 183.91, 0, 3230.97] },
      ] },
      // Junho: extrato Inter veio atrasado → usado o saldo atual (12/07) R$ 38.407,09.
      { banco: 'Inter', investimentos: [
        { nome: 'Em conta', valores: [235762.26, 235762.26, 52960.45, 0, 0, 38407.09] },
      ] },
      { banco: 'Itaú', investimentos: [
        { nome: 'Saldo', valores: [1348.41, 188750.69, 260119.86, 62671.12, 288409.36, 377485.11] },
      ] },
    ],
  },
  {
    slug: 'eme', nome: 'E.M.E', tipo: 'brasil', contas: [
      { banco: 'XP', investimentos: [
        { nome: 'Renda Fixa', valores: [413127.71, 413439.05, 415696.12, 419428.81, 421321.24] },
        { nome: 'COE', valores: [354767.20, 355978.17, 359015.04, 364081.93, 367156.46] },
        { nome: 'Dividendos', valores: [173.09, 173.09, 173.09, 0, 0] },
        { nome: 'Em conta', valores: [0, 6313.17, 6313.17, 6914.41, 0] },
      ] },
      { banco: 'Inter', investimentos: [
        { nome: 'Em conta', valores: [151650.29, 201228.88, 157803.36, 8859.98, 0, 8904.13] },
      ] },
      { banco: 'Itaú', investimentos: [
        { nome: 'Saldo', valores: [24964.81, 22846.80, 99310.63, 39192.17, 101939.92, 103075.51] },
      ] },
    ],
  },
  {
    slug: 'summit', nome: 'Summit', tipo: 'brasil', contas: [
      { banco: 'Itaú', investimentos: [
        { nome: 'Saldo', valores: [31008.89, 43225.23, 52322.27, 5788.41, 9154.56, 1795.28] },
      ] },
    ],
  },
  {
    slug: 'img-brasil', nome: 'IMG-Brasil', tipo: 'brasil', contas: [
      // Junho: posição XP atual (12/07) — extrato do mês (saldo atual, extrato atrasado).
      { banco: 'XP', investimentos: [
        { nome: 'COE', valores: [2294766.95, 2309181.58, 2316146.19, 2329945.93, 2338182.96, 2355056.36] },
        { nome: 'Em conta', valores: [0, 5434.73, 1.53, 1554.70, 0, 1554.70] },
      ] },
      { banco: 'Banco do Brasil', investimentos: [
        { nome: 'Saldo', valores: [226830.10, 29799.06, 264845.82, 585507.75, 98405.25, 198375.20] },
      ] },
      { banco: 'Bradesco', investimentos: [
        { nome: 'Saldo', valores: [399.53, 231.29, 4083.42, 3780.14, 23381.70, 49860.72] },
      ] },
      { banco: 'Sicoob', investimentos: [
        { nome: 'Saldo', valores: [11425.14, 0, 0, 446.00, 397.13, 299.33] },
      ] },
      { banco: 'Itaú', investimentos: [
        { nome: 'Saldo', valores: [523413.09, 1515205.58, 190041.64, 621564.47, 1173647.88, 2196282.83] },
      ] },
    ],
  },
  {
    slug: 'pan', nome: 'Pan', tipo: 'brasil', contas: [
      { banco: 'Itaú', investimentos: [
        { nome: 'Saldo', valores: [152.33, 152.51, 152.54, 152.62, 153.12, 153.29] },
      ] },
    ],
  },
  {
    slug: 'oyster', nome: 'Oyster', tipo: 'brasil', contas: [
      { banco: 'Itaú', investimentos: [
        { nome: 'Saldo', valores: [169066.30, 147184.16, 395605.93, 433086.13, 484295.45, 987310.24] },
      ] },
    ],
  },
  {
    slug: 'seastar', nome: 'Seastar', tipo: 'brasil', contas: [
      { banco: 'Itaú', investimentos: [
        { nome: 'Saldo', valores: [0, 0, 1538.43, 7030.01, 3601.35, 5343.53] },
      ] },
    ],
  },
  {
    slug: 'black-fortune', nome: 'Black Fortune', tipo: 'brasil', contas: [
      { banco: 'Itaú', investimentos: [
        { nome: 'Saldo', valores: [529.14, 8889.15, 5234.32, 11708.60, 11331.54, 7131.97] },
      ] },
    ],
  },
  {
    slug: 'fidic-golden-sky', nome: 'Fidic Golden Sky', tipo: 'brasil', contas: [
      { banco: 'Banco Finaxis', investimentos: [
        { nome: 'Saldo', valores: [2003200.98, 507335.27, 1481074.90, 646469.13, 1055220.26, 632974.85] },
      ] },
    ],
  },
  {
    // RNX não vem de extrato: rende 145% do CDI ao mês. Cada mês = mês anterior
    // × (1 + taxa). Junho: +1,63% (informado pelo usuário) → Maio × 1,0163.
    slug: 'rnx', nome: 'RNX', tipo: 'brasil', contas: [
      { banco: 'Fundo RNX', investimentos: [
        { nome: 'Eduardo', valores: [854076.71, 866786.58, 881955.34, 895978.42, 909866.08, 924696.90] },
        { nome: 'Sergio Filho', valores: [854076.71, 866786.58, 881955.34, 895978.42, 909866.08, 924696.90] },
      ] },
    ],
  },
  {
    slug: 'itau-eduardo', nome: 'Itaú Eduardo', tipo: 'brasil', contas: [
      { banco: 'Itaú', investimentos: [
        { nome: 'Investido', valores: [7582517.75, 7761608.55, 8008361.95, 8321989.27, 8329546.46, 8344142.13] },
        { nome: 'Em conta', valores: [2.12, 6229.25, 30737.14, 3162.91, 10378.78, 26516.85] },
      ] },
    ],
  },
  {
    slug: 'itau-serginho', nome: 'Itaú Serginho', tipo: 'brasil', contas: [
      { banco: 'Itaú', investimentos: [
        { nome: 'Investido', valores: [7577661.61, 7727593.93, 7942308.52, 8319071.98, 8332182.43, 8354659.08] },
        { nome: 'Em conta', valores: [1.17, 25702.49, 7839.71, 5065.81, 10378.78, 32977.26] },
      ] },
    ],
  },
  {
    // Imóvel All Wert: evolui pela variação % do CUB-SC (Residencial Médio) do mês.
    // Cada mês = mês anterior × (1 + variação CUB). Junho: +0,87% → Maio × 1,0087.
    slug: 'imovel-all-wert', nome: 'Imóvel All Wert (Porto Belo)', tipo: 'brasil', contas: [
      { banco: 'Imóvel', investimentos: [
        { nome: 'Valor', valores: [2800000, 2806160, 2815139.71, 2823866.64, 2848434.27, 2873215.65] },
      ] },
    ],
  },

  // ── Internacional ──────────────────────────────────────────────────────
  // valores = valor em R$ (convertido pelo câmbio do mês); valoresMoeda = na moeda original.
  {
    slug: 'la-jolla', nome: 'La Jolla', tipo: 'internacional', contas: [
      { banco: 'Itaú Miami (EUA)', investimentos: [
        { nome: 'Saldo', moeda: 'US$',
          valores: [7694225.69, 7542882.64, 7343371.82, 7507906.03, 7785361.64],
          valoresMoeda: [1476818.75, 1439481.42, 1425897.44, 1532225.72, 1541655.77] },
      ] },
    ],
  },
  {
    slug: 'real-state-usa', nome: 'Real State USA', tipo: 'internacional', contas: [
      { banco: 'Imóvel (EUA)', investimentos: [
        { nome: 'Saldo', moeda: 'US$',
          valores: [599990.22, 603445.05, 613680.54, 583890.22, 601764.41],
          valoresMoeda: [115161.27, 115161.27, 119161.27, 119161.27, 119161.27] },
      ] },
    ],
  },
  {
    slug: 'cambio-aberto', nome: 'Câmbio em aberto (IMG)', tipo: 'internacional', contas: [
      { banco: 'Câmbio', investimentos: [
        { nome: 'Dólar', moeda: 'US$',
          valores: [3535454.53, 2350414.73, 3580268.72, 4014214.26, 4978794.34, 3859374.36],
          valoresMoeda: [678590.12, 448552.43, 695197.81, 819227.40, 985899.87, 756740.07] },
        { nome: 'Euro', moeda: '€',
          valores: [241162.15, 168598.56, 166082.16, 161049.37, 163565.77, 327619.63],
          valoresMoeda: [38959.96, 27959.96, 27959.96, 27959.96, 27959.96, 55528.75] },
      ] },
    ],
  },
]

// Nº de meses com dado na carteira (o maior entre suas contas/investimentos).
export const numMeses = (c: Carteira) =>
  Math.max(0, ...c.contas.flatMap(ct => ct.investimentos.map(inv => inv.valores.length)))

// A conta tem extrato para o mês i?
export const contaTemMes = (ct: Conta, i: number) =>
  ct.investimentos.some(inv => inv.valores[i] !== undefined)

export const saldoConta = (c: Conta, i: number) =>
  c.investimentos.reduce((s, inv) => s + (inv.valores[i] ?? 0), 0)

// Soma só as contas que já têm extrato do mês i.
export const saldoCarteira = (c: Carteira, i: number) =>
  c.contas.reduce((s, ct) => s + (contaTemMes(ct, i) ? saldoConta(ct, i) : 0), 0)

// Mês i é parcial: parte das contas tem extrato e parte ainda não.
export const carteiraParcial = (c: Carteira, i: number) =>
  c.contas.some(ct => contaTemMes(ct, i)) && c.contas.some(ct => !contaTemMes(ct, i))

// Bancos ainda sem extrato para o mês i.
export const bancosPendentes = (c: Carteira, i: number) =>
  c.contas.filter(ct => !contaTemMes(ct, i)).map(ct => ct.banco)

export const getCarteira = (slug: string) => CARTEIRAS.find(c => c.slug === slug)

export const brl = (n: number) => 'R$ ' + n.toLocaleString('pt-BR', { minimumFractionDigits: 2 })

export const fmtMoeda = (simbolo: string, n: number) =>
  `${simbolo} ${n.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`

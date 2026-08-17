// Pastas da área de Documentos. Cada pasta arquiva documentos mês a mês.
// Para adicionar uma pasta nova, basta acrescentar aqui.
export type Pasta = { slug: string; nome: string; emoji: string; desc: string }

export const PASTAS: Pasta[] = [
  { slug: 'extratos', nome: 'Extratos', emoji: '🧾', desc: 'Extratos arquivados por mês.' },
  { slug: 'historico', nome: 'Histórico', emoji: '🗄️', desc: 'Documentos de histórico por mês.' },
]

export const pastaPorSlug = (slug: string): Pasta | undefined => PASTAS.find(p => p.slug === slug)

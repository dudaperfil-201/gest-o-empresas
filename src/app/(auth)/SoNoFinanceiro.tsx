'use client'

// Mostra o conteúdo (painéis de Indicadores, Break Even e Gráfico) SOMENTE quando a
// página atual é a do Financeiro. Nas demais (Início, Imóveis, Usuários) fica escondido.

import { usePathname } from 'next/navigation'

export default function SoNoFinanceiro({ children }: { children: React.ReactNode }) {
  const path = usePathname()
  if (!path?.startsWith('/financeiro')) return null
  return <>{children}</>
}

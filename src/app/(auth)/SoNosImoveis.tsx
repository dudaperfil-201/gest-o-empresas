'use client'

// Mostra o conteúdo (painel de Indicadores de imóveis) SOMENTE quando a página atual é
// da parte de IMÓVEIS (Imóveis, Empresas, Relatórios, Lembretes). Nas demais (Início,
// Financeiro, Usuários) fica escondido. Espelha o SoNoFinanceiro.

import { usePathname } from 'next/navigation'

const PREFIXOS = ['/imoveis', '/empresas', '/relatorio', '/lembretes']

export default function SoNosImoveis({ children }: { children: React.ReactNode }) {
  const path = usePathname() ?? ''
  if (!PREFIXOS.some(p => path.startsWith(p))) return null
  return <>{children}</>
}

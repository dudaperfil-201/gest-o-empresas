import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getSessao, primeiraRota } from '@/lib/auth'

// Cards de cada módulo (mostrados conforme a permissão).
const CARDS = [
  { chave: 'podeImoveis', href: '/imoveis', emoji: '🏢', titulo: 'IMÓVEIS', cor: 'blue', desc: 'Gestão de aluguéis, empresas, inquilinos e pagamentos.' },
  { chave: 'podeFinanceiro', href: '/financeiro', emoji: '💰', titulo: 'FINANCEIRO', cor: 'green', desc: 'Gestão de recursos financeiros e investimentos.' },
  { chave: 'podeFrota', href: '/frota', emoji: '🚗', titulo: 'FROTA', cor: 'amber', desc: 'Cadastro e gestão dos veículos da frota.' },
  { chave: 'podeRelatorios', href: '/relatorio', emoji: '📊', titulo: 'RELATÓRIO E DOCUMENTOS', cor: 'indigo', desc: 'Relatório Mensal, Em Atraso, Break Even e documentos por mês.' },
] as const

// Classes literais (Tailwind não gera classes montadas dinamicamente).
const CORES: Record<string, { borda: string; texto: string; bg: string; bgHover: string }> = {
  blue: { borda: 'hover:border-blue-400', texto: 'text-blue-700', bg: 'bg-blue-50', bgHover: 'group-hover:bg-blue-100' },
  green: { borda: 'hover:border-green-400', texto: 'text-green-700', bg: 'bg-green-50', bgHover: 'group-hover:bg-green-100' },
  amber: { borda: 'hover:border-amber-400', texto: 'text-amber-700', bg: 'bg-amber-50', bgHover: 'group-hover:bg-amber-100' },
  indigo: { borda: 'hover:border-indigo-400', texto: 'text-indigo-700', bg: 'bg-indigo-50', bgHover: 'group-hover:bg-indigo-100' },
}

export default async function HomePage() {
  const sessao = await getSessao()
  if (!sessao) redirect('/login')

  const cards = CARDS.filter(c => sessao[c.chave])

  // Só um módulo → vai direto pra ele. Nenhum → mostra aviso.
  if (cards.length === 1) redirect(primeiraRota(sessao))

  if (cards.length === 0) {
    return (
      <div className="max-w-lg mx-auto text-center mt-16">
        <p className="text-5xl mb-3">🔒</p>
        <h2 className="text-xl font-semibold text-gray-900">Nenhum módulo liberado</h2>
        <p className="text-sm text-gray-500 mt-2">
          Sua conta ainda não tem acesso a nenhuma área. Fale com o administrador para liberar as categorias que você precisa.
        </p>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900">Bem-vindo</h2>
        <p className="text-sm text-gray-500 mt-1">Escolha o módulo que deseja acessar</p>
      </div>

      <div className="max-w-2xl mx-auto grid grid-cols-1 sm:grid-cols-2 gap-6">
        {cards.map(c => {
          const cor = CORES[c.cor]
          return (
            <Link key={c.href} href={c.href}
              className={`group bg-white border border-gray-200 rounded-2xl p-8 flex flex-col items-center text-center hover:shadow-md transition-all ${cor.borda}`}>
              <div className={`w-20 h-20 rounded-2xl ${cor.bg} flex items-center justify-center text-5xl ${cor.bgHover} transition-colors`}>
                {c.emoji}
              </div>
              <h3 className={`mt-5 text-xl font-bold ${cor.texto}`}>{c.titulo}</h3>
              <p className="mt-2 text-sm text-gray-500">{c.desc}</p>
            </Link>
          )
        })}
      </div>
    </div>
  )
}

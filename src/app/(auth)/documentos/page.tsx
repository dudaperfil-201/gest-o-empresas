import Link from 'next/link'
import { exigirRelatorios } from '@/lib/auth'
import { listarPastas } from '@/app/actions/documentos'

export const dynamic = 'force-dynamic'

export default async function DocumentosPage() {
  await exigirRelatorios()
  const pastas = await listarPastas()

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
        <Link href="/" className="hover:text-blue-600">Início</Link>
        <span>/</span>
        <Link href="/relatorios" className="hover:text-blue-600">Relatório e Documentos</Link>
        <span>/</span>
        <span className="text-gray-900 font-medium">Documentos</span>
      </div>

      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900">📁 Documentos</h2>
        <p className="text-sm text-gray-500 mt-0.5">Escolha uma pasta. Dentro dela, os documentos ficam arquivados mês a mês.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {pastas.map(p => (
          <Link key={p.slug} href={`/documentos/${p.slug}`}
            className="group bg-white border border-gray-200 rounded-2xl p-6 flex items-center gap-4 hover:border-amber-400 hover:shadow-md transition-all">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 flex items-center justify-center text-3xl group-hover:bg-amber-100 transition-colors shrink-0">
              {p.emoji}
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-gray-900">{p.nome}</h3>
              <p className="text-xs text-gray-500">{p.desc}</p>
              <p className="text-xs text-amber-700 font-medium mt-1">{p.qtd} documento{p.qtd === 1 ? '' : 's'}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}

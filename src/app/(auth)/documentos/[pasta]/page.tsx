import Link from 'next/link'
import { notFound } from 'next/navigation'
import { exigirRelatorios, getSessao } from '@/lib/auth'
import { listarDocumentos } from '@/app/actions/documentos'
import { pastaPorSlug } from '@/lib/documentos'
import DocumentosCliente from '../DocumentosCliente'

export const dynamic = 'force-dynamic'

export default async function PastaPage({ params }: { params: Promise<{ pasta: string }> }) {
  await exigirRelatorios()
  const { pasta: slug } = await params
  const pasta = pastaPorSlug(slug)
  if (!pasta) notFound()

  const sessao = await getSessao()
  const meses = await listarDocumentos(slug)

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
        <Link href="/" className="hover:text-blue-600">Início</Link>
        <span>/</span>
        <Link href="/relatorios" className="hover:text-blue-600">Relatório e Documentos</Link>
        <span>/</span>
        <Link href="/documentos" className="hover:text-blue-600">Documentos</Link>
        <span>/</span>
        <span className="text-gray-900 font-medium">{pasta.nome}</span>
      </div>

      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center text-2xl">{pasta.emoji}</div>
        <div>
          <h2 className="text-xl font-semibold text-gray-900">{pasta.nome}</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Arquivados mês a mês. {sessao?.ehAdmin ? 'Você pode enviar e remover.' : 'Disponíveis para consulta e download.'}
          </p>
        </div>
      </div>

      <DocumentosCliente pasta={slug} meses={meses} ehAdmin={sessao?.ehAdmin ?? false} />
    </div>
  )
}

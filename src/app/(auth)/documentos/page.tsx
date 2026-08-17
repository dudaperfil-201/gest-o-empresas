import Link from 'next/link'
import { exigirRelatorios, getSessao } from '@/lib/auth'
import { listarDocumentos } from '@/app/actions/documentos'
import DocumentosCliente from './DocumentosCliente'

export const dynamic = 'force-dynamic'

export default async function DocumentosPage() {
  await exigirRelatorios()
  const sessao = await getSessao()
  const meses = await listarDocumentos()

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
        <Link href="/" className="hover:text-blue-600">Início</Link>
        <span>/</span>
        <Link href="/relatorios" className="hover:text-blue-600">Relatório e Documentos</Link>
      </div>

      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900">📁 Documentos</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          Documentos importantes arquivados mês a mês. {sessao?.ehAdmin ? 'Você pode enviar e remover.' : 'Disponíveis para consulta e download.'}
        </p>
      </div>

      <DocumentosCliente meses={meses} ehAdmin={sessao?.ehAdmin ?? false} />
    </div>
  )
}

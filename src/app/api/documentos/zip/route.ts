import { NextRequest, NextResponse } from 'next/server'
import AdmZip from 'adm-zip'
import { getSessao } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { pastaPorSlug } from '@/lib/documentos'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const BUCKET = 'documentos-mensais'
const amigavel = (arquivo: string) => arquivo.replace(/^\d+_\d+_/, '').replace(/^\d+_/, '')

// Recebe uma lista de paths (pasta/ano-mes/arquivo), baixa cada um do Storage e devolve
// tudo num .zip. Só quem tem a permissão de Relatórios. Valida os paths (sem traversal).
export async function POST(request: NextRequest) {
  const sessao = await getSessao()
  if (!sessao) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  if (!sessao.podeRelatorios) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  const body = await request.json().catch(() => ({}))
  const paths: string[] = Array.isArray(body?.paths) ? body.paths : []
  // Só aceita paths do formato pasta-valida/AAAA-MM/arquivo.
  const validos = paths.filter(p => {
    const partes = String(p).split('/')
    return partes.length === 3 && pastaPorSlug(partes[0]) && /^\d{4}-\d{2}$/.test(partes[1]) && partes[2] && !partes[2].includes('..')
  })
  if (validos.length === 0) return NextResponse.json({ error: 'Nenhum arquivo válido.' }, { status: 400 })

  const admin = createAdminClient()
  const zip = new AdmZip()
  let adicionados = 0
  for (const p of validos) {
    const { data: blob } = await admin.storage.from(BUCKET).download(p)
    if (!blob) continue
    const [, mes, arquivo] = p.split('/')
    // Organiza dentro do zip por mês, com o nome amigável.
    zip.addFile(`${mes}/${amigavel(arquivo)}`, Buffer.from(await blob.arrayBuffer()))
    adicionados++
  }
  if (adicionados === 0) return NextResponse.json({ error: 'Não consegui baixar os arquivos.' }, { status: 500 })

  const out = zip.toBuffer()
  return new NextResponse(new Uint8Array(out), {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': 'attachment; filename="documentos.zip"',
      'Cache-Control': 'no-store',
    },
  })
}

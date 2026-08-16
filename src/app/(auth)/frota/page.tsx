import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getVeiculos } from '@/app/actions/veiculos'
import { exigirFrota } from '@/lib/auth'
import FrotaManager from './FrotaManager'
import Link from 'next/link'

// Módulo FROTA VEÍCULOS — Fase 1: cadastro dos veículos.
export default async function FrotaPage() {
  await exigirFrota() // só quem tem acesso à Frota (admin ou liberado)
  const supabase = await createClient()
  const [veiculos, { data: empresas }] = await Promise.all([
    getVeiculos(),
    supabase.from('empresas').select('id, nome').order('nome'),
  ])

  // Link (URL assinada) do documento de cada veículo, se houver.
  const admin = createAdminClient()
  const documentos: Record<string, string> = {}
  await Promise.all(veiculos.map(async v => {
    try {
      const { data } = await admin.storage.from('documentos-veiculo').list(v.id, { limit: 1 })
      const nome = data?.[0]?.name
      if (nome) {
        const { data: s } = await admin.storage.from('documentos-veiculo').createSignedUrl(`${v.id}/${nome}`, 3600)
        if (s?.signedUrl) documentos[v.id] = s.signedUrl
      }
    } catch { /* bucket pode não existir ainda */ }
  }))

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
        <Link href="/" className="hover:text-blue-600">Início</Link>
        <span>/</span>
        <span className="text-gray-900 font-medium">Frota de Veículos</span>
      </div>

      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900">🚗 Frota de Veículos</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          Cadastro dos veículos da frota. Manutenções e documentos/vencimentos entram nas próximas etapas.
        </p>
      </div>

      <FrotaManager veiculos={veiculos} empresas={empresas ?? []} documentos={documentos} />
    </div>
  )
}

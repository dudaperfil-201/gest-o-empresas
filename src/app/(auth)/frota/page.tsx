import { createClient } from '@/lib/supabase/server'
import { getVeiculos } from '@/app/actions/veiculos'
import FrotaManager from './FrotaManager'
import Link from 'next/link'

// Módulo FROTA VEÍCULOS — Fase 1: cadastro dos veículos.
export default async function FrotaPage() {
  const supabase = await createClient()
  const [veiculos, { data: empresas }] = await Promise.all([
    getVeiculos(),
    supabase.from('empresas').select('id, nome').order('nome'),
  ])

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

      <FrotaManager veiculos={veiculos} empresas={empresas ?? []} />
    </div>
  )
}

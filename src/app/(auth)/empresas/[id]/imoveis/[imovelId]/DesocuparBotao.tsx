'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { desocuparImovel } from '@/app/actions/empresas'

// Marca o imóvel como disponível: o inquilino atual vira "saído" (registro e histórico
// preservados) e o imóvel volta a ficar disponível.
export default function DesocuparBotao({ imovelId, empresaId, inquilinoNome }: {
  imovelId: string
  empresaId: string
  inquilinoNome: string
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function desocupar() {
    if (!confirm(
      `Marcar este imóvel como DISPONÍVEL?\n\nO inquilino "${inquilinoNome}" será registrado como saído. ` +
      `O histórico de pagamentos dele fica guardado (não é apagado). O aluguel será zerado.`
    )) return
    setLoading(true)
    const r = await desocuparImovel(imovelId, empresaId)
    setLoading(false)
    if (!r.ok) { alert('Erro: ' + r.erro); return }
    router.refresh()
  }

  return (
    <button onClick={desocupar} disabled={loading}
      className="text-sm font-medium text-red-600 hover:text-red-800 border border-red-200 rounded-lg px-3 py-1.5 hover:bg-red-50 transition-colors disabled:opacity-50">
      {loading ? 'Desocupando…' : '🚪 Desocupar (marcar como disponível)'}
    </button>
  )
}

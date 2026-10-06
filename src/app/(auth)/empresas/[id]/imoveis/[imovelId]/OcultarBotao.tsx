'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ocultarImovel } from '@/app/actions/empresas'

// Oculta (arquiva) ou reexibe o imóvel. Ocultar NÃO apaga nada — o histórico fica guardado;
// o imóvel só some das listas/totais/lembretes (ex.: garagem incorporada a uma sala).
export default function OcultarBotao({ imovelId, empresaId, oculto, endereco }: {
  imovelId: string
  empresaId: string
  oculto: boolean
  endereco: string
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function alternar() {
    if (!oculto && !confirm(
      `Ocultar o imóvel "${endereco}"?\n\n` +
      `Ele SOME das listas, totais e lembretes — mas NADA é apagado: ` +
      `os valores e o histórico de pagamentos continuam guardados. ` +
      `Dá para reexibir a qualquer momento (fica na seção "Arquivados" da empresa).`
    )) return
    setLoading(true)
    const r = await ocultarImovel(imovelId, empresaId, !oculto)
    setLoading(false)
    if (!r.ok) { alert('Erro: ' + r.erro); return }
    router.refresh()
  }

  return (
    <button onClick={alternar} disabled={loading}
      className={`text-sm font-medium border rounded-lg px-3 py-1.5 transition-colors disabled:opacity-50 ${
        oculto
          ? 'text-emerald-700 border-emerald-200 hover:bg-emerald-50'
          : 'text-gray-600 border-gray-200 hover:bg-gray-50'
      }`}>
      {loading ? (oculto ? 'Reexibindo…' : 'Ocultando…') : (oculto ? '👁️ Reexibir imóvel' : '🗄️ Ocultar (arquivar)')}
    </button>
  )
}

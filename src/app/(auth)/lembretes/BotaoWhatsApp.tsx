'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { marcarWhatsAppEnviado, desmarcarWhatsAppEnviado } from '@/app/actions/lembretes'

type Props = {
  imovelId: string
  ano: number
  mes: number
  whatsUrl: string
  enviado: boolean
}

export default function BotaoWhatsApp({ imovelId, ano, mes, whatsUrl, enviado }: Props) {
  const router = useRouter()
  const [sent, setSent] = useState(enviado)
  const [loading, setLoading] = useState(false)

  async function enviar() {
    // Abre a conversa já com a mensagem pronta e marca como enviado.
    window.open(whatsUrl, '_blank', 'noopener,noreferrer')
    setSent(true)
    setLoading(true)
    try {
      await marcarWhatsAppEnviado(imovelId, ano, mes)
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  async function desfazer() {
    setSent(false)
    setLoading(true)
    try {
      await desmarcarWhatsAppEnviado(imovelId, ano, mes)
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <div className="flex items-center gap-2 justify-end">
        <span className="text-sm font-semibold text-green-700">✓ Enviado</span>
        <button onClick={desfazer} disabled={loading} className="text-xs text-gray-400 hover:text-gray-600 disabled:opacity-50">
          desfazer
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={enviar}
      disabled={loading}
      className="inline-flex items-center gap-1.5 bg-green-600 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-60"
    >
      💬 Enviar WhatsApp
    </button>
  )
}

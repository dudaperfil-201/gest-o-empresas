'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { removerCambio } from '@/app/actions/cambios'

export default function RemoverBtn({ id, rotulo }: { id: string; rotulo: string }) {
  const [removendo, iniciar] = useTransition()
  const router = useRouter()
  return (
    <button
      onClick={() => {
        if (!window.confirm(`Remover o câmbio de ${rotulo}? Os comprovantes também serão apagados.`)) return
        iniciar(async () => { await removerCambio(id); router.refresh() })
      }}
      disabled={removendo}
      className="text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg px-2 py-1 text-xs transition-colors disabled:opacity-40"
      aria-label="Remover câmbio"
    >
      {removendo ? '…' : '✕'}
    </button>
  )
}

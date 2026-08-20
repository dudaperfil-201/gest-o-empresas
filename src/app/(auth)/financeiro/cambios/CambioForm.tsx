'use client'

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { adicionarCambio } from '@/app/actions/cambios'
import { PESSOAS } from '@/lib/cambios'

// Formulário para lançar um câmbio (com comprovantes). Colapsado por padrão.
export default function CambioForm() {
  const [aberto, setAberto] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [salvando, iniciar] = useTransition()
  const formRef = useRef<HTMLFormElement>(null)
  const router = useRouter()

  function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setErro(null)
    const fd = new FormData(e.currentTarget)
    iniciar(async () => {
      const r = await adicionarCambio(fd)
      if (r.ok) {
        formRef.current?.reset()
        setAberto(false)
        router.refresh()
      } else {
        setErro(r.erro)
      }
    })
  }

  if (!aberto) {
    return (
      <button onClick={() => setAberto(true)}
        className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
        ＋ Adicionar câmbio
      </button>
    )
  }

  const campo = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
  const rot = 'block text-xs font-medium text-gray-600 mb-1'

  return (
    <form ref={formRef} onSubmit={enviar} className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
      <h3 className="font-semibold text-gray-900">Novo câmbio</h3>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="col-span-1">
          <label className={rot}>Data da operação *</label>
          <input type="date" name="data" required className={campo} />
        </div>
        <div className="col-span-1">
          <label className={rot}>Quem fez *</label>
          <select name="quem" required defaultValue="" className={campo}>
            <option value="" disabled>Selecione…</option>
            {PESSOAS.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div className="col-span-1">
          <label className={rot}>Valor em US$ *</label>
          <input name="valorUsd" inputMode="decimal" placeholder="4.695,37" required className={campo} />
        </div>
        <div className="col-span-1">
          <label className={rot}>Taxa (R$/US$)</label>
          <input name="taxa" inputMode="decimal" placeholder="5,1822" className={campo} />
        </div>
        <div className="col-span-1">
          <label className={rot}>Valor em R$</label>
          <input name="valorBrl" inputMode="decimal" placeholder="24.332,34" className={campo} />
        </div>
        <div className="col-span-1">
          <label className={rot}>IOF (R$)</label>
          <input name="iof" inputMode="decimal" placeholder="267,66" className={campo} />
        </div>
        <div className="col-span-1">
          <label className={rot}>Total debitado (R$)</label>
          <input name="valorDebitado" inputMode="decimal" placeholder="24.600,00" className={campo} />
        </div>
        <div className="col-span-1">
          <label className={rot}>Instituição</label>
          <input name="instituicao" placeholder="Itaú Unibanco" className={campo} />
        </div>
        <div className="col-span-2">
          <label className={rot}>Referência</label>
          <input name="referencia" placeholder="624453175" className={campo} />
        </div>
        <div className="col-span-2">
          <label className={rot}>Observação</label>
          <input name="obs" placeholder="opcional" className={campo} />
        </div>
      </div>

      <div>
        <label className={rot}>Comprovantes (PDF/imagem) — pode selecionar mais de um</label>
        <input type="file" name="comprovantes" accept="application/pdf,image/*" multiple
          className="block w-full text-sm text-gray-600 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
      </div>

      {erro && <p className="text-sm text-red-600">{erro}</p>}

      <div className="flex items-center gap-2">
        <button type="submit" disabled={salvando}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50">
          {salvando ? 'Salvando…' : 'Salvar câmbio'}
        </button>
        <button type="button" onClick={() => { setAberto(false); setErro(null) }} disabled={salvando}
          className="px-4 py-2 text-sm text-gray-600 rounded-lg hover:bg-gray-100">
          Cancelar
        </button>
      </div>
    </form>
  )
}

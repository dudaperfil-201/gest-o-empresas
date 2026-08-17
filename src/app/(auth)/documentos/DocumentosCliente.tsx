'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { uploadDocumento, removerDocumento, type MesDocs } from '@/app/actions/documentos'

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']
const rotuloMes = (ano: number, mes: number) => `${MESES[mes - 1]} de ${ano}`
const tamanho = (b: number) => b >= 1024 * 1024 ? (b / 1024 / 1024).toFixed(1) + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB'

const agora = new Date()
const mesAtualStr = `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}`

export default function DocumentosCliente({ pasta, meses, ehAdmin }: { pasta: string; meses: MesDocs[]; ehAdmin: boolean }) {
  const router = useRouter()
  const [mesRef, setMesRef] = useState(mesAtualStr)
  const [enviando, setEnviando] = useState(false)
  const [removendo, setRemovendo] = useState<string | null>(null)
  const [erro, setErro] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  async function enviar(files: FileList | null) {
    if (!files || files.length === 0) return
    const [ano, mes] = mesRef.split('-')
    setEnviando(true); setErro('')
    try {
      const fd = new FormData()
      fd.append('pasta', pasta)
      fd.append('ano', ano)
      fd.append('mes', String(parseInt(mes, 10)))
      for (const f of Array.from(files)) fd.append('arquivos', f)
      const r = await uploadDocumento(fd)
      if (!r.ok) { setErro(r.erro); return }
      if (inputRef.current) inputRef.current.value = ''
      router.refresh()
    } finally {
      setEnviando(false)
    }
  }

  async function remover(path: string, nome: string) {
    if (!confirm(`Remover o documento "${nome}"? Esta ação não pode ser desfeita.`)) return
    setRemovendo(path); setErro('')
    try {
      const r = await removerDocumento(path)
      if (!r.ok) { setErro(r.erro); return }
      router.refresh()
    } finally {
      setRemovendo(null)
    }
  }

  return (
    <div className="space-y-6">
      {erro && <p className="text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded-lg">{erro}</p>}

      {/* Envio (só admin) */}
      {ehAdmin && (
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <h3 className="font-medium text-gray-900 mb-3">Enviar documento</h3>
          <div className="flex flex-wrap items-end gap-3">
            <label className="text-xs text-gray-600">
              Mês de referência
              <input type="month" value={mesRef} onChange={e => setMesRef(e.target.value)}
                className="mt-0.5 block px-3 py-2 border border-gray-300 rounded-lg text-sm" />
            </label>
            <label className={`px-4 py-2 rounded-lg text-sm font-medium text-white cursor-pointer transition-colors ${enviando ? 'bg-indigo-400' : 'bg-indigo-600 hover:bg-indigo-700'}`}>
              {enviando ? 'Enviando…' : '📎 Escolher arquivos'}
              <input ref={inputRef} type="file" multiple className="hidden" disabled={enviando}
                onChange={e => enviar(e.target.files)} />
            </label>
          </div>
          <p className="text-xs text-gray-400 mt-2">Os arquivos vão para <b>{rotuloMes(+mesRef.split('-')[0], +mesRef.split('-')[1])}</b>. Pode selecionar vários de uma vez (PDF, imagem, planilha…).</p>
        </div>
      )}

      {/* Lista por mês */}
      {meses.length === 0 ? (
        <div className="bg-white border border-dashed border-gray-300 rounded-xl p-10 text-center">
          <p className="text-4xl mb-2">📁</p>
          <p className="text-gray-500">Nenhum documento arquivado ainda.</p>
          {ehAdmin && <p className="text-sm text-gray-400 mt-1">Envie o primeiro no formulário acima.</p>}
        </div>
      ) : (
        meses.map(m => (
          <div key={`${m.ano}-${m.mes}`} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 capitalize">{rotuloMes(m.ano, m.mes)}</h3>
              <span className="text-xs text-gray-500">{m.docs.length} documento{m.docs.length === 1 ? '' : 's'}</span>
            </div>
            <div className="divide-y divide-gray-100">
              {m.docs.map(d => (
                <div key={d.path} className="flex items-center gap-3 px-4 py-2.5">
                  <span className="text-lg">📄</span>
                  <a href={d.url} target="_blank" rel="noopener noreferrer" className="flex-1 min-w-0 text-sm text-indigo-700 hover:text-indigo-900 font-medium truncate">
                    {d.nome}
                  </a>
                  <span className="text-xs text-gray-400 shrink-0">{tamanho(d.tamanho)}</span>
                  {ehAdmin && (
                    <button onClick={() => remover(d.path, d.nome)} disabled={removendo === d.path}
                      className="text-xs text-red-500 hover:text-red-700 shrink-0 disabled:opacity-50">
                      {removendo === d.path ? 'removendo…' : 'remover'}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  )
}

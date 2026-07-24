'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { liberarAcessoInquilino, uploadDocumentoInquilino, removerDocumentoInquilino } from '@/app/actions/inquilinos'

type Doc = { name: string; path: string; mes?: string }

const MESES = ['', 'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
function rotuloMes(yyyymm?: string): string {
  const m = (yyyymm ?? '').match(/^(\d{4})-(\d{2})$/)
  return m ? `${MESES[parseInt(m[2], 10)]}/${m[1]}` : (yyyymm ?? '')
}
function nomeLimpo(n: string): string {
  return n.replace(/^\d{4}-\d{2}__/, '').replace(/^\d{13}_/, '')
}

export default function DocumentosInquilino({
  inquilinoId, empresaId, imovelId, inquilinoEmail, senhaAtual, contratos, boletos,
}: {
  inquilinoId: string
  empresaId: string
  imovelId: string
  inquilinoEmail: string | null
  senhaAtual: string | null
  contratos: Doc[]
  boletos: Doc[]
}) {
  const router = useRouter()
  const [senha, setSenha] = useState<string | null>(senhaAtual)
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  const [mesBoleto, setMesBoleto] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })
  const contratoRef = useRef<HTMLInputElement>(null)
  const boletoRef = useRef<HTMLInputElement>(null)

  const portalUrl = typeof window !== 'undefined' ? `${window.location.origin}/area-inquilino` : '/area-inquilino'

  async function liberar() {
    setBusy(true); setMsg('')
    const r = await liberarAcessoInquilino(inquilinoId, empresaId, imovelId)
    setBusy(false)
    if (r.ok && r.senha) setSenha(r.senha)
    else setMsg(r.erro ?? 'Erro ao liberar acesso.')
  }

  async function enviar(tipo: 'contrato' | 'boleto', ref: React.RefObject<HTMLInputElement | null>) {
    const file = ref.current?.files?.[0]
    if (!file) { setMsg('Escolha um arquivo primeiro.'); return }
    setBusy(true); setMsg('')
    const fd = new FormData()
    fd.append('inquilino_id', inquilinoId)
    fd.append('empresa_id', empresaId)
    fd.append('imovel_id', imovelId)
    fd.append('tipo', tipo)
    if (tipo === 'boleto') fd.append('mes_ref', mesBoleto)
    fd.append('arquivo', file)
    const r = await uploadDocumentoInquilino(fd)
    setBusy(false)
    if (r.ok) { if (ref.current) ref.current.value = ''; router.refresh() }
    else setMsg(r.erro ?? 'Erro ao enviar.')
  }

  async function remover(path: string) {
    if (!confirm('Remover este documento?')) return
    setBusy(true)
    await removerDocumentoInquilino(path, empresaId, imovelId)
    setBusy(false)
    router.refresh()
  }

  const copiar = (t: string) => navigator.clipboard?.writeText(t).catch(() => {})

  return (
    <div className="space-y-5">
      {/* Acesso do inquilino */}
      <div>
        <h4 className="text-sm font-semibold text-gray-800 mb-2">🔑 Acesso ao portal</h4>
        {senha ? (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm space-y-1">
            <p className="text-gray-600 text-xs">Envie estes dados ao inquilino:</p>
            <p><span className="text-gray-500">Portal:</span> <span className="font-medium">{portalUrl}</span></p>
            <p><span className="text-gray-500">E-mail:</span> <span className="font-medium">{inquilinoEmail}</span></p>
            <p><span className="text-gray-500">Senha:</span> <span className="font-mono font-semibold">{senha}</span></p>
            <button onClick={() => copiar(`Portal: ${portalUrl}\nE-mail: ${inquilinoEmail}\nSenha: ${senha}`)}
              className="mt-1 text-xs text-blue-700 border border-blue-300 rounded-full px-3 py-1 hover:bg-blue-100">
              Copiar acesso
            </button>
          </div>
        ) : (
          <div>
            <button onClick={liberar} disabled={busy || !inquilinoEmail}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-60">
              {busy ? 'Liberando...' : 'Liberar acesso do inquilino'}
            </button>
            {!inquilinoEmail && <p className="text-xs text-amber-600 mt-1">Cadastre o e-mail do inquilino acima para liberar o acesso.</p>}
          </div>
        )}
      </div>

      {/* Contrato */}
      <div>
        <h4 className="text-sm font-semibold text-gray-800 mb-2">📄 Contrato</h4>
        {contratos.length > 0 && (
          <div className="space-y-1 mb-2">
            {contratos.map(c => (
              <div key={c.path} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2 text-sm">
                <span className="text-gray-700 truncate">{nomeLimpo(c.name)}</span>
                <button onClick={() => remover(c.path)} disabled={busy} className="text-red-400 hover:text-red-600 text-sm shrink-0 ml-2">✕</button>
              </div>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <input ref={contratoRef} type="file" accept=".pdf,.doc,.docx,image/*" className="text-sm flex-1 min-w-0" />
          <button onClick={() => enviar('contrato', contratoRef)} disabled={busy}
            className="shrink-0 px-3 py-1.5 bg-gray-700 text-white rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-60">
            Enviar
          </button>
        </div>
      </div>

      {/* Boletos */}
      <div>
        <h4 className="text-sm font-semibold text-gray-800 mb-2">🧾 Boletos</h4>
        {boletos.length > 0 && (
          <div className="space-y-1 mb-2">
            {boletos.map(b => (
              <div key={b.path} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2 text-sm">
                <span className="text-gray-700"><span className="font-medium capitalize">{rotuloMes(b.mes)}</span> <span className="text-gray-400 text-xs">· {nomeLimpo(b.name)}</span></span>
                <button onClick={() => remover(b.path)} disabled={busy} className="text-red-400 hover:text-red-600 text-sm shrink-0 ml-2">✕</button>
              </div>
            ))}
          </div>
        )}
        <div className="flex gap-2 items-center flex-wrap">
          <input type="month" value={mesBoleto} onChange={e => setMesBoleto(e.target.value)}
            className="px-2 py-1.5 border border-gray-300 rounded-lg text-sm" title="Mês de referência" />
          <input ref={boletoRef} type="file" accept=".pdf,image/*" className="text-sm flex-1 min-w-0" />
          <button onClick={() => enviar('boleto', boletoRef)} disabled={busy}
            className="shrink-0 px-3 py-1.5 bg-gray-700 text-white rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-60">
            Enviar
          </button>
        </div>
      </div>

      {msg && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{msg}</p>}
    </div>
  )
}

'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { liberarAcessoInquilino, uploadDocumentoInquilino, uploadBoletosEmLote, removerDocumentoInquilino } from '@/app/actions/inquilinos'

type Doc = { name: string; path: string; mes?: string; url?: string | null }

const MESES = ['', 'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
function rotuloMes(yyyymm?: string): string {
  const m = (yyyymm ?? '').match(/^(\d{4})-(\d{2})$/)
  return m ? `${MESES[parseInt(m[2], 10)]}/${m[1]}` : (yyyymm ?? '')
}
function nomeLimpo(n: string): string {
  return n.replace(/^\d{4}-\d{2}__/, '').replace(/^\d{13}_(\d+_)?/, '')
}
// "AAAA-MM" + i meses → "AAAA-MM"
function mesMais(mesInicial: string, i: number): string {
  const [a, m] = mesInicial.split('-').map(Number)
  const d = new Date(a, m - 1 + i, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

// Tenta descobrir o mês de vencimento a partir do NOME do arquivo. Cobre os formatos
// mais comuns dos boletos: "ABR_2027", "abril-2027", "04_2027", "2027-04", "2027_04".
// Retorna "AAAA-MM" ou null se não reconhecer.
const MESES_ABBR: Record<string, number> = {
  jan: 1, fev: 2, mar: 3, abr: 4, mai: 5, jun: 6, jul: 7, ago: 8, set: 9, out: 10, nov: 11, dez: 12,
}
function mesDoNome(nome: string): string | null {
  const n = nome.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  // 1) MMM(+letras) + ano  → abr 2027 / abril_2027 / ago-2026
  let m = n.match(/(jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)[a-z]*[ _\-.]*(20\d{2})/)
  if (m) return `${m[2]}-${String(MESES_ABBR[m[1]]).padStart(2, '0')}`
  // 2) AAAA-MM / AAAA_MM / AAAAMM
  m = n.match(/(20\d{2})[ _\-.]?(0[1-9]|1[0-2])(?!\d)/)
  if (m) return `${m[1]}-${m[2]}`
  // 3) MM-AAAA / MM_AAAA
  m = n.match(/(0[1-9]|1[0-2])[ _\-.](20\d{2})/)
  if (m) return `${m[2]}-${m[1]}`
  return null
}

type Pendente = { file: File; mes: string }

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
  // Mês "base" — usado só como palpite sequencial para arquivos cujo nome NÃO revela o mês.
  const [mesBoleto, setMesBoleto] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })
  const contratoRef = useRef<HTMLInputElement>(null)
  const boletoRef = useRef<HTMLInputElement>(null)
  // Boletos pendentes de envio, cada um com SEU mês (editável na lista de conferência).
  const [pendentes, setPendentes] = useState<Pendente[]>([])
  const [dragOver, setDragOver] = useState(false)

  function adicionarBoletos(novos: File[]) {
    const validos = novos.filter(f => f.size > 0 && (f.type === '' || /pdf|image/.test(f.type) || /\.(pdf|png|jpe?g|webp)$/i.test(f.name)))
    if (validos.length === 0) return
    setPendentes(prev => {
      const chave = (n: string, s: number) => `${n}_${s}`
      const existentes = new Set(prev.map(p => chave(p.file.name, p.file.size)))
      const novosFiles = validos
        .filter(f => !existentes.has(chave(f.name, f.size)))
        .sort((a, b) => a.name.localeCompare(b.name, 'pt', { numeric: true }))
      // Palpite do mês: 1º tenta ler do nome; se não der, cai no sequencial a partir
      // do "mês base" (contando só os que também não têm mês no nome).
      let seq = prev.filter(p => !mesDoNome(p.file.name)).length
      const itens: Pendente[] = novosFiles.map(f => {
        const doNome = mesDoNome(f.name)
        if (doNome) return { file: f, mes: doNome }
        const mes = mesMais(mesBoleto, seq); seq++
        return { file: f, mes }
      })
      return [...prev, ...itens]
    })
  }

  function setMesPendente(idx: number, mes: string) {
    setPendentes(prev => prev.map((p, i) => (i === idx ? { ...p, mes } : p)))
  }
  function removerPendente(idx: number) {
    setPendentes(prev => prev.filter((_, i) => i !== idx))
  }

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

  async function enviarBoletos() {
    if (pendentes.length === 0) { setMsg('Escolha os boletos primeiro.'); return }
    if (pendentes.some(p => !/^\d{4}-\d{2}$/.test(p.mes))) { setMsg('Confira o mês de todos os boletos.'); return }
    setBusy(true); setMsg('')
    const fd = new FormData()
    fd.append('inquilino_id', inquilinoId)
    fd.append('empresa_id', empresaId)
    fd.append('imovel_id', imovelId)
    // Envia cada arquivo com o SEU mês, na mesma ordem.
    for (const p of pendentes) {
      fd.append('arquivos', p.file)
      fd.append('meses', p.mes)
    }
    const r = await uploadBoletosEmLote(fd)
    setBusy(false)
    if (r.ok) {
      setPendentes([])
      if (boletoRef.current) boletoRef.current.value = ''
      router.refresh()
    } else {
      setMsg(r.erro ?? 'Erro ao enviar boletos.')
    }
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

      {/* Documentos: BOLETOS (esquerda) | CONTRATO (direita) — dois quadrados lado a lado */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">

        {/* ── BOLETOS (esquerda) ── */}
        <div className="border border-gray-200 rounded-xl p-4">
          <h4 className="text-sm font-semibold text-gray-800 mb-3">
            🧾 Boletos {boletos.length > 0 && <span className="text-gray-400 font-normal">({boletos.length})</span>}
          </h4>

          {boletos.length > 0 ? (
            <div className="space-y-1 mb-3 max-h-56 overflow-y-auto pr-1">
              {boletos.map(b => (
                <div key={b.path} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2 text-sm">
                  <a href={b.url ?? '#'} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 min-w-0 text-blue-700 hover:underline">
                    <span>🧾</span><span className="font-medium capitalize">{rotuloMes(b.mes)}</span>
                  </a>
                  <button onClick={() => remover(b.path)} disabled={busy} className="text-red-400 hover:text-red-600 text-sm shrink-0 ml-2">✕</button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-400 mb-3 px-1">Nenhum boleto enviado ainda.</p>
          )}

          <div className="space-y-2">
            <div className="flex gap-2 items-center flex-wrap">
              <label className="text-xs text-gray-500">Mês base:</label>
              <input type="month" value={mesBoleto} onChange={e => setMesBoleto(e.target.value)}
                className="px-2 py-1.5 border border-gray-300 rounded-lg text-sm" />
              <span className="text-[11px] text-gray-400">usado só quando o mês não aparece no nome do arquivo</span>
            </div>

            {/* Área de arrastar e soltar (também abre o seletor ao clicar) */}
            <div
              onClick={() => boletoRef.current?.click()}
              onDragOver={e => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={e => { e.preventDefault(); setDragOver(false) }}
              onDrop={e => {
                e.preventDefault(); setDragOver(false)
                adicionarBoletos(Array.from(e.dataTransfer.files ?? []))
              }}
              className={`cursor-pointer border-2 border-dashed rounded-xl px-4 py-6 text-center transition-colors ${
                dragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-gray-50 hover:border-blue-400 hover:bg-blue-50/40'
              }`}
            >
              <p className="text-sm font-medium text-gray-700">📥 Arraste os boletos aqui</p>
              <p className="text-xs text-gray-500 mt-0.5">ou clique para escolher (vários — ex.: os 12 do ano)</p>
            </div>
            <input ref={boletoRef} type="file" multiple accept=".pdf,image/*" className="hidden"
              onChange={e => { adicionarBoletos(Array.from(e.target.files ?? [])); e.target.value = '' }} />

            {pendentes.length > 0 && (
              <div className="bg-blue-50 border border-blue-100 rounded-lg p-2 text-xs text-gray-600 space-y-1">
                <p className="font-medium text-gray-700">Confira o mês de cada boleto antes de enviar:</p>
                {pendentes.map((p, i) => (
                  <div key={p.file.name + p.file.size + i} className="flex items-center gap-2">
                    <input
                      type="month"
                      value={p.mes}
                      onChange={e => setMesPendente(i, e.target.value)}
                      className="px-2 py-1 border border-gray-300 rounded-md text-xs shrink-0"
                    />
                    <span className="truncate flex-1" title={p.file.name}>{p.file.name}</span>
                    <button
                      onClick={() => removerPendente(i)}
                      className="text-red-400 hover:text-red-600 shrink-0" title="Remover da lista">✕</button>
                  </div>
                ))}
                <button onClick={() => setPendentes([])} className="text-gray-400 hover:text-gray-600 underline mt-1">limpar lista</button>
              </div>
            )}

            <button onClick={enviarBoletos} disabled={busy || pendentes.length === 0}
              className="w-full px-3 py-1.5 bg-gray-700 text-white rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-60">
              {busy ? 'Enviando...' : pendentes.length > 0 ? `Enviar ${pendentes.length} boleto${pendentes.length === 1 ? '' : 's'}` : 'Enviar boletos'}
            </button>
          </div>
        </div>

        {/* ── CONTRATO (direita) ── */}
        <div className="border border-gray-200 rounded-xl p-4">
          <h4 className="text-sm font-semibold text-gray-800 mb-3">
            📄 Contrato {contratos.length > 0 && <span className="text-gray-400 font-normal">({contratos.length})</span>}
          </h4>
          {contratos.length > 0 ? (
            <div className="space-y-1 mb-3">
              {contratos.map(c => (
                <div key={c.path} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2 text-sm">
                  <a href={c.url ?? '#'} target="_blank" rel="noopener noreferrer"
                    className="text-blue-700 hover:underline truncate flex items-center gap-1.5">📄 {nomeLimpo(c.name)}</a>
                  <button onClick={() => remover(c.path)} disabled={busy} className="text-red-400 hover:text-red-600 text-sm shrink-0 ml-2">✕</button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-400 mb-3 px-1">Nenhum contrato enviado ainda.</p>
          )}
          <div className="flex gap-2">
            <input ref={contratoRef} type="file" accept=".pdf,.doc,.docx,image/*" className="text-sm flex-1 min-w-0" />
            <button onClick={() => enviar('contrato', contratoRef)} disabled={busy}
              className="shrink-0 px-3 py-1.5 bg-gray-700 text-white rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-60">
              Enviar
            </button>
          </div>
        </div>
      </div>

      {msg && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{msg}</p>}
    </div>
  )
}

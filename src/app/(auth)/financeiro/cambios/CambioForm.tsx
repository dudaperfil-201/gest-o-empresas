'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { adicionarCambio, lerComprovanteCambio } from '@/app/actions/cambios'
import { PESSOAS, MOEDAS, type DadosComprovante } from '@/lib/cambios'

// Formulário para lançar um câmbio. Você arrasta o comprovante (PDF) → o sistema LÊ e
// PREENCHE os campos automaticamente (você confere e salva); o PDF já fica anexado.
const VAZIO = {
  data: '', quem: '', moeda: 'USD', valorMoeda: '', taxa: '',
  valorBrl: '', iof: '', valorDebitado: '', instituicao: '', referencia: '', obs: '',
}
const money = (n: number) => n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const taxaFmt = (n: number) => n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 6 })

export default function CambioForm() {
  const [aberto, setAberto] = useState(false)
  const [form, setForm] = useState({ ...VAZIO })
  const [comprovantes, setComprovantes] = useState<File[]>([])
  const [erro, setErro] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const [lendo, setLendo] = useState(false)
  const [arrastando, setArrastando] = useState(false)
  const [salvando, iniciar] = useTransition()
  const router = useRouter()

  const set = (k: keyof typeof VAZIO, v: string) => setForm(f => ({ ...f, [k]: v }))

  function preencher(d: Partial<DadosComprovante>) {
    setForm(f => ({
      ...f,
      data: d.data || f.data,
      quem: d.quem || f.quem,
      moeda: d.moeda && MOEDAS.some(m => m.cod === d.moeda) ? d.moeda : f.moeda,
      valorMoeda: d.valorMoeda != null ? money(d.valorMoeda) : f.valorMoeda,
      taxa: d.taxa != null ? taxaFmt(d.taxa) : f.taxa,
      valorBrl: d.valorBrl != null ? money(d.valorBrl) : f.valorBrl,
      iof: d.iof != null ? money(d.iof) : f.iof,
      valorDebitado: d.valorDebitado != null ? money(d.valorDebitado) : f.valorDebitado,
      instituicao: d.instituicao || f.instituicao,
      referencia: d.referencia || f.referencia,
    }))
  }

  // Anexa os arquivos e LÊ os PDFs pra preencher (mescla: 1º valor encontrado vence).
  async function receberArquivos(files: FileList | File[] | null) {
    const lista = files ? Array.from(files) : []
    if (!lista.length) return
    setComprovantes(prev => [...prev, ...lista])
    const pdfs = lista.filter(f => f.name.toLowerCase().endsWith('.pdf'))
    if (!pdfs.length) return
    setLendo(true); setErro(null); setAviso(null)
    const acc: Record<string, unknown> = {}
    for (const pdf of pdfs) {
      const fd = new FormData()
      fd.append('arquivo', pdf)
      const r = await lerComprovanteCambio(fd)
      if (r.ok) {
        for (const [k, v] of Object.entries(r.dados)) {
          if ((acc[k] == null || acc[k] === '') && v != null && v !== '') acc[k] = v
        }
      }
    }
    setLendo(false)
    if (Object.keys(acc).length === 0) {
      setAviso('Não consegui ler os dados desse PDF — pode preencher à mão (o arquivo já ficou anexado).')
      return
    }
    preencher(acc as Partial<DadosComprovante>)
    setAviso('✨ Preenchi com os dados do comprovante — confira e salve.')
  }

  function removerAnexo(i: number) {
    setComprovantes(prev => prev.filter((_, idx) => idx !== i))
  }

  function fechar() {
    setAberto(false); setErro(null); setAviso(null)
    setForm({ ...VAZIO }); setComprovantes([])
  }

  function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setErro(null)
    const fd = new FormData()
    Object.entries(form).forEach(([k, v]) => fd.append(k, v))
    comprovantes.forEach(f => fd.append('comprovantes', f))
    iniciar(async () => {
      const r = await adicionarCambio(fd)
      if (r.ok) { fechar(); router.refresh() }
      else setErro(r.erro)
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
    <form onSubmit={enviar} className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
      <h3 className="font-semibold text-gray-900">Novo câmbio</h3>

      {/* Leitor automático: arraste o comprovante (PDF) e o sistema preenche */}
      <label
        onDragOver={e => { e.preventDefault(); if (!lendo) setArrastando(true) }}
        onDragLeave={e => { e.preventDefault(); setArrastando(false) }}
        onDrop={e => { e.preventDefault(); setArrastando(false); if (!lendo) receberArquivos(e.dataTransfer.files) }}
        className={`flex flex-col items-center justify-center gap-1 border-2 border-dashed rounded-xl px-4 py-6 text-center cursor-pointer transition-colors ${
          arrastando ? 'border-blue-500 bg-blue-50' : 'border-blue-200 bg-blue-50/40 hover:border-blue-400 hover:bg-blue-50'
        } ${lendo ? 'opacity-70 cursor-wait' : ''}`}
      >
        <input type="file" accept="application/pdf,image/*" multiple className="hidden"
          onChange={e => { receberArquivos(e.target.files); e.currentTarget.value = '' }} />
        <span className="text-2xl">{lendo ? '⏳' : '🪄'}</span>
        <span className="text-sm font-semibold text-blue-800">
          {lendo ? 'Lendo o comprovante…' : arrastando ? 'Solte o comprovante aqui' : 'Arraste o comprovante (PDF) aqui — eu preencho pra você'}
        </span>
        <span className="text-xs text-blue-500/80">Também dá pra clicar e escolher. O arquivo fica anexado automaticamente.</span>
      </label>

      {aviso && <p className="text-sm text-blue-700 bg-blue-50 rounded-lg px-3 py-2">{aviso}</p>}

      {/* Anexos que serão salvos */}
      {comprovantes.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {comprovantes.map((f, i) => (
            <span key={i} className="inline-flex items-center gap-1.5 text-xs bg-gray-100 text-gray-700 px-2.5 py-1 rounded-full">
              📄 <span className="truncate max-w-[200px]">{f.name}</span>
              <button type="button" onClick={() => removerAnexo(i)} className="text-gray-400 hover:text-red-600 font-bold">×</button>
            </span>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="col-span-1">
          <label className={rot}>Data da operação *</label>
          <input type="date" value={form.data} onChange={e => set('data', e.target.value)} required className={campo} />
        </div>
        <div className="col-span-1">
          <label className={rot}>Quem fez *</label>
          <select value={form.quem} onChange={e => set('quem', e.target.value)} required className={campo}>
            <option value="" disabled>Selecione…</option>
            {PESSOAS.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div className="col-span-1">
          <label className={rot}>Moeda *</label>
          <select value={form.moeda} onChange={e => set('moeda', e.target.value)} required className={campo}>
            {MOEDAS.map(m => <option key={m.cod} value={m.cod}>{m.simbolo} — {m.nome}</option>)}
          </select>
        </div>
        <div className="col-span-1">
          <label className={rot}>Valor na moeda *</label>
          <input value={form.valorMoeda} onChange={e => set('valorMoeda', e.target.value)} inputMode="decimal" placeholder="27.000,00" required className={campo} />
        </div>
        <div className="col-span-1">
          <label className={rot}>Taxa (R$)</label>
          <input value={form.taxa} onChange={e => set('taxa', e.target.value)} inputMode="decimal" placeholder="5,1125" className={campo} />
        </div>
        <div className="col-span-1">
          <label className={rot}>Valor em R$</label>
          <input value={form.valorBrl} onChange={e => set('valorBrl', e.target.value)} inputMode="decimal" placeholder="138.037,50" className={campo} />
        </div>
        <div className="col-span-1">
          <label className={rot}>IOF (R$)</label>
          <input value={form.iof} onChange={e => set('iof', e.target.value)} inputMode="decimal" placeholder="1.518,41" className={campo} />
        </div>
        <div className="col-span-1">
          <label className={rot}>Total debitado (R$)</label>
          <input value={form.valorDebitado} onChange={e => set('valorDebitado', e.target.value)} inputMode="decimal" placeholder="139.555,91" className={campo} />
        </div>
        <div className="col-span-1">
          <label className={rot}>Instituição</label>
          <input value={form.instituicao} onChange={e => set('instituicao', e.target.value)} placeholder="Itaú Unibanco" className={campo} />
        </div>
        <div className="col-span-2">
          <label className={rot}>Referência</label>
          <input value={form.referencia} onChange={e => set('referencia', e.target.value)} placeholder="630059184" className={campo} />
        </div>
        <div className="col-span-1">
          <label className={rot}>Observação</label>
          <input value={form.obs} onChange={e => set('obs', e.target.value)} placeholder="opcional" className={campo} />
        </div>
      </div>

      {erro && <p className="text-sm text-red-600">{erro}</p>}

      <div className="flex items-center gap-2">
        <button type="submit" disabled={salvando || lendo}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50">
          {salvando ? 'Salvando…' : 'Salvar câmbio'}
        </button>
        <button type="button" onClick={fechar} disabled={salvando}
          className="px-4 py-2 text-sm text-gray-600 rounded-lg hover:bg-gray-100">
          Cancelar
        </button>
      </div>
    </form>
  )
}

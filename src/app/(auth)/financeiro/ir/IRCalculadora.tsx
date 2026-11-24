'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  addPessoa, atualizarPessoa, removerPessoa, setPessoaAtiva, setPessoaGrupo,
  addFonte, atualizarFonte, removerFonte,
  setDistribuicao, setOutrosRendimentos,
} from './actions'
import {
  calcularPessoa, brl, pctFmt, toNum, LIMITE_IRRF_MES,
  TRILHA_INFO, ehDividendo, ehEspecial, OFFSHORE_ALIQ, FUNDO_ALIQ,
  type TipoPessoa, type Trilha,
} from '@/lib/ir2026'

type Fonte = { id: string; nome: string; trilha: string; ordem: number }
type Pessoa = { id: string; nome: string; tipo: string; ordem: number; ativo: boolean; grupo: string | null }

// Grupos do card "Pessoas do grupo": PF por família, PJ por holding.
const FAMILIAS: { key: string; label: string }[] = [
  { key: 'Eduardo', label: 'Família Eduardo' },
  { key: 'Sérgio Filho', label: 'Família Sérgio Filho' },
  { key: 'Pais', label: 'Família dos Pais' },
]
const HOLDINGS: { key: string; label: string }[] = [
  { key: 'Black Fortune', label: 'Black Fortune' },
  { key: 'OB Holding', label: 'OB Holding' },
  { key: 'Diretas', label: 'Diretas à PF' },
  { key: 'Offshore/Fundo', label: 'Offshore / Fundo' },
]
type Distrib = { fonte_id: string; pessoa_id: string; valor: number }
type Outro = { pessoa_id: string; outros_rendimentos: number }

const num = (n: number) => n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const paraTexto = (n: number) => (n && n !== 0 ? num(n) : '')

const CHIP: Record<Trilha, string> = {
  holding: 'bg-indigo-100 text-indigo-700',
  direta: 'bg-violet-100 text-violet-700',
  offshore: 'bg-amber-100 text-amber-800',
  fundo: 'bg-orange-100 text-orange-800',
  intermediaria: 'bg-slate-100 text-slate-500',
}
const TRILHA_KEYS: Trilha[] = ['holding', 'direta', 'offshore', 'fundo', 'intermediaria']

export default function IRCalculadora({
  ano, fontes, pessoas, distrib, outros, semTabela,
}: {
  ano: number
  fontes: Fonte[]
  pessoas: Pessoa[]
  distrib: Distrib[]
  outros: Outro[]
  semTabela: boolean
}) {
  const router = useRouter()

  const [dist, setDist] = useState<Record<string, string>>(() => {
    const m: Record<string, string> = {}
    for (const d of distrib) m[`${d.fonte_id}:${d.pessoa_id}`] = paraTexto(Number(d.valor))
    return m
  })
  const [outroTxt, setOutroTxt] = useState<Record<string, string>>(() => {
    const m: Record<string, string> = {}
    for (const o of outros) m[o.pessoa_id] = paraTexto(Number(o.outros_rendimentos))
    return m
  })

  const [novoNome, setNovoNome] = useState('')
  const [novoTipo, setNovoTipo] = useState<TipoPessoa>('pf')
  const [novaFonte, setNovaFonte] = useState('')
  const [novaTrilha, setNovaTrilha] = useState<Trilha>('direta')
  const [busy, setBusy] = useState(false)
  const [erro, setErro] = useState('')
  const [pessoasAberto, setPessoasAberto] = useState(false) // card começa FECHADO
  const [novoInativo, setNovoInativo] = useState(false)      // nova pessoa já entra inativa (ex.: crianças)
  const [novoGrupo, setNovoGrupo] = useState('')             // família (PF) ou holding (PJ) da nova pessoa
  const [abaPessoas, setAbaPessoas] = useState<'pf' | 'pj'>('pf') // card mostra PF OU PJ (nunca os dois juntos)

  const key = (f: string, p: string) => `${f}:${p}`
  const valor = (f: string, p: string) => toNum(dist[key(f, p)] ?? '')
  const lancamentosDe = (p: string) =>
    fontes.map(f => ({ trilha: f.trilha as Trilha, valor: valor(f.id, p) }))

  // ── Ações ──
  async function salvarCelula(fonteId: string, pessoaId: string, texto: string) {
    const v = toNum(texto)
    setDist(m => ({ ...m, [key(fonteId, pessoaId)]: paraTexto(v) }))
    const r = await setDistribuicao(ano, fonteId, pessoaId, v)
    if (!r.ok) setErro(r.erro)
  }
  async function salvarOutros(pessoaId: string, texto: string) {
    const v = toNum(texto)
    setOutroTxt(m => ({ ...m, [pessoaId]: paraTexto(v) }))
    const r = await setOutrosRendimentos(ano, pessoaId, v)
    if (!r.ok) setErro(r.erro)
  }
  async function criarPessoa() {
    if (!novoNome.trim()) { setErro('Informe o nome.'); return }
    setBusy(true); setErro('')
    try {
      const r = await addPessoa(novoNome, novoTipo, !novoInativo, novoGrupo || null)
      if (!r.ok) { setErro(r.erro); return }
      setNovoNome(''); setNovoTipo('pf'); setNovoInativo(false); setNovoGrupo(''); router.refresh()
    } finally { setBusy(false) }
  }
  async function mudarGrupo(p: Pessoa, grupo: string) {
    setBusy(true); setErro('')
    try {
      const r = await setPessoaGrupo(p.id, grupo || null)
      if (!r.ok) { setErro(r.erro); return }
      router.refresh()
    } finally { setBusy(false) }
  }
  async function alternarAtivo(p: Pessoa) {
    setBusy(true); setErro('')
    try {
      const r = await setPessoaAtiva(p.id, !p.ativo)
      if (!r.ok) { setErro(r.erro); return }
      router.refresh()
    } finally { setBusy(false) }
  }
  async function alternarTipo(p: Pessoa) {
    setBusy(true); setErro('')
    try {
      const r = await atualizarPessoa(p.id, p.nome, p.tipo === 'pj' ? 'pf' : 'pj')
      if (!r.ok) { setErro(r.erro); return }
      router.refresh()
    } finally { setBusy(false) }
  }
  async function excluirPessoa(p: Pessoa) {
    if (!confirm(`Remover ${p.nome} do cálculo? Apaga também os lançamentos dele.`)) return
    setBusy(true); setErro('')
    try {
      const r = await removerPessoa(p.id)
      if (!r.ok) { setErro(r.erro); return }
      router.refresh()
    } finally { setBusy(false) }
  }
  async function criarFonte() {
    if (!novaFonte.trim()) { setErro('Informe o nome da fonte.'); return }
    setBusy(true); setErro('')
    try {
      const r = await addFonte(novaFonte, novaTrilha)
      if (!r.ok) { setErro(r.erro); return }
      setNovaFonte(''); router.refresh()
    } finally { setBusy(false) }
  }
  async function mudarTrilha(f: Fonte, trilha: Trilha) {
    setBusy(true); setErro('')
    try {
      const r = await atualizarFonte(f.id, f.nome, trilha)
      if (!r.ok) { setErro(r.erro); return }
      router.refresh()
    } finally { setBusy(false) }
  }
  async function excluirFonte(f: Fonte) {
    if (!confirm(`Remover a fonte ${f.nome}? Apaga também os lançamentos dela.`)) return
    setBusy(true); setErro('')
    try {
      const r = await removerFonte(f.id)
      if (!r.ok) { setErro(r.erro); return }
      router.refresh()
    } finally { setBusy(false) }
  }

  // ── Cálculos ──
  // Pessoas físicas × jurídicas. As EMPRESAS (PJ) entram no card só p/ organização
  // (por holding) — NÃO viram coluna na grade nem contam no imposto. A grade e os
  // cálculos usam só as PFs ATIVAS; as PFs inativas (ex.: crianças) aparecem no card
  // mas não contam até serem ativadas.
  const pessoasPF = pessoas.filter(p => p.tipo !== 'pj')
  const pessoasPJ = pessoas.filter(p => p.tipo === 'pj')
  const pfAtivas = pessoasPF.filter(p => p.ativo)
  const resultados = pfAtivas.map(p => ({
    pessoa: p,
    r: calcularPessoa(p.tipo as TipoPessoa, lancamentosDe(p.id), toNum(outroTxt[p.id] ?? '')),
  }))
  const tot = {
    distribuido: resultados.reduce((s, x) => s + x.r.dividendoAnual, 0),
    irrf: resultados.reduce((s, x) => s + x.r.irrfAnual, 0),
    dividendoAPagar: resultados.reduce((s, x) => s + x.r.dividendoAPagar, 0),
    t3: resultados.reduce((s, x) => s + x.r.impostoT3, 0),
    geral: resultados.reduce((s, x) => s + x.r.totalImposto, 0),
  }

  const fontesDiv = fontes.filter(f => ehDividendo(f.trilha as Trilha))
  const fontesEsp = fontes.filter(f => ehEspecial(f.trilha as Trilha))
  const fontesIsentas = fontes.filter(f => (f.trilha as Trilha) === 'intermediaria')

  const inputCelula = 'w-full min-w-[6.5rem] text-right text-sm bg-transparent outline-none px-2 py-1.5 rounded border border-transparent hover:border-gray-200 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100'

  // Tabela de lançamentos para um conjunto de fontes. `modo` = 'mensal' | 'anual'.
  function GradeFontes({ lista, modo }: { lista: Fonte[]; modo: 'mensal' | 'anual' }) {
    if (lista.length === 0) return <p className="text-sm text-gray-400">Nenhuma fonte nesta trilha.</p>
    return (
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="text-left">
              <th className="sticky left-0 bg-white z-10 px-2 py-2 font-semibold text-gray-500 border-b border-gray-200">
                Fonte <span className="font-normal text-gray-400">({modo === 'mensal' ? 'R$/mês' : 'R$/ano'})</span>
              </th>
              {pfAtivas.map(p => (
                <th key={p.id} className="px-2 py-2 border-b border-gray-200 text-right">
                  <span className="font-semibold text-gray-700">{p.nome}</span>
                  <span className={`ml-1 text-[9px] font-bold ${p.tipo === 'pj' ? 'text-slate-400' : 'text-indigo-400'}`}>{p.tipo === 'pj' ? 'PJ' : 'PF'}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {lista.map(f => {
              const tr = f.trilha as Trilha
              return (
                <tr key={f.id} className="border-b border-gray-100 last:border-0">
                  <td className="sticky left-0 bg-white z-10 px-2 py-1.5 whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium text-gray-700">{f.nome}</span>
                      <select
                        value={tr} disabled={busy}
                        onChange={e => mudarTrilha(f, e.target.value as Trilha)}
                        title="Trilha tributária"
                        className={`text-[10px] font-bold rounded-full px-1.5 py-0.5 border-0 cursor-pointer ${CHIP[tr]}`}
                      >
                        {TRILHA_KEYS.map(k => <option key={k} value={k}>{TRILHA_INFO[k].curto}</option>)}
                      </select>
                      <button onClick={() => excluirFonte(f)} disabled={busy} title="Remover fonte" className="w-4 h-4 rounded-full text-gray-300 hover:text-rose-600 hover:bg-rose-50 leading-none text-xs">×</button>
                    </div>
                  </td>
                  {pfAtivas.map(p => {
                    const v = valor(f.id, p.id)
                    const retemPF = modo === 'mensal' && p.tipo !== 'pj' && v > LIMITE_IRRF_MES
                    return (
                      <td key={p.id} className="px-1 py-1 align-top">
                        <input
                          type="text" inputMode="decimal"
                          value={dist[key(f.id, p.id)] ?? ''}
                          onChange={ev => setDist(m => ({ ...m, [key(f.id, p.id)]: ev.target.value }))}
                          onBlur={ev => salvarCelula(f.id, p.id, ev.target.value)}
                          placeholder="0,00"
                          className={inputCelula}
                        />
                        {retemPF && <div className="text-right text-[9px] text-rose-500 font-semibold pr-2">10%: {brl(v * 0.10)}</div>}
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    )
  }

  // Uma linha (em fila) de pessoa/empresa no card "Pessoas do grupo".
  function linhaPessoa(p: Pessoa) {
    const opcoes = p.tipo === 'pj' ? HOLDINGS : FAMILIAS
    return (
      <li key={p.id} className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 border ${p.ativo ? 'bg-white border-gray-200' : 'bg-gray-50 border-dashed border-gray-300'}`}>
        <span className={`flex-1 text-sm font-medium truncate ${p.ativo ? 'text-gray-800' : 'text-gray-400'}`}>{p.nome}</span>
        {!p.ativo && <span className="text-[9px] font-bold uppercase tracking-wide text-gray-400 bg-white border border-gray-200 rounded-full px-1.5 py-0.5">inativa</span>}
        <button
          onClick={() => alternarTipo(p)} disabled={busy}
          title="Alternar PF / PJ (PJ é isenta dos 10%)"
          className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${p.tipo === 'pj' ? 'bg-slate-200 text-slate-600' : 'bg-indigo-100 text-indigo-700'}`}
        >{p.tipo === 'pj' ? 'PJ' : 'PF'}</button>
        <select
          value={p.grupo ?? ''} disabled={busy}
          onChange={e => mudarGrupo(p, e.target.value)}
          title={p.tipo === 'pj' ? 'Holding' : 'Família'}
          className="text-[11px] text-gray-600 bg-gray-50 border border-gray-200 rounded-md px-1.5 py-1 cursor-pointer max-w-[9rem]"
        >
          <option value="">— {p.tipo === 'pj' ? 'holding' : 'família'} —</option>
          {opcoes.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
        </select>
        <button
          onClick={() => alternarAtivo(p)} disabled={busy}
          title={p.ativo ? 'Pausar — tira dos cálculos e das tabelas' : 'Ativar — passa a entrar nos cálculos'}
          className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${p.ativo ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-amber-100 text-amber-700 hover:bg-amber-200'}`}
        >{p.ativo ? 'pausar' : 'ativar'}</button>
        <button onClick={() => excluirPessoa(p)} disabled={busy} title="Remover" className="w-5 h-5 rounded-full text-gray-400 hover:text-rose-600 hover:bg-rose-50 leading-none shrink-0">×</button>
      </li>
    )
  }
  // Um bloco de grupo (família ou holding) com as linhas em fila. Vazio → não renderiza.
  function blocoGrupo(titulo: string, lista: Pessoa[], cor: string) {
    if (lista.length === 0) return null
    return (
      <div key={titulo}>
        <div className={`text-[11px] font-bold uppercase tracking-wide mb-1 ${cor}`}>{titulo} <span className="font-normal text-gray-400 normal-case">({lista.length})</span></div>
        <ul className="flex flex-col gap-1">{lista.map(linhaPessoa)}</ul>
      </div>
    )
  }
  const semFamilia = pessoasPF.filter(p => !FAMILIAS.some(f => f.key === (p.grupo ?? '')))
  const semHolding = pessoasPJ.filter(p => !HOLDINGS.some(h => h.key === (p.grupo ?? '')))

  return (
    <div className="space-y-5">
      {/* Cabeçalho + ano */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <span className="text-3xl">🧾</span>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Imposto de Renda {ano}</h2>
            <p className="text-xs text-gray-500">Renda da família por trilha tributária · reforma 2026 + offshore + fundos</p>
          </div>
        </div>
        <div className="flex items-center gap-1 text-sm">
          <Link href={`/financeiro/ir?ano=${ano - 1}`} className="w-8 h-8 flex items-center justify-center rounded-lg bg-white border border-gray-200 hover:bg-gray-50">‹</Link>
          <span className="px-3 py-1.5 font-semibold text-gray-700">{ano}</span>
          <Link href={`/financeiro/ir?ano=${ano + 1}`} className="w-8 h-8 flex items-center justify-center rounded-lg bg-white border border-gray-200 hover:bg-gray-50">›</Link>
        </div>
      </div>

      {/* As três trilhas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2.5">
          <p className="text-xs font-bold text-indigo-800">Trilha 1 · Holdings de topo</p>
          <p className="text-[11px] text-indigo-700/80">Black Fortune, OB Holding → dividendo 10% + imposto mínimo</p>
        </div>
        <div className="rounded-xl border border-violet-200 bg-violet-50 px-3 py-2.5">
          <p className="text-xs font-bold text-violet-800">Trilha 2 · Diretas à PF</p>
          <p className="text-[11px] text-violet-700/80">Oyster→Janara, Summit→Roseli → dividendo 10% + imposto mínimo</p>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5">
          <p className="text-xs font-bold text-amber-800">Trilha 3 · Offshore e fundos</p>
          <p className="text-[11px] text-amber-700/80">La Jolla (~15%), Golden Sky (fundo) → regime próprio</p>
        </div>
      </div>

      {/* Aviso */}
      <div className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
        ⚠️ Ferramenta de <b>planejamento/estimativa</b>. Elos <b>PJ→PJ</b> (IMG, PAN, METVISA, E.M.E) são isentos. O <b>redutor</b> anti-bitributação e a interação da trilha 3 com o imposto mínimo entram numa próxima etapa.
      </div>

      {erro && <p className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">{erro}</p>}

      {semTabela && (
        <div className="text-sm text-indigo-900 bg-indigo-50 border border-indigo-200 rounded-lg px-3 py-3">
          Antes de usar, rode <code className="bg-white px-1 rounded border">migrations/020_ir_trilhas.sql</code> (e a 019, se ainda não) no SQL Editor do Supabase. A página já funciona; só o salvamento depende disso.
        </div>
      )}

      {/* Pessoas do grupo — card recolhível (começa fechado) */}
      <section className="bg-white border border-gray-200 rounded-2xl p-4">
        <button
          type="button" onClick={() => setPessoasAberto(v => !v)}
          className="w-full flex items-center justify-between gap-2 text-left"
          aria-expanded={pessoasAberto}
        >
          <h3 className="text-sm font-bold text-gray-700">👥 Pessoas do grupo</h3>
          <span className="flex items-center gap-2">
            <span className="text-[11px] text-gray-400">
              {pessoasPF.length} pessoa{pessoasPF.length === 1 ? '' : 's'} · {pessoasPJ.length} empresa{pessoasPJ.length === 1 ? '' : 's'}
            </span>
            <span className={`text-gray-400 text-xs transition-transform ${pessoasAberto ? 'rotate-180' : ''}`}>▾</span>
          </span>
        </button>

        {pessoasAberto && (
          <div className="mt-3 space-y-4">
            {pessoas.length === 0 ? (
              <p className="text-xs text-gray-400">Nenhuma pessoa ainda — adicione quem recebe os lucros.</p>
            ) : (
              <>
                {/* Alternador PF | PJ — mostra um grupo de cada vez */}
                <div className="inline-flex rounded-lg border border-gray-200 overflow-hidden text-sm">
                  <button
                    type="button" onClick={() => { setAbaPessoas('pf'); setNovoTipo('pf'); setNovoGrupo('') }}
                    className={`px-4 py-1.5 font-semibold ${abaPessoas === 'pf' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                  >PF · Pessoas <span className={abaPessoas === 'pf' ? 'text-indigo-200' : 'text-gray-400'}>({pessoasPF.length})</span></button>
                  <button
                    type="button" onClick={() => { setAbaPessoas('pj'); setNovoTipo('pj'); setNovoGrupo('') }}
                    className={`px-4 py-1.5 font-semibold border-l border-gray-200 ${abaPessoas === 'pj' ? 'bg-slate-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                  >PJ · Empresas <span className={abaPessoas === 'pj' ? 'text-slate-300' : 'text-gray-400'}>({pessoasPJ.length})</span></button>
                </div>

                {/* Pessoas físicas — por família */}
                {abaPessoas === 'pf' && (
                  <div className="space-y-3">
                    {FAMILIAS.map(f => blocoGrupo(f.label, pessoasPF.filter(p => (p.grupo ?? '') === f.key), 'text-indigo-600'))}
                    {blocoGrupo('Sem família', semFamilia, 'text-gray-400')}
                    {pessoasPF.length === 0 && <p className="text-xs text-gray-400">Nenhuma pessoa física ainda.</p>}
                  </div>
                )}
                {/* Empresas (PJ) — por holding */}
                {abaPessoas === 'pj' && (
                  <div className="space-y-3">
                    <div className="text-[11px] text-gray-400">Organização por holding · as empresas ficam fora da grade de distribuição.</div>
                    {HOLDINGS.map(h => blocoGrupo(h.label, pessoasPJ.filter(p => (p.grupo ?? '') === h.key), 'text-slate-500'))}
                    {blocoGrupo('Sem holding', semHolding, 'text-gray-400')}
                    {pessoasPJ.length === 0 && <p className="text-xs text-gray-400">Nenhuma empresa ainda.</p>}
                  </div>
                )}
              </>
            )}
            {/* Adicionar pessoa/empresa */}
            <div className="flex gap-2 flex-wrap items-center pt-2 border-t border-gray-100">
              <input
                value={novoNome} onChange={e => setNovoNome(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') criarPessoa() }}
                placeholder="Nome da pessoa / empresa"
                className="flex-1 min-w-[11rem] px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
              />
              <div className="inline-flex rounded-lg border border-gray-300 overflow-hidden text-sm">
                <button onClick={() => { setNovoTipo('pf'); setNovoGrupo('') }} className={`px-3 py-2 ${novoTipo === 'pf' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600'}`}>PF</button>
                <button onClick={() => { setNovoTipo('pj'); setNovoGrupo('') }} className={`px-3 py-2 ${novoTipo === 'pj' ? 'bg-slate-600 text-white' : 'bg-white text-gray-600'}`}>PJ</button>
              </div>
              <select
                value={novoGrupo} onChange={e => setNovoGrupo(e.target.value)}
                title={novoTipo === 'pj' ? 'Holding' : 'Família'}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 bg-white"
              >
                <option value="">{novoTipo === 'pj' ? 'Holding…' : 'Família…'}</option>
                {(novoTipo === 'pj' ? HOLDINGS : FAMILIAS).map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
              </select>
              <button
                type="button" onClick={() => setNovoInativo(v => !v)}
                title="Cadastrar já como inativa (aparece no card, mas não entra nos cálculos)"
                className={`px-3 py-2 rounded-lg border text-sm font-medium ${novoInativo ? 'bg-amber-100 border-amber-300 text-amber-700' : 'bg-white border-gray-300 text-gray-500'}`}
              >{novoInativo ? '☑ inativa' : 'inativa'}</button>
              <button onClick={criarPessoa} disabled={busy} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:opacity-60">＋ Adicionar</button>
            </div>
          </div>
        )}
      </section>

      {pfAtivas.length > 0 && (
        <>
          {/* Trilhas 1 e 2 — dividendos (mensal) */}
          <section className="bg-white border border-gray-200 rounded-2xl p-4">
            <h3 className="text-sm font-bold text-gray-700 mb-1">💸 Trilhas 1 e 2 · Dividendos <span className="font-normal text-gray-400">(quanto cada um recebe por mês)</span></h3>
            <p className="text-[11px] text-gray-400 mb-3">Acima de {brl(LIMITE_IRRF_MES)}/mês por fonte, a PF tem 10% retido na fonte. A renda anual alimenta o imposto mínimo (IRPFM).</p>
            <GradeFontes lista={fontesDiv} modo="mensal" />
          </section>

          {/* Trilha 3 — offshore e fundos (anual) */}
          <section className="bg-white border border-amber-200 rounded-2xl p-4">
            <h3 className="text-sm font-bold text-amber-800 mb-1">🌐 Trilha 3 · Offshore e fundos <span className="font-normal text-amber-500">(lucro atribuído no ano)</span></h3>
            <p className="text-[11px] text-amber-600 mb-3">Regime próprio (não é o dividendo 10%): offshore {pctFmt(OFFSHORE_ALIQ)} (Lei 14.754/2023) e fundo {pctFmt(FUNDO_ALIQ)}. Lance o valor <b>anual</b>.</p>
            <GradeFontes lista={fontesEsp} modo="anual" />
          </section>

          {/* Cadeia isenta */}
          {fontesIsentas.length > 0 && (
            <section className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
              <h3 className="text-sm font-bold text-slate-600 mb-2">🔗 Cadeia isenta <span className="font-normal text-slate-400">(PJ→PJ, não gera imposto na família)</span></h3>
              <ul className="flex flex-wrap gap-2">
                {fontesIsentas.map(f => (
                  <li key={f.id} className="inline-flex items-center gap-1.5 bg-white border border-slate-200 rounded-full pl-3 pr-1.5 py-1">
                    <span className="text-sm text-slate-600">{f.nome}</span>
                    <select
                      value={f.trilha} disabled={busy}
                      onChange={e => mudarTrilha(f, e.target.value as Trilha)}
                      title="Trilha tributária"
                      className={`text-[10px] font-bold rounded-full px-1.5 py-0.5 border-0 cursor-pointer ${CHIP[f.trilha as Trilha]}`}
                    >
                      {TRILHA_KEYS.map(k => <option key={k} value={k}>{TRILHA_INFO[k].curto}</option>)}
                    </select>
                    <button onClick={() => excluirFonte(f)} disabled={busy} title="Remover" className="w-4 h-4 rounded-full text-slate-300 hover:text-rose-600 hover:bg-rose-50 leading-none text-xs">×</button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Adicionar fonte */}
          <section className="bg-white border border-gray-200 rounded-2xl p-4">
            <h3 className="text-sm font-bold text-gray-700 mb-3">🏢 Adicionar fonte</h3>
            <div className="flex gap-2 flex-wrap">
              <input
                value={novaFonte} onChange={e => setNovaFonte(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') criarFonte() }}
                placeholder="Nome da empresa / veículo"
                className="flex-1 min-w-[12rem] px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
              />
              <select
                value={novaTrilha} onChange={e => setNovaTrilha(e.target.value as Trilha)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
              >
                {TRILHA_KEYS.map(k => <option key={k} value={k}>{TRILHA_INFO[k].label}</option>)}
              </select>
              <button onClick={criarFonte} disabled={busy} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:opacity-60">＋ Adicionar</button>
            </div>
          </section>
        </>
      )}

      {/* Resultado por pessoa */}
      {resultados.length > 0 && (
        <section>
          <h3 className="text-sm font-bold text-gray-700 mb-3">📊 Resultado por pessoa (ano)</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {resultados.map(({ pessoa: p, r }) => {
              const temT3 = r.offshoreAnual > 0 || r.fundoAnual > 0
              return (
                <div key={p.id} className="bg-white border border-gray-200 rounded-2xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="font-bold text-gray-800 flex-1 min-w-0 truncate">{p.nome}</h4>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${p.tipo === 'pj' ? 'bg-slate-200 text-slate-600' : 'bg-indigo-100 text-indigo-700'}`}>{p.tipo === 'pj' ? 'PJ' : 'PF'}</span>
                  </div>

                  {p.tipo === 'pj' ? (
                    <div className="text-sm space-y-1">
                      <Linha rotulo="Recebido no ano" valor={brl(r.dividendoAnual)} />
                      <p className="text-xs text-slate-500 mt-1">Isento (PJ→PJ) e fora do imposto mínimo.</p>
                    </div>
                  ) : (
                    <div className="text-sm space-y-1">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Dividendos (trilhas 1 e 2)</p>
                      <Linha rotulo="Distribuição no ano" valor={brl(r.dividendoAnual)} />
                      <div className="flex items-center justify-between gap-2 py-0.5">
                        <span className="text-xs text-gray-500">+ Outros rendimentos</span>
                        <div className="flex items-center gap-1 border border-gray-200 rounded px-2 py-0.5 w-36">
                          <span className="text-[11px] text-gray-400">R$</span>
                          <input
                            type="text" inputMode="decimal"
                            value={outroTxt[p.id] ?? ''}
                            onChange={ev => setOutroTxt(m => ({ ...m, [p.id]: ev.target.value }))}
                            onBlur={ev => salvarOutros(p.id, ev.target.value)}
                            placeholder="0,00"
                            className="w-full text-right text-xs bg-transparent outline-none"
                          />
                        </div>
                      </div>
                      <Linha rotulo="= Renda anual" valor={brl(r.rendaAnual)} forte />
                      <Linha rotulo="Alíquota mínima (IRPFM)" valor={pctFmt(r.aliquota)} />
                      <Linha rotulo="Imposto mínimo" valor={brl(r.impostoMinimo)} />
                      <Linha rotulo="IRRF já retido (10%)" valor={brl(r.irrfAnual)} />
                      <Linha rotulo="Dividendo a pagar (mínimo)" valor={brl(r.dividendoAPagar)} />

                      {temT3 && (
                        <>
                          <div className="border-t border-gray-100 my-1.5" />
                          <p className="text-[10px] font-bold text-amber-500 uppercase tracking-wide">Trilha 3 (offshore e fundos)</p>
                          {r.offshoreAnual > 0 && (
                            <Linha rotulo={`Offshore ${pctFmt(OFFSHORE_ALIQ)} · base ${brl(r.offshoreAnual)}`} valor={brl(r.impostoOffshore)} />
                          )}
                          {r.fundoAnual > 0 && (
                            <Linha rotulo={`Fundo ${pctFmt(FUNDO_ALIQ)} · base ${brl(r.fundoAnual)}`} valor={brl(r.impostoFundo)} />
                          )}
                        </>
                      )}

                      <div className="flex items-center justify-between bg-indigo-50 rounded-md px-2.5 py-2 mt-1.5">
                        <span className="text-xs font-semibold text-indigo-700">Total de imposto no ano</span>
                        <span className="text-base font-bold text-indigo-700">{brl(r.totalImposto)}</span>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* Total do grupo familiar */}
      {resultados.length > 0 && (
        <section className="rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50 to-sky-50 p-4">
          <h3 className="text-sm font-black text-indigo-800 uppercase tracking-wide mb-3">🏛️ Grupo familiar — total {ano}</h3>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
            <Tile rotulo="Dividendos" valor={brl(tot.distribuido)} />
            <Tile rotulo="IRRF retido (10%)" valor={brl(tot.irrf)} />
            <Tile rotulo="Dividendo a pagar" valor={brl(tot.dividendoAPagar)} />
            <Tile rotulo="Imposto trilha 3" valor={brl(tot.t3)} />
            <Tile rotulo="Total de impostos" valor={brl(tot.geral)} destaque />
          </div>
        </section>
      )}
    </div>
  )
}

function Linha({ rotulo, valor, forte }: { rotulo: string; valor: string; forte?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2 py-0.5">
      <span className="text-xs text-gray-500">{rotulo}</span>
      <span className={forte ? 'font-bold text-gray-900' : 'font-semibold text-gray-700'}>{valor}</span>
    </div>
  )
}

function Tile({ rotulo, valor, destaque }: { rotulo: string; valor: string; destaque?: boolean }) {
  return (
    <div className={`rounded-xl px-3 py-2.5 ${destaque ? 'bg-indigo-600 text-white' : 'bg-white/70'}`}>
      <p className={`text-[10px] ${destaque ? 'text-indigo-100' : 'text-gray-500'}`}>{rotulo}</p>
      <p className={`text-sm font-bold ${destaque ? 'text-white' : 'text-gray-800'}`}>{valor}</p>
    </div>
  )
}

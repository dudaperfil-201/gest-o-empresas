'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { addPessoa, atualizarPessoa, removerPessoa, setDistribuicao, setOutrosRendimentos } from './actions'
import { calcularPessoa, brl, pctFmt, toNum, LIMITE_IRRF_MES, type TipoPessoa } from '@/lib/ir2026'

type Empresa = { id: string; nome: string }
type Pessoa = { id: string; nome: string; tipo: string; ordem: number }
type Distrib = { empresa_id: string; pessoa_id: string; valor_mensal: number }
type Outro = { pessoa_id: string; outros_rendimentos: number }

const num = (n: number) => n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const paraTexto = (n: number) => (n && n !== 0 ? num(n) : '')

export default function IRCalculadora({
  ano, empresas, pessoas, distrib, outros, semTabela,
}: {
  ano: number
  empresas: Empresa[]
  pessoas: Pessoa[]
  distrib: Distrib[]
  outros: Outro[]
  semTabela: boolean
}) {
  const router = useRouter()

  // Distribuição (texto editável) por "empresaId:pessoaId".
  const [dist, setDist] = useState<Record<string, string>>(() => {
    const m: Record<string, string> = {}
    for (const d of distrib) m[`${d.empresa_id}:${d.pessoa_id}`] = paraTexto(Number(d.valor_mensal))
    return m
  })
  // Outros rendimentos (texto) por pessoaId.
  const [outroTxt, setOutroTxt] = useState<Record<string, string>>(() => {
    const m: Record<string, string> = {}
    for (const o of outros) m[o.pessoa_id] = paraTexto(Number(o.outros_rendimentos))
    return m
  })

  const [novoNome, setNovoNome] = useState('')
  const [novoTipo, setNovoTipo] = useState<TipoPessoa>('pf')
  const [busy, setBusy] = useState(false)
  const [erro, setErro] = useState('')

  const key = (e: string, p: string) => `${e}:${p}`
  const valor = (e: string, p: string) => toNum(dist[key(e, p)] ?? '')
  const valoresDe = (p: string) => empresas.map(e => valor(e.id, p))

  // ── Ações ──
  async function salvarCelula(empresaId: string, pessoaId: string, texto: string) {
    const v = toNum(texto)
    setDist(m => ({ ...m, [key(empresaId, pessoaId)]: paraTexto(v) }))
    const r = await setDistribuicao(ano, empresaId, pessoaId, v)
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
      const r = await addPessoa(novoNome, novoTipo)
      if (!r.ok) { setErro(r.erro); return }
      setNovoNome(''); setNovoTipo('pf'); router.refresh()
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
    if (!confirm(`Remover ${p.nome} do cálculo? Apaga também as distribuições lançadas para ele.`)) return
    setBusy(true); setErro('')
    try {
      const r = await removerPessoa(p.id)
      if (!r.ok) { setErro(r.erro); return }
      router.refresh()
    } finally { setBusy(false) }
  }

  // ── Cálculos ──
  const resultados = pessoas.map(p => ({
    pessoa: p,
    r: calcularPessoa(p.tipo as TipoPessoa, valoresDe(p.id), toNum(outroTxt[p.id] ?? '')),
  }))
  const totalDistribuido = resultados.reduce((s, x) => s + x.r.distribuicaoAnual, 0)
  const totalIrrf = resultados.reduce((s, x) => s + x.r.irrfAnual, 0)
  const totalMinimo = resultados.reduce((s, x) => s + x.r.impostoMinimo, 0)
  const totalAPagar = resultados.reduce((s, x) => s + x.r.aPagar, 0)

  const inputCelula = 'w-full min-w-[6.5rem] text-right text-sm bg-transparent outline-none px-2 py-1.5 rounded border border-transparent hover:border-gray-200 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100'

  return (
    <div className="space-y-5">
      {/* Cabeçalho + ano */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <span className="text-3xl">🧾</span>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Imposto de Renda {ano}</h2>
            <p className="text-xs text-gray-500">Distribuição de lucros à família · reforma Lei 15.270/2025</p>
          </div>
        </div>
        <div className="flex items-center gap-1 text-sm">
          <Link href={`/financeiro/ir?ano=${ano - 1}`} className="w-8 h-8 flex items-center justify-center rounded-lg bg-white border border-gray-200 hover:bg-gray-50">‹</Link>
          <span className="px-3 py-1.5 font-semibold text-gray-700">{ano}</span>
          <Link href={`/financeiro/ir?ano=${ano + 1}`} className="w-8 h-8 flex items-center justify-center rounded-lg bg-white border border-gray-200 hover:bg-gray-50">›</Link>
        </div>
      </div>

      {/* Aviso */}
      <div className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
        ⚠️ Ferramenta de <b>planejamento/estimativa</b> com base na Lei 15.270/2025. Confirme os números com a contabilidade. O <b>redutor</b> anti-bitributação (IRPJ+CSLL já pago pelas empresas) entra numa próxima etapa.
      </div>

      {erro && <p className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">{erro}</p>}

      {semTabela && (
        <div className="text-sm text-indigo-900 bg-indigo-50 border border-indigo-200 rounded-lg px-3 py-3">
          Antes de usar, crie as tabelas no banco: rode <code className="bg-white px-1 rounded border">migrations/019_ir_distribuicao.sql</code> no SQL Editor do Supabase. (A página já funciona; só o salvamento depende disso.)
        </div>
      )}

      {/* Pessoas do grupo */}
      <section className="bg-white border border-gray-200 rounded-2xl p-4">
        <h3 className="text-sm font-bold text-gray-700 mb-3">👥 Pessoas do grupo</h3>
        {pessoas.length > 0 ? (
          <ul className="flex flex-wrap gap-2 mb-3">
            {pessoas.map(p => (
              <li key={p.id} className="inline-flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-full pl-3 pr-1.5 py-1">
                <span className="text-sm font-medium text-gray-800">{p.nome}</span>
                <button
                  onClick={() => alternarTipo(p)} disabled={busy}
                  title="Alternar PF / PJ (PJ é isenta dos 10%)"
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${p.tipo === 'pj' ? 'bg-slate-200 text-slate-600' : 'bg-indigo-100 text-indigo-700'}`}
                >{p.tipo === 'pj' ? 'PJ' : 'PF'}</button>
                <button onClick={() => excluirPessoa(p)} disabled={busy} title="Remover" className="w-5 h-5 rounded-full text-gray-400 hover:text-rose-600 hover:bg-rose-50 leading-none">×</button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-gray-400 mb-3">Nenhuma pessoa ainda — adicione quem recebe os lucros (PF é tributado; PJ é isento dos 10%).</p>
        )}
        <div className="flex gap-2 flex-wrap">
          <input
            value={novoNome} onChange={e => setNovoNome(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') criarPessoa() }}
            placeholder="Nome da pessoa / empresa sócia"
            className="flex-1 min-w-[12rem] px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
          />
          <div className="inline-flex rounded-lg border border-gray-300 overflow-hidden text-sm">
            <button onClick={() => setNovoTipo('pf')} className={`px-3 py-2 ${novoTipo === 'pf' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600'}`}>PF</button>
            <button onClick={() => setNovoTipo('pj')} className={`px-3 py-2 ${novoTipo === 'pj' ? 'bg-slate-600 text-white' : 'bg-white text-gray-600'}`}>PJ</button>
          </div>
          <button onClick={criarPessoa} disabled={busy} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:opacity-60">＋ Adicionar</button>
        </div>
      </section>

      {/* Grade de distribuição */}
      {pessoas.length > 0 && (
        <section className="bg-white border border-gray-200 rounded-2xl p-4">
          <h3 className="text-sm font-bold text-gray-700 mb-1">💸 Distribuição por empresa <span className="font-normal text-gray-400">(quanto cada um recebe por mês)</span></h3>
          <p className="text-[11px] text-gray-400 mb-3">Acima de {brl(LIMITE_IRRF_MES)}/mês por empresa, a PF tem 10% retido na fonte.</p>
          {empresas.length === 0 ? (
            <p className="text-sm text-gray-400">Nenhuma empresa cadastrada ainda (cadastre em Imóveis).</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="text-left">
                    <th className="sticky left-0 bg-white z-10 px-2 py-2 font-semibold text-gray-500 border-b border-gray-200">Empresa</th>
                    {pessoas.map(p => (
                      <th key={p.id} className="px-2 py-2 border-b border-gray-200 text-right">
                        <span className="font-semibold text-gray-700">{p.nome}</span>
                        <span className={`ml-1 text-[9px] font-bold ${p.tipo === 'pj' ? 'text-slate-400' : 'text-indigo-400'}`}>{p.tipo === 'pj' ? 'PJ' : 'PF'}</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {empresas.map(e => (
                    <tr key={e.id} className="border-b border-gray-100 last:border-0">
                      <td className="sticky left-0 bg-white z-10 px-2 py-1 font-medium text-gray-700 whitespace-nowrap">{e.nome}</td>
                      {pessoas.map(p => {
                        const v = valor(e.id, p.id)
                        const retemPF = p.tipo !== 'pj' && v > LIMITE_IRRF_MES
                        return (
                          <td key={p.id} className="px-1 py-1 align-top">
                            <input
                              type="text" inputMode="decimal"
                              value={dist[key(e.id, p.id)] ?? ''}
                              onChange={ev => setDist(m => ({ ...m, [key(e.id, p.id)]: ev.target.value }))}
                              onBlur={ev => salvarCelula(e.id, p.id, ev.target.value)}
                              placeholder="0,00"
                              className={inputCelula}
                            />
                            {retemPF && (
                              <div className="text-right text-[9px] text-rose-500 font-semibold pr-2">10%: {brl(v * 0.10)}</div>
                            )}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* Resultado por pessoa */}
      {resultados.length > 0 && (
        <section>
          <h3 className="text-sm font-bold text-gray-700 mb-3">📊 Resultado por pessoa (ano)</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {resultados.map(({ pessoa: p, r }) => (
              <div key={p.id} className="bg-white border border-gray-200 rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <h4 className="font-bold text-gray-800 flex-1 min-w-0 truncate">{p.nome}</h4>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${p.tipo === 'pj' ? 'bg-slate-200 text-slate-600' : 'bg-indigo-100 text-indigo-700'}`}>{p.tipo === 'pj' ? 'PJ' : 'PF'}</span>
                </div>

                {p.tipo === 'pj' ? (
                  <div className="text-sm space-y-1">
                    <Linha rotulo="Recebido no ano" valor={brl(r.distribuicaoAnual)} />
                    <p className="text-xs text-slate-500 mt-1">Isento dos 10% (PJ→PJ) e fora do imposto mínimo.</p>
                  </div>
                ) : (
                  <div className="text-sm space-y-1">
                    <Linha rotulo="Distribuição no ano" valor={brl(r.distribuicaoAnual)} />
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
                    <div className="border-t border-gray-100 my-1" />
                    <Linha rotulo="Alíquota mínima (IRPFM)" valor={pctFmt(r.aliquota)} />
                    <Linha rotulo="Imposto mínimo" valor={brl(r.impostoMinimo)} />
                    <Linha rotulo="IRRF já retido (10%)" valor={brl(r.irrfAnual)} />
                    <div className="flex items-center justify-between bg-indigo-50 rounded-md px-2.5 py-2 mt-1.5">
                      <span className="text-xs font-semibold text-indigo-700">A pagar no mínimo</span>
                      <span className="text-base font-bold text-indigo-700">{brl(r.aPagar)}</span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Total do grupo familiar */}
      {resultados.length > 0 && (
        <section className="rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50 to-sky-50 p-4">
          <h3 className="text-sm font-black text-indigo-800 uppercase tracking-wide mb-3">🏛️ Grupo familiar — total {ano}</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <Tile rotulo="Distribuído" valor={brl(totalDistribuido)} />
            <Tile rotulo="IRRF retido (10%)" valor={brl(totalIrrf)} />
            <Tile rotulo="Imposto mínimo" valor={brl(totalMinimo)} />
            <Tile rotulo="A pagar (mínimo)" valor={brl(totalAPagar)} destaque />
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

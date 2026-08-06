'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { salvarMesFinanceiro, type ItemMes } from '@/app/actions/financeiro'

type Mes = { abrev: string; nome: string; ano: number; mes: number }
type Item = {
  slug: string; carteiraNome: string; tipo: string; banco: string; nome: string
  moeda: string | null; valores: (number | null)[]; valoresMoeda: (number | null)[]
}

const NOMES_MES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
const ABREV_MES = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ']
const chave = (it: Item) => `${it.slug}|${it.banco}|${it.nome}`

export default function EditorFinanceiro({ itens, meses }: { itens: Item[]; meses: Mes[] }) {
  const router = useRouter()

  // Meses navegáveis = os existentes + UM mês novo no fim (o seguinte ao último).
  // A seta ›, ao chegar no fim, "abre" esse mês novo (pré-preenchido com o anterior).
  const proximo: Mes = useMemo(() => {
    const u = meses[meses.length - 1]
    const ano = u ? (u.mes === 12 ? u.ano + 1 : u.ano) : new Date().getFullYear()
    const mes = u ? (u.mes === 12 ? 1 : u.mes + 1) : new Date().getMonth() + 1
    return { abrev: ABREV_MES[mes - 1], nome: NOMES_MES[mes - 1], ano, mes }
  }, [meses])
  const navMeses: (Mes & { novo: boolean })[] = useMemo(
    () => [...meses.map(m => ({ ...m, novo: false })), { ...proximo, novo: true }],
    [meses, proximo],
  )

  // Seleção começa no último mês existente (junho). A seta › leva ao mês novo.
  const [sel, setSel] = useState(Math.max(0, meses.length - 1))
  const atual = navMeses[sel]

  const [valores, setValores] = useState<Record<string, string>>({})
  const [valoresMoeda, setValoresMoeda] = useState<Record<string, string>>({})
  const [iniciado, setIniciado] = useState<number | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [msg, setMsg] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null)

  // Quando a seleção muda: mês existente carrega os valores dele; mês NOVO começa ZERADO
  // (campos vazios), para preencher com os dados do extrato.
  if (iniciado !== sel) {
    const nv: Record<string, string> = {}
    const nvm: Record<string, string> = {}
    for (const it of itens) {
      const key = chave(it)
      if (atual.novo) { nv[key] = ''; nvm[key] = '' }
      else {
        const v = it.valores[sel]
        nv[key] = v != null ? String(v) : ''
        const vm = it.valoresMoeda[sel]
        nvm[key] = vm != null ? String(vm) : ''
      }
    }
    setValores(nv)
    setValoresMoeda(nvm)
    setIniciado(sel)
  }

  const grupos = useMemo(() => {
    const map = new Map<string, { nome: string; tipo: string; bancos: Map<string, Item[]> }>()
    for (const it of itens) {
      if (!map.has(it.slug)) map.set(it.slug, { nome: it.carteiraNome, tipo: it.tipo, bancos: new Map() })
      const g = map.get(it.slug)!
      if (!g.bancos.has(it.banco)) g.bancos.set(it.banco, [])
      g.bancos.get(it.banco)!.push(it)
    }
    return [...map.entries()]
  }, [itens])

  async function salvar() {
    const payload: ItemMes[] = []
    for (const it of itens) {
      const key = chave(it)
      const raw = (valores[key] ?? '').trim()
      if (raw === '') continue
      const valor = Number(raw.replace(',', '.'))
      if (!Number.isFinite(valor)) continue
      const rawM = (valoresMoeda[key] ?? '').trim()
      const vm = it.moeda && rawM !== '' ? Number(rawM.replace(',', '.')) : NaN
      payload.push({
        carteira_slug: it.slug, banco: it.banco, investimento: it.nome,
        valor, valor_moeda: Number.isFinite(vm) ? vm : null,
      })
    }
    setSalvando(true)
    setMsg(null)
    try {
      const r = await salvarMesFinanceiro(atual.ano, atual.mes, payload)
      if (!r.ok) { setMsg({ tipo: 'erro', texto: r.erro }); return }
      setMsg({ tipo: 'ok', texto: `${r.gravados} valores salvos em ${atual.nome}/${atual.ano}.` })
      router.refresh()
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto pb-28">
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
        <Link href="/" className="hover:text-blue-600">Início</Link>
        <span>/</span>
        <Link href="/financeiro" className="hover:text-blue-600">Financeiro</Link>
        <span>/</span>
        <span className="text-gray-900 font-medium">Lançar / editar</span>
      </div>

      <h2 className="text-xl font-semibold text-gray-900 mb-1">Lançar / editar Financeiro</h2>
      <p className="text-sm text-gray-500 mb-4">Use as setas para correr os meses. O mês novo vem zerado — preencha com os dados do extrato e salve.</p>

      {/* Faixa verde com navegação de mês (mesma cara do Financeiro) */}
      <div className="bg-green-600 text-white rounded-xl p-5 mb-4 flex items-center justify-between gap-3 text-xl font-bold tracking-wide">
        <span className="uppercase flex items-center gap-2">
          Mês
          {atual.novo && <span className="text-[10px] font-semibold bg-yellow-400 text-yellow-900 px-1.5 py-0.5 rounded">NOVO</span>}
        </span>
        <span className="flex items-center gap-2 sm:gap-4">
          {sel > 0 ? (
            <button onClick={() => setSel(sel - 1)} aria-label="Mês anterior"
              className="w-8 h-8 flex items-center justify-center rounded-full bg-green-700 hover:bg-green-800 transition-colors text-2xl leading-none">‹</button>
          ) : (
            <span className="w-8 h-8 flex items-center justify-center rounded-full bg-green-700/40 text-2xl leading-none opacity-40">‹</span>
          )}
          <span className="min-w-[10rem] text-center">{atual.nome}/{atual.ano}</span>
          {sel < navMeses.length - 1 ? (
            <button onClick={() => setSel(sel + 1)} aria-label="Próximo mês"
              className="w-8 h-8 flex items-center justify-center rounded-full bg-green-700 hover:bg-green-800 transition-colors text-2xl leading-none">›</button>
          ) : (
            <span className="w-8 h-8 flex items-center justify-center rounded-full bg-green-700/40 text-2xl leading-none opacity-40">›</span>
          )}
        </span>
        <span className="text-sm font-normal">{atual.novo ? 'mês novo — zerado' : 'editando'}</span>
      </div>

      {msg && (
        <div className={`mb-3 px-4 py-2 rounded-lg text-sm font-medium ${msg.tipo === 'ok' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {msg.texto}
        </div>
      )}

      {/* Grade de investimentos */}
      <div className="space-y-4">
        {grupos.map(([slug, g]) => (
          <div key={slug} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 flex items-center gap-2">
              <h3 className="font-semibold text-gray-900 text-sm">{g.nome}</h3>
              <span className="text-xs">{g.tipo === 'brasil' ? '🇧🇷' : '🌎'}</span>
            </div>
            <div className="p-3 space-y-3">
              {[...g.bancos.entries()].map(([banco, invs]) => (
                <div key={banco}>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">{banco}</p>
                  <div className="space-y-1.5">
                    {invs.map(it => {
                      const key = chave(it)
                      return (
                        <div key={key} className="flex items-center gap-2">
                          <span className="flex-1 text-sm text-gray-700 truncate">{it.nome}</span>
                          {it.moeda && (
                            <div className="flex items-center gap-1">
                              <span className="text-xs text-gray-400">{it.moeda}</span>
                              <input
                                type="number" step="0.01" inputMode="decimal"
                                value={valoresMoeda[key] ?? ''}
                                onChange={e => setValoresMoeda(p => ({ ...p, [key]: e.target.value }))}
                                placeholder="moeda"
                                className="w-28 px-2 py-1.5 border border-gray-300 rounded-lg text-sm text-right focus:outline-none focus:ring-2 focus:ring-green-200"
                              />
                            </div>
                          )}
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-gray-400">R$</span>
                            <input
                              type="number" step="0.01" inputMode="decimal"
                              value={valores[key] ?? ''}
                              onChange={e => setValores(p => ({ ...p, [key]: e.target.value }))}
                              placeholder="0,00"
                              className="w-36 px-2 py-1.5 border border-gray-300 rounded-lg text-sm text-right focus:outline-none focus:ring-2 focus:ring-green-200"
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Barra fixa de salvar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-3 shadow-lg flex items-center justify-between gap-3">
        <span className="text-sm text-gray-600">Salvando em <b>{atual.nome}/{atual.ano}</b></span>
        <button onClick={salvar} disabled={salvando}
          className="bg-green-600 text-white px-6 py-2 rounded-lg text-sm font-semibold hover:bg-green-700 transition-colors disabled:opacity-60">
          {salvando ? 'Salvando…' : 'Salvar mês'}
        </button>
      </div>
    </div>
  )
}

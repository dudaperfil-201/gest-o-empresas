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
const chave = (it: Item) => `${it.slug}|${it.banco}|${it.nome}`

export default function EditorFinanceiro({ itens, meses }: { itens: Item[]; meses: Mes[] }) {
  const router = useRouter()

  // Próximo mês (para o "Novo mês") a partir do último cadastrado.
  const ultimo = meses[meses.length - 1]
  const proximo = ultimo
    ? (ultimo.mes === 12 ? { ano: ultimo.ano + 1, mes: 1 } : { ano: ultimo.ano, mes: ultimo.mes + 1 })
    : { ano: new Date().getFullYear(), mes: new Date().getMonth() + 1 }

  // Seleção: índice de um mês existente OU 'novo'.
  const [sel, setSel] = useState<number | 'novo'>(meses.length - 1)
  const [novoAno, setNovoAno] = useState(proximo.ano)
  const [novoMes, setNovoMes] = useState(proximo.mes)

  // Índice-base para pré-preencher: mês existente = ele mesmo; novo = último (base).
  const baseIdx = sel === 'novo' ? meses.length - 1 : sel

  const [valores, setValores] = useState<Record<string, string>>({})
  const [valoresMoeda, setValoresMoeda] = useState<Record<string, string>>({})
  const [iniciado, setIniciado] = useState<number | 'novo' | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [msg, setMsg] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null)

  // Pré-preenche os inputs quando a seleção muda (roda no render, sem efeito).
  if (iniciado !== sel) {
    const nv: Record<string, string> = {}
    const nvm: Record<string, string> = {}
    for (const it of itens) {
      const key = chave(it)
      const v = baseIdx >= 0 ? it.valores[baseIdx] : null
      nv[key] = v != null ? String(v) : ''
      const vm = baseIdx >= 0 ? it.valoresMoeda[baseIdx] : null
      nvm[key] = vm != null ? String(vm) : ''
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
    const alvo = sel === 'novo' ? { ano: novoAno, mes: novoMes } : { ano: meses[sel].ano, mes: meses[sel].mes }
    setSalvando(true)
    setMsg(null)
    try {
      const r = await salvarMesFinanceiro(alvo.ano, alvo.mes, payload)
      if (!r.ok) { setMsg({ tipo: 'erro', texto: r.erro }); return }
      setMsg({ tipo: 'ok', texto: `${r.gravados} valores salvos em ${NOMES_MES[alvo.mes - 1]}/${alvo.ano}.` })
      router.refresh()
    } finally {
      setSalvando(false)
    }
  }

  const tituloMes = sel === 'novo' ? `${NOMES_MES[novoMes - 1]}/${novoAno}` : `${meses[sel].nome}/${meses[sel].ano}`

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
      <p className="text-sm text-gray-500 mb-4">Escolha um mês (ou crie um novo) e preencha os saldos. Campo em branco fica como &quot;sem extrato&quot;.</p>

      {/* Seletor de mês */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {meses.map((m, idx) => (
          <button key={idx} onClick={() => setSel(idx)}
            className={`px-3 py-1.5 text-sm font-medium rounded-full border transition-all ${
              sel === idx ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
            }`}>
            {m.abrev}/{m.ano}
          </button>
        ))}
        <button onClick={() => setSel('novo')}
          className={`px-3 py-1.5 text-sm font-semibold rounded-full border transition-all ${
            sel === 'novo' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-blue-700 border-blue-200 hover:bg-blue-50'
          }`}>
          ➕ Novo mês
        </button>
      </div>

      {sel === 'novo' && (
        <div className="flex items-center gap-3 mb-4 bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
          <label className="text-sm text-gray-700">Mês:</label>
          <select value={novoMes} onChange={e => setNovoMes(Number(e.target.value))} className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm">
            {NOMES_MES.map((n, idx) => <option key={idx} value={idx + 1}>{n}</option>)}
          </select>
          <label className="text-sm text-gray-700">Ano:</label>
          <input type="number" value={novoAno} onChange={e => setNovoAno(Number(e.target.value))} className="w-24 border border-gray-300 rounded-lg px-2 py-1.5 text-sm" />
          <span className="text-xs text-blue-700">Valores pré-preenchidos com o último mês — ajuste o que mudou.</span>
        </div>
      )}

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
        <span className="text-sm text-gray-600">Salvando em <b>{tituloMes}</b></span>
        <button onClick={salvar} disabled={salvando}
          className="bg-green-600 text-white px-6 py-2 rounded-lg text-sm font-semibold hover:bg-green-700 transition-colors disabled:opacity-60">
          {salvando ? 'Salvando…' : 'Salvar mês'}
        </button>
      </div>
    </div>
  )
}

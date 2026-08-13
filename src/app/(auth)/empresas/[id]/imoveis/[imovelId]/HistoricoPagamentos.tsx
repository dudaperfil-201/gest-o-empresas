'use client'

// Histórico de pagamentos do imóvel, com EDIÇÃO por registro (corrige dado lançado
// errado: status, valor pago, valor original, data do pagamento e observação) e opção
// de excluir um lançamento feito por engano. EXTRAS e DESCONTOS também são editáveis
// aqui (descrição, valor e MÊS) — assim um extra pago com atraso pode ser movido para o
// mês em que foi pago (é o mês/ano do item que define onde ele conta no relatório).

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  editarPagamento, excluirPagamento,
  editarExtra, removerExtra, adicionarExtra,
  editarDesconto, removerDesconto, adicionarDesconto,
} from '@/app/actions/empresas'

type Item = { id: string; ano: number; mes: number; descricao: string | null; valor: number }
type Tipo = 'extra' | 'desconto'
export type PagamentoRow = {
  id: string
  ano: number
  mes: number
  status: string
  valor_original: number | null
  valor_pago: number | null
  data_pagamento: string | null
  observacao: string | null
  extras: Item[]
  descontos: Item[]
}

const brl = (n: number) => 'R$ ' + n.toLocaleString('pt-BR', { minimumFractionDigits: 2 })
const soma = (itens: Item[]) => itens.reduce((s, e) => s + (e.valor ?? 0), 0)

// texto do input → número (aceita vírgula); vazio => null
function toNum(s: string): number | null {
  const c = (s ?? '').trim().replace(/\s/g, '')
  if (!c) return null
  const n = parseFloat(c.includes(',') ? c.replace(/\./g, '').replace(',', '.') : c)
  return Number.isFinite(n) ? n : null
}
const paraTexto = (n: number | null) => (n != null ? String(n).replace('.', ',') : '')
const mesStr = (ano: number, mes: number) => `${ano}-${String(mes).padStart(2, '0')}`

export default function HistoricoPagamentos({ empresaId, imovelId, pagamentos }: {
  empresaId: string; imovelId: string; pagamentos: PagamentoRow[]
}) {
  const router = useRouter()
  const [editando, setEditando] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  // Campos do ALUGUEL em edição
  const [status, setStatus] = useState('pago')
  const [valorOriginal, setValorOriginal] = useState('')
  const [valorPago, setValorPago] = useState('')
  const [dataPagamento, setDataPagamento] = useState('')
  const [observacao, setObservacao] = useState('')

  // Edição de um EXTRA/DESCONTO (por id) — descrição, valor e mês.
  const [itemEditId, setItemEditId] = useState<string | null>(null)
  const [itemTipo, setItemTipo] = useState<Tipo>('extra')
  const [itDesc, setItDesc] = useState('')
  const [itValor, setItValor] = useState('')
  const [itMes, setItMes] = useState('') // "AAAA-MM"

  // Adição de um novo item: chave `${ano}_${mes}_${tipo}` do bloco onde está adicionando.
  const [addKey, setAddKey] = useState<string | null>(null)
  const [addDesc, setAddDesc] = useState('')
  const [addValor, setAddValor] = useState('')

  function abrirEdicao(p: PagamentoRow) {
    setEditando(p.id)
    setErro(null)
    setStatus(p.status || 'pago')
    setValorOriginal(paraTexto(p.valor_original))
    setValorPago(paraTexto(p.valor_pago))
    setDataPagamento(p.data_pagamento || '')
    setObservacao(p.observacao || '')
  }

  async function salvar(p: PagamentoRow) {
    setSalvando(true); setErro(null)
    try {
      const r = await editarPagamento(p.id, empresaId, imovelId, {
        status,
        valor_pago: toNum(valorPago),
        valor_original: toNum(valorOriginal),
        data_pagamento: dataPagamento || null,
        observacao: observacao || null,
      })
      if (!r.ok) { setErro(r.erro); return }
      setEditando(null)
      router.refresh()
    } finally {
      setSalvando(false)
    }
  }

  async function excluir(p: PagamentoRow) {
    const nomeMes = new Date(p.ano, p.mes - 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
    if (!confirm(`Excluir o registro de ${nomeMes}? Esta ação não pode ser desfeita.`)) return
    setSalvando(true); setErro(null)
    try {
      const r = await excluirPagamento(p.id, empresaId, imovelId)
      if (!r.ok) { setErro(r.erro); return }
      setEditando(null)
      router.refresh()
    } finally {
      setSalvando(false)
    }
  }

  // ── EXTRAS / DESCONTOS ──
  function abrirItem(tipo: Tipo, it: Item) {
    setItemTipo(tipo); setItemEditId(it.id); setErro(null)
    setItDesc(it.descricao ?? ''); setItValor(paraTexto(it.valor)); setItMes(mesStr(it.ano, it.mes))
  }
  async function salvarItem(it: Item) {
    const [ano, mes] = itMes.split('-').map(Number)
    if (!ano || !mes) { setErro('Escolha o mês do item.'); return }
    setSalvando(true); setErro(null)
    try {
      const fn = itemTipo === 'extra' ? editarExtra : editarDesconto
      const r = await fn(it.id, empresaId, { descricao: itDesc || null, valor: toNum(itValor) ?? 0, mes, ano })
      if (!r.ok) { setErro(r.erro ?? 'Erro ao salvar o item.'); return }
      setItemEditId(null)
      router.refresh()
    } finally {
      setSalvando(false)
    }
  }
  async function excluirItem(tipo: Tipo, id: string) {
    if (!confirm('Excluir este item?')) return
    setSalvando(true); setErro(null)
    try {
      await (tipo === 'extra' ? removerExtra : removerDesconto)(id, empresaId)
      router.refresh()
    } finally {
      setSalvando(false)
    }
  }
  async function salvarAdd(tipo: Tipo, ano: number, mes: number) {
    const valor = toNum(addValor) ?? 0
    if (valor <= 0) { setErro('Informe um valor.'); return }
    setSalvando(true); setErro(null)
    try {
      await (tipo === 'extra' ? adicionarExtra : adicionarDesconto)(imovelId, empresaId, addDesc, valor, mes, ano)
      setAddKey(null); setAddDesc(''); setAddValor('')
      router.refresh()
    } finally {
      setSalvando(false)
    }
  }

  // Renderiza a lista editável de extras OU descontos de um mês. Classes de cor são
  // LITERAIS (o Tailwind não gera CSS de classe montada por template string).
  function blocoItens(tipo: Tipo, itens: Item[], ano: number, mes: number) {
    const c = tipo === 'extra'
      ? { txt: 'text-indigo-600', txtHover: 'hover:text-indigo-800', btn: 'bg-indigo-600 hover:bg-indigo-700' }
      : { txt: 'text-rose-600', txtHover: 'hover:text-rose-800', btn: 'bg-rose-600 hover:bg-rose-700' }
    const sinal = tipo === 'extra' ? '+' : '−'
    const singular = tipo === 'extra' ? 'Extra' : 'Desconto'
    const k = `${ano}_${mes}_${tipo}`
    return (
      <div className="mt-1">
        {itens.map(it => (
          itemEditId === it.id && itemTipo === tipo ? (
            <div key={it.id} className="flex flex-wrap items-center gap-1.5 my-1 bg-gray-50 rounded-lg p-2">
              <input value={itDesc} onChange={e => setItDesc(e.target.value)} placeholder="Descrição"
                className="flex-1 min-w-[8rem] px-2 py-1 border border-gray-300 rounded text-xs" />
              <input value={itValor} onChange={e => setItValor(e.target.value)} inputMode="decimal" placeholder="0,00"
                className="w-24 px-2 py-1 border border-gray-300 rounded text-xs text-right" />
              <input type="month" value={itMes} onChange={e => setItMes(e.target.value)}
                className="px-2 py-1 border border-gray-300 rounded text-xs" title="Mês em que o item conta" />
              <button onClick={() => salvarItem(it)} disabled={salvando}
                className={`text-xs font-semibold text-white ${c.btn} px-2 py-1 rounded disabled:opacity-50`}>Salvar</button>
              <button onClick={() => setItemEditId(null)} disabled={salvando}
                className="text-xs text-gray-500 px-2 py-1 rounded hover:bg-gray-100">Cancelar</button>
            </div>
          ) : (
            <div key={it.id} className="group/item flex items-center gap-2 text-xs py-0.5">
              <span className={`${c.txt} font-medium`}>{sinal} {it.descricao || singular}: {brl(it.valor ?? 0)}</span>
              <button onClick={() => abrirItem(tipo, it)}
                className={`opacity-0 group-hover/item:opacity-100 ${c.txt} ${c.txtHover} transition-opacity`}>editar</button>
              <button onClick={() => excluirItem(tipo, it.id)}
                className="opacity-0 group-hover/item:opacity-100 text-red-500 hover:text-red-700 transition-opacity">excluir</button>
            </div>
          )
        ))}
        {addKey === k ? (
          <div className="flex flex-wrap items-center gap-1.5 my-1 bg-gray-50 rounded-lg p-2">
            <input value={addDesc} onChange={e => setAddDesc(e.target.value)} placeholder={tipo === 'extra' ? 'Ex: energia' : 'Ex: cortesia'}
              className="flex-1 min-w-[8rem] px-2 py-1 border border-gray-300 rounded text-xs" autoFocus />
            <input value={addValor} onChange={e => setAddValor(e.target.value)} inputMode="decimal" placeholder="0,00"
              className="w-24 px-2 py-1 border border-gray-300 rounded text-xs text-right" />
            <button onClick={() => salvarAdd(tipo, ano, mes)} disabled={salvando}
              className={`text-xs font-semibold text-white ${c.btn} px-2 py-1 rounded disabled:opacity-50`}>Adicionar</button>
            <button onClick={() => { setAddKey(null); setAddDesc(''); setAddValor('') }} disabled={salvando}
              className="text-xs text-gray-500 px-2 py-1 rounded hover:bg-gray-100">Cancelar</button>
          </div>
        ) : (
          <button onClick={() => { setAddKey(k); setAddDesc(''); setAddValor(''); setErro(null) }}
            className={`text-xs font-medium ${c.txt} ${c.txtHover}`}>+ {singular}</button>
        )}
      </div>
    )
  }

  if (pagamentos.length === 0) {
    return <p className="text-sm text-gray-400 text-center py-4">Nenhum pagamento registrado.</p>
  }

  return (
    <div className="space-y-2">
      {erro && <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{erro}</div>}
      {pagamentos.map(p => {
        const statusColor = p.status === 'pago' ? 'bg-green-100 text-green-700' : p.status === 'atrasado' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
        const nomeMes = new Date(p.ano, p.mes - 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
        const emEdicao = editando === p.id

        if (emEdicao) {
          return (
            <div key={p.id} className="border border-blue-200 bg-blue-50/40 rounded-lg p-3">
              <p className="text-sm font-semibold text-gray-900 capitalize mb-2">{nomeMes}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="text-xs text-gray-600">
                  Status
                  <select value={status} onChange={e => setStatus(e.target.value)}
                    className="mt-0.5 w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm bg-white">
                    <option value="pago">Pago</option>
                    <option value="atrasado">Atrasado</option>
                    <option value="pendente">Pendente</option>
                  </select>
                </label>
                <label className="text-xs text-gray-600">
                  Data do pagamento
                  <input type="date" value={dataPagamento} onChange={e => setDataPagamento(e.target.value)}
                    className="mt-0.5 w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm" />
                </label>
                <label className="text-xs text-gray-600">
                  Valor original (aluguel)
                  <input type="text" inputMode="decimal" value={valorOriginal} onChange={e => setValorOriginal(e.target.value)}
                    placeholder="0,00" className="mt-0.5 w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm text-right" />
                </label>
                <label className="text-xs text-gray-600">
                  Valor pago (com juros, se houver)
                  <input type="text" inputMode="decimal" value={valorPago} onChange={e => setValorPago(e.target.value)}
                    placeholder="0,00" className="mt-0.5 w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm text-right" />
                </label>
                <label className="text-xs text-gray-600 sm:col-span-2">
                  Observação (opcional)
                  <input type="text" value={observacao} onChange={e => setObservacao(e.target.value)}
                    className="mt-0.5 w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm" />
                </label>
              </div>
              <div className="flex items-center justify-between mt-3">
                <button onClick={() => excluir(p)} disabled={salvando}
                  className="text-xs font-medium text-red-600 hover:text-red-800 disabled:opacity-50">🗑 Excluir registro</button>
                <div className="flex items-center gap-2">
                  <button onClick={() => setEditando(null)} disabled={salvando}
                    className="text-sm text-gray-500 px-3 py-1.5 rounded-lg hover:bg-gray-100">Cancelar</button>
                  <button onClick={() => salvar(p)} disabled={salvando}
                    className="text-sm font-semibold text-white bg-green-600 px-4 py-1.5 rounded-lg hover:bg-green-700 disabled:opacity-60">
                    {salvando ? 'Salvando…' : 'Salvar'}
                  </button>
                </div>
              </div>
            </div>
          )
        }

        return (
          <div key={p.id} className="py-2 border-b border-gray-50 last:border-0 group">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900 capitalize">{nomeMes}</p>
                {p.data_pagamento && (
                  <p className="text-xs text-gray-400">Pago em {new Date(p.data_pagamento + 'T12:00:00').toLocaleDateString('pt-BR')}</p>
                )}
                {p.observacao && <p className="text-xs text-gray-400">{p.observacao}</p>}
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">{brl(p.valor_pago ?? p.valor_original ?? 0)}</p>
                  {p.valor_pago != null && p.valor_original != null && p.valor_pago > p.valor_original && (
                    <p className="text-xs text-red-500">+{brl(p.valor_pago - p.valor_original)} juros</p>
                  )}
                </div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColor}`}>
                  {p.status === 'pago' ? 'Pago' : p.status === 'atrasado' ? 'Atrasado' : 'Pendente'}
                </span>
                <button onClick={() => abrirEdicao(p)}
                  className="text-xs font-medium text-blue-600 hover:text-blue-800 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Editar registro">✏️ Editar</button>
              </div>
            </div>
            {/* Extras e descontos deste mês — editáveis */}
            <div className="pl-1 mt-1">
              {blocoItens('extra', p.extras, p.ano, p.mes)}
              {blocoItens('desconto', p.descontos, p.ano, p.mes)}
            </div>
          </div>
        )
      })}
    </div>
  )
}

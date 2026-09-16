'use client'

// Card de um INQUILINO ANTERIOR (já saiu da sala). Fica editável mesmo fora da sala:
//  - Editar os dados dele (nome/telefone/e-mail/datas), sem mexer no imóvel.
//  - Registrar ACERTOS/RESCISÕES (multas, acerto da entrega da sala) que ele paga depois
//    de sair. Cada acerto é um EXTRA do imóvel vinculado a ele → já conta no relatório do
//    mês (regime de caixa) e fica no histórico da sala.

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { atualizarInquilino, adicionarExtra, editarExtra, removerExtra, type AcertoInquilino } from '@/app/actions/empresas'

type Anterior = {
  id: string
  nome: string
  telefone: string | null
  email: string | null
  data_inicio: string | null
  data_saida: string | null
}

const brl = (n: number) => 'R$ ' + (n ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })
const dataBR = (d: string | null) => (d ? new Date(d + 'T12:00:00').toLocaleDateString('pt-BR') : '')
const mesNome = (ano: number, mes: number) => new Date(ano, mes - 1).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })
const mesInput = (ano: number, mes: number) => `${ano}-${String(mes).padStart(2, '0')}`
function toNum(s: string): number | null {
  const c = (s ?? '').trim().replace(/\s/g, '')
  if (!c) return null
  const n = parseFloat(c.includes(',') ? c.replace(/\./g, '').replace(',', '.') : c)
  return Number.isFinite(n) ? n : null
}

export default function InquilinoAnterior({ anterior, empresaId, imovelId, acertos }: {
  anterior: Anterior
  empresaId: string
  imovelId: string
  acertos: AcertoInquilino[]
}) {
  const router = useRouter()
  const [aberto, setAberto] = useState(false)
  const [editando, setEditando] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  // Form de edição dos dados do inquilino.
  const [nome, setNome] = useState(anterior.nome)
  const [telefone, setTelefone] = useState(anterior.telefone ?? '')
  const [email, setEmail] = useState(anterior.email ?? '')
  const [dataInicio, setDataInicio] = useState(anterior.data_inicio ?? '')
  const [dataSaida, setDataSaida] = useState(anterior.data_saida ?? '')

  // Form de novo acerto.
  const hoje = new Date()
  const [addDesc, setAddDesc] = useState('')
  const [addValor, setAddValor] = useState('')
  const [addMes, setAddMes] = useState(mesInput(hoje.getFullYear(), hoje.getMonth() + 1))
  const [addAberto, setAddAberto] = useState(false)

  // Edição de um acerto existente.
  const [editId, setEditId] = useState<string | null>(null)
  const [edDesc, setEdDesc] = useState('')
  const [edValor, setEdValor] = useState('')
  const [edMes, setEdMes] = useState('')

  const totalAcertos = acertos.reduce((s, a) => s + (a.valor ?? 0), 0)

  async function salvarDados() {
    setSalvando(true); setErro(null)
    try {
      const r = await atualizarInquilino(anterior.id, empresaId, imovelId, {
        nome, telefone, email, data_inicio: dataInicio || null, data_saida: dataSaida || null,
      })
      if (!r.ok) { setErro(r.erro); return }
      setEditando(false)
      router.refresh()
    } finally { setSalvando(false) }
  }

  async function adicionarAcerto() {
    const valor = toNum(addValor) ?? 0
    if (valor <= 0) { setErro('Informe o valor do acerto.'); return }
    const [ano, mes] = addMes.split('-').map(Number)
    if (!ano || !mes) { setErro('Escolha o mês do acerto.'); return }
    setSalvando(true); setErro(null)
    try {
      await adicionarExtra(imovelId, empresaId, addDesc, valor, mes, ano, anterior.id)
      setAddDesc(''); setAddValor(''); setAddAberto(false)
      router.refresh()
    } finally { setSalvando(false) }
  }

  function abrirEdicaoAcerto(a: AcertoInquilino) {
    setEditId(a.id); setErro(null)
    setEdDesc(a.descricao ?? ''); setEdValor(String(a.valor).replace('.', ',')); setEdMes(mesInput(a.ano, a.mes))
  }
  async function salvarAcerto(id: string) {
    const [ano, mes] = edMes.split('-').map(Number)
    if (!ano || !mes) { setErro('Escolha o mês do acerto.'); return }
    setSalvando(true); setErro(null)
    try {
      const r = await editarExtra(id, empresaId, { descricao: edDesc || null, valor: toNum(edValor) ?? 0, mes, ano })
      if (!r.ok) { setErro(r.erro ?? 'Erro ao salvar.'); return }
      setEditId(null)
      router.refresh()
    } finally { setSalvando(false) }
  }
  async function excluirAcerto(id: string) {
    if (!confirm('Excluir este acerto?')) return
    setSalvando(true); setErro(null)
    try {
      await removerExtra(id, empresaId)
      router.refresh()
    } finally { setSalvando(false) }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg px-3 py-2">
      {/* Linha principal */}
      {!editando ? (
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-800 truncate">{anterior.nome}</p>
            {anterior.telefone && <p className="text-xs text-gray-500">Tel: {anterior.telefone}</p>}
            {anterior.email && <p className="text-xs text-gray-500 truncate">{anterior.email}</p>}
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <div className="text-right text-xs text-gray-500">
              {anterior.data_inicio && <div>Entrou: {dataBR(anterior.data_inicio)}</div>}
              {anterior.data_saida && <div>Saiu: {dataBR(anterior.data_saida)}</div>}
            </div>
            <button onClick={() => setEditando(true)} className="text-xs font-medium text-blue-600 hover:underline">Editar</button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <label className="text-xs text-gray-600">Nome
              <input value={nome} onChange={e => setNome(e.target.value)}
                className="mt-0.5 w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm" /></label>
            <label className="text-xs text-gray-600">Telefone
              <input value={telefone} onChange={e => setTelefone(e.target.value)}
                className="mt-0.5 w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm" /></label>
            <label className="text-xs text-gray-600 sm:col-span-2">E-mail
              <input value={email} onChange={e => setEmail(e.target.value)} type="email"
                className="mt-0.5 w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm" /></label>
            <label className="text-xs text-gray-600">Entrou (início)
              <input value={dataInicio} onChange={e => setDataInicio(e.target.value)} type="date"
                className="mt-0.5 w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm" /></label>
            <label className="text-xs text-gray-600">Saiu (saída)
              <input value={dataSaida} onChange={e => setDataSaida(e.target.value)} type="date"
                className="mt-0.5 w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm" /></label>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={salvarDados} disabled={salvando}
              className="text-sm font-semibold text-white bg-blue-600 px-3 py-1.5 rounded-lg hover:bg-blue-700 disabled:opacity-60">
              {salvando ? 'Salvando…' : 'Salvar'}</button>
            <button onClick={() => { setEditando(false); setErro(null); setNome(anterior.nome); setTelefone(anterior.telefone ?? ''); setEmail(anterior.email ?? ''); setDataInicio(anterior.data_inicio ?? ''); setDataSaida(anterior.data_saida ?? '') }}
              disabled={salvando} className="text-sm text-gray-500 px-3 py-1.5 rounded-lg hover:bg-gray-100">Cancelar</button>
          </div>
        </div>
      )}

      {/* Botão para abrir/fechar os acertos */}
      <button onClick={() => setAberto(v => !v)} className="mt-2 text-xs font-medium text-amber-700 hover:text-amber-900">
        {aberto ? '▾' : '▸'} Acertos e rescisões{acertos.length > 0 ? ` (${acertos.length} · ${brl(totalAcertos)})` : ''}
      </button>

      {aberto && (
        <div className="mt-2 border-t border-gray-100 pt-2 space-y-1.5">
          <p className="text-[11px] text-gray-400">Rescisões, multas e acertos pagos por ele. Entram no relatório do mês escolhido e no histórico da sala.</p>
          {erro && <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-2 py-1.5">{erro}</div>}

          {acertos.length === 0 && <p className="text-xs text-gray-400">Nenhum acerto registrado.</p>}
          {acertos.map(a => (
            editId === a.id ? (
              <div key={a.id} className="flex flex-wrap items-center gap-1.5 bg-amber-50/60 rounded-lg p-2">
                <input value={edDesc} onChange={e => setEdDesc(e.target.value)} placeholder="Descrição (ex: multa rescisória)"
                  className="flex-1 min-w-[8rem] px-2 py-1 border border-gray-300 rounded text-xs" />
                <input value={edValor} onChange={e => setEdValor(e.target.value)} inputMode="decimal" placeholder="0,00"
                  className="w-24 px-2 py-1 border border-gray-300 rounded text-xs text-right" />
                <input type="month" value={edMes} onChange={e => setEdMes(e.target.value)}
                  className="px-2 py-1 border border-gray-300 rounded text-xs" title="Mês em que conta no relatório" />
                <button onClick={() => salvarAcerto(a.id)} disabled={salvando}
                  className="text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 px-2 py-1 rounded disabled:opacity-50">Salvar</button>
                <button onClick={() => setEditId(null)} disabled={salvando}
                  className="text-xs text-gray-500 px-2 py-1 rounded hover:bg-gray-100">Cancelar</button>
              </div>
            ) : (
              <div key={a.id} className="group/ac flex items-center gap-2 text-xs py-0.5">
                <span className="text-gray-400 w-16 shrink-0 capitalize">{mesNome(a.ano, a.mes)}</span>
                <span className="text-amber-700 font-medium">{a.descricao || 'Acerto'}: {brl(a.valor ?? 0)}</span>
                <button onClick={() => abrirEdicaoAcerto(a)}
                  className="opacity-0 group-hover/ac:opacity-100 text-amber-700 hover:text-amber-900 transition-opacity">editar</button>
                <button onClick={() => excluirAcerto(a.id)}
                  className="opacity-0 group-hover/ac:opacity-100 text-red-500 hover:text-red-700 transition-opacity">excluir</button>
              </div>
            )
          ))}

          {addAberto ? (
            <div className="flex flex-wrap items-center gap-1.5 bg-amber-50/60 rounded-lg p-2">
              <input value={addDesc} onChange={e => setAddDesc(e.target.value)} placeholder="Descrição (ex: acerto entrega da sala)"
                className="flex-1 min-w-[8rem] px-2 py-1 border border-gray-300 rounded text-xs" autoFocus />
              <input value={addValor} onChange={e => setAddValor(e.target.value)} inputMode="decimal" placeholder="0,00"
                className="w-24 px-2 py-1 border border-gray-300 rounded text-xs text-right" />
              <input type="month" value={addMes} onChange={e => setAddMes(e.target.value)}
                className="px-2 py-1 border border-gray-300 rounded text-xs" title="Mês em que conta no relatório" />
              <button onClick={adicionarAcerto} disabled={salvando}
                className="text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 px-2 py-1 rounded disabled:opacity-50">Adicionar</button>
              <button onClick={() => { setAddAberto(false); setAddDesc(''); setAddValor(''); setErro(null) }} disabled={salvando}
                className="text-xs text-gray-500 px-2 py-1 rounded hover:bg-gray-100">Cancelar</button>
            </div>
          ) : (
            <button onClick={() => { setAddAberto(true); setErro(null) }}
              className="text-xs font-medium text-amber-700 hover:text-amber-900">+ Registrar acerto</button>
          )}
        </div>
      )}
    </div>
  )
}

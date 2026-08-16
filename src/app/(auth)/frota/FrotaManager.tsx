'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { criarVeiculo, editarVeiculo, apagarVeiculo, uploadDocumentoVeiculo, removerDocumentoVeiculo, type Veiculo } from '@/app/actions/veiculos'

type Empresa = { id: string; nome: string }
const brl = (n: number) => 'R$ ' + n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

// IPVA em Santa Catarina (DETRAN-SC): o vencimento (cota única) é pelo DÍGITO FINAL da
// placa → mês. Final 1=jan, 2=fev, ... 9=set, 0=outubro. Retorna o mês (1–12) ou null.
const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']
const ipvaMesDaPlaca = (placa: string | null): number | null => {
  const digs = (placa || '').replace(/\D/g, '')
  if (!digs) return null
  const d = parseInt(digs.slice(-1), 10)
  return d === 0 ? 10 : d
}
// Alerta (card vermelho) no MÊS do IPVA e no mês ANTERIOR (aviso com antecedência).
const mesAtual = new Date().getMonth() + 1
const ipvaProximo = (mes: number | null): boolean => {
  if (mes == null) return false
  const anterior = mes === 1 ? 12 : mes - 1
  return mesAtual === mes || mesAtual === anterior
}
const soDigitos = (s: string) => s.replace(/\D/g, '')
const toInt = (s: string) => { const n = parseInt(soDigitos(s), 10); return Number.isFinite(n) ? n : null }

const vazio = { empresa_id: '', placa: '', marca: '', modelo: '', ano: '', cor: '', renavam: '', km_atual: '', observacoes: '' }

export default function FrotaManager({ veiculos, empresas, documentos }: { veiculos: Veiculo[]; empresas: Empresa[]; documentos: Record<string, string> }) {
  const router = useRouter()
  const [enviandoDoc, setEnviandoDoc] = useState<string | null>(null)
  const [modalAberto, setModalAberto] = useState(false)
  const [editId, setEditId] = useState<string | null>(null) // null = criando
  const [ativo, setAtivo] = useState(true)
  const [f, setF] = useState({ ...vazio })
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const nomeEmpresa = (id: string | null) => empresas.find(e => e.id === id)?.nome ?? null

  function abrirNovo() {
    setEditId(null); setF({ ...vazio }); setAtivo(true); setErro(null); setModalAberto(true)
  }
  function abrirEdicao(v: Veiculo) {
    setEditId(v.id)
    setF({
      empresa_id: v.empresa_id ?? '',
      placa: v.placa ?? '', marca: v.marca ?? '', modelo: v.modelo ?? '',
      ano: v.ano != null ? String(v.ano) : '', cor: v.cor ?? '', renavam: v.renavam ?? '',
      km_atual: v.km_atual != null ? String(v.km_atual) : '', observacoes: v.observacoes ?? '',
    })
    setAtivo(v.ativo); setErro(null); setModalAberto(true)
  }

  async function salvar() {
    setSalvando(true); setErro(null)
    try {
      const dados = {
        empresa_id: f.empresa_id || null,
        placa: f.placa, marca: f.marca, modelo: f.modelo,
        ano: toInt(f.ano), cor: f.cor, renavam: f.renavam,
        km_atual: toInt(f.km_atual), observacoes: f.observacoes,
      }
      const r = editId ? await editarVeiculo(editId, { ...dados, ativo }) : await criarVeiculo(dados)
      if (!r.ok) { setErro(r.erro); return }
      setModalAberto(false)
      router.refresh()
    } finally {
      setSalvando(false)
    }
  }

  async function excluir(v: Veiculo) {
    if (!confirm(`Excluir o veículo ${v.placa || v.modelo || ''}? Esta ação não pode ser desfeita.`)) return
    setSalvando(true)
    try {
      const r = await apagarVeiculo(v.id)
      if (!r.ok) { setErro(r.erro); return }
      router.refresh()
    } finally {
      setSalvando(false)
    }
  }

  async function enviarDoc(veiculoId: string, file: File) {
    setEnviandoDoc(veiculoId); setErro(null)
    try {
      const fd = new FormData()
      fd.append('veiculo_id', veiculoId)
      fd.append('arquivo', file)
      const r = await uploadDocumentoVeiculo(fd)
      if (!r.ok) { setErro(r.erro); return }
      router.refresh()
    } finally {
      setEnviandoDoc(null)
    }
  }
  async function removerDoc(veiculoId: string) {
    if (!confirm('Remover o documento deste veículo?')) return
    setEnviandoDoc(veiculoId); setErro(null)
    try {
      const r = await removerDocumentoVeiculo(veiculoId)
      if (!r.ok) { setErro(r.erro); return }
      router.refresh()
    } finally {
      setEnviandoDoc(null)
    }
  }

  const set = (k: keyof typeof vazio, v: string) => setF(prev => ({ ...prev, [k]: v }))

  return (
    <div>
      {erro && <div className="mb-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{erro}</div>}

      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-600"><strong>{veiculos.length}</strong> veículo{veiculos.length === 1 ? '' : 's'} cadastrado{veiculos.length === 1 ? '' : 's'}</p>
        <button onClick={abrirNovo} className="bg-amber-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-amber-700 transition-colors">
          + Novo veículo
        </button>
      </div>

      {veiculos.length === 0 ? (
        <div className="bg-white border border-dashed border-gray-300 rounded-xl p-10 text-center">
          <p className="text-4xl mb-2">🚗</p>
          <p className="text-gray-500">Nenhum veículo cadastrado ainda.</p>
          <button onClick={abrirNovo} className="mt-3 text-amber-700 font-medium hover:text-amber-800">+ Cadastrar o primeiro</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {veiculos.map(v => {
            const ipvaMes = ipvaMesDaPlaca(v.placa)
            const ipvaAlerta = ipvaProximo(ipvaMes)
            return (
            <div key={v.id} className={`border rounded-xl p-4 group transition-colors ${ipvaAlerta ? 'bg-red-50 border-red-400' : v.ativo ? 'bg-white border-gray-200' : 'bg-white border-gray-200 opacity-60'}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="inline-block font-mono font-bold text-gray-900 bg-gray-100 border border-gray-300 rounded px-2 py-0.5 tracking-wider">
                      {v.placa || '—'}
                    </span>
                    {!v.ativo && <span className="text-[10px] font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">INATIVO</span>}
                  </div>
                  <p className="text-gray-900 font-medium mt-1.5 truncate">{[v.marca, v.modelo].filter(Boolean).join(' ') || 'Sem modelo'}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {[v.ano && `${v.ano}`, v.cor, v.km_atual != null && `${v.km_atual.toLocaleString('pt-BR')} km`].filter(Boolean).join(' · ') || '—'}
                  </p>
                  {ipvaMes != null && (
                    <p className={`text-xs mt-0.5 ${ipvaAlerta ? 'text-red-600 font-bold' : 'text-gray-400'}`}>
                      {ipvaAlerta ? '🚨' : '📅'} IPVA: {MESES[ipvaMes - 1]}{ipvaAlerta ? ' — vence em breve!' : ''}
                    </p>
                  )}
                  {v.fipe_valor != null && (
                    <p className="mt-1.5 text-sm font-bold text-green-700">
                      💵 FIPE {brl(v.fipe_valor)}
                      {v.fipe_ref && <span className="ml-1.5 text-[10px] font-normal text-gray-400">ref. {v.fipe_ref}</span>}
                    </p>
                  )}
                  {nomeEmpresa(v.empresa_id) && <p className="text-xs text-blue-600 mt-0.5">🏢 {nomeEmpresa(v.empresa_id)}</p>}
                  {v.renavam && <p className="text-[11px] text-gray-400 mt-0.5">Renavam: {v.renavam}</p>}
                  {v.observacoes && <p className="text-xs text-gray-400 mt-1">{v.observacoes}</p>}
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <button onClick={() => abrirEdicao(v)} className="text-xs font-medium text-blue-600 hover:text-blue-800 opacity-0 group-hover:opacity-100 transition-opacity">✏️ Editar</button>
                  <button onClick={() => excluir(v)} className="text-xs font-medium text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 transition-opacity">🗑 Excluir</button>
                </div>
              </div>

              {/* Documento do veículo (CRLV) */}
              <div className="mt-3 pt-2 border-t border-gray-100 flex items-center gap-3 text-xs">
                {documentos[v.id] ? (
                  <>
                    <a href={documentos[v.id]} target="_blank" rel="noopener noreferrer" className="text-amber-700 font-medium hover:text-amber-900">📄 Ver documento</a>
                    <label className="text-gray-400 hover:text-gray-600 cursor-pointer">
                      trocar
                      <input type="file" accept="image/*,application/pdf" className="hidden"
                        onChange={e => { const file = e.target.files?.[0]; e.target.value = ''; if (file) enviarDoc(v.id, file) }} />
                    </label>
                    <button onClick={() => removerDoc(v.id)} className="text-red-400 hover:text-red-600">remover</button>
                  </>
                ) : (
                  <label className="flex items-center gap-1 text-gray-400 hover:text-amber-700 cursor-pointer">
                    📎 Anexar documento
                    <input type="file" accept="image/*,application/pdf" className="hidden"
                      onChange={e => { const file = e.target.files?.[0]; e.target.value = ''; if (file) enviarDoc(v.id, file) }} />
                  </label>
                )}
                {enviandoDoc === v.id && <span className="text-gray-400">enviando…</span>}
              </div>
            </div>
            )
          })}
        </div>
      )}

      {/* Modal cadastro/edição */}
      {modalAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => !salvando && setModalAberto(false)}>
          <div className="bg-white rounded-xl p-5 w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h3 className="font-semibold text-gray-900 mb-3">{editId ? 'Editar veículo' : 'Novo veículo'}</h3>
            <div className="grid grid-cols-2 gap-3">
              <label className="text-xs text-gray-600 col-span-2">
                Empresa (dona)
                <select value={f.empresa_id} onChange={e => set('empresa_id', e.target.value)}
                  className="mt-0.5 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white">
                  <option value="">— nenhuma —</option>
                  {empresas.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
                </select>
              </label>
              <label className="text-xs text-gray-600">
                Placa
                <input value={f.placa} onChange={e => set('placa', e.target.value.toUpperCase())} placeholder="ABC1D23"
                  className="mt-0.5 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm uppercase" />
              </label>
              <label className="text-xs text-gray-600">
                Ano
                <input value={f.ano} onChange={e => set('ano', soDigitos(e.target.value).slice(0, 4))} inputMode="numeric" placeholder="2022"
                  className="mt-0.5 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
              </label>
              <label className="text-xs text-gray-600">
                Marca
                <input value={f.marca} onChange={e => set('marca', e.target.value)} placeholder="Ex: Fiat"
                  className="mt-0.5 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
              </label>
              <label className="text-xs text-gray-600">
                Modelo
                <input value={f.modelo} onChange={e => set('modelo', e.target.value)} placeholder="Ex: Strada"
                  className="mt-0.5 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
              </label>
              <label className="text-xs text-gray-600">
                Cor
                <input value={f.cor} onChange={e => set('cor', e.target.value)} placeholder="Ex: Branco"
                  className="mt-0.5 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
              </label>
              <label className="text-xs text-gray-600">
                KM atual
                <input value={f.km_atual} onChange={e => set('km_atual', soDigitos(e.target.value))} inputMode="numeric" placeholder="0"
                  className="mt-0.5 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
              </label>
              <label className="text-xs text-gray-600 col-span-2">
                Renavam
                <input value={f.renavam} onChange={e => set('renavam', e.target.value)} placeholder="Opcional"
                  className="mt-0.5 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
              </label>
              <label className="text-xs text-gray-600 col-span-2">
                Observações
                <input value={f.observacoes} onChange={e => set('observacoes', e.target.value)} placeholder="Opcional"
                  className="mt-0.5 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
              </label>
              {editId && (
                <label className="flex items-center gap-2 text-sm text-gray-700 col-span-2 mt-1">
                  <input type="checkbox" checked={ativo} onChange={e => setAtivo(e.target.checked)} className="accent-amber-600 w-4 h-4" />
                  Veículo ativo (na frota)
                </label>
              )}
            </div>
            <div className="flex items-center justify-end gap-2 mt-4">
              <button onClick={() => setModalAberto(false)} disabled={salvando} className="px-4 py-2 text-sm text-gray-600 rounded-lg hover:bg-gray-100">Cancelar</button>
              <button onClick={salvar} disabled={salvando} className="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-semibold hover:bg-amber-700 disabled:opacity-60">
                {salvando ? 'Salvando…' : editId ? 'Salvar' : '+ Cadastrar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

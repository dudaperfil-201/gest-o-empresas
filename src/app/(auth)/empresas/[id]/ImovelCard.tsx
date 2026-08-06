'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { alternarPagamento, registrarPagamentoComAtraso, adicionarExtra, removerExtra, adicionarDesconto, removerDesconto, type ExtraItem, type DescontoItem } from '@/app/actions/empresas'

type Classificacao = 'otimo' | 'bom' | 'ruim'

interface Props {
  imovel: { id: string; endereco: string; valor_aluguel: number | null }
  empresaId: string
  /** Mês/ano SELECIONADO na tela — todas as ações (PAGOU/ATRASO/EXTRAS) agem nele. */
  mes: number
  ano: number
  pago: boolean
  atrasado: boolean
  disponivel: boolean
  extras?: ExtraItem[]
  descontos?: DescontoItem[]
  classificacao?: Classificacao | null
}

const brl = (v: number) => v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })

// Selo de reputação de pagador.
const SELO: Record<Classificacao, { label: string; cls: string; title: string }> = {
  otimo: { label: 'ÓTIMO', cls: 'bg-green-600', title: 'Sempre pagou em dia' },
  bom: { label: 'BOM', cls: 'bg-orange-500', title: 'Pagou com atraso até 2 vezes' },
  ruim: { label: 'RUIM', cls: 'bg-red-600', title: 'Mais de 2 atrasos ou boleto em aberto' },
}

export default function ImovelCard({ imovel, empresaId, mes, ano, pago, atrasado, disponivel, extras, descontos, classificacao }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [estaPago, setEstaPago] = useState(pago)
  const [estaAtrasado, setEstaAtrasado] = useState(atrasado)
  useEffect(() => setEstaPago(pago), [pago])
  useEffect(() => setEstaAtrasado(atrasado), [atrasado])

  const [modalAberto, setModalAberto] = useState(false)
  const [valorTexto, setValorTexto] = useState('')
  // Mês a que o pagamento atrasado se refere (padrão: o mês SELECIONADO na tela).
  // Formato "AAAA-MM". Reacompanha quando o usuário navega de mês.
  const mesSelStr = `${ano}-${String(mes).padStart(2, '0')}`
  const [mesAtraso, setMesAtraso] = useState(mesSelStr)
  useEffect(() => setMesAtraso(mesSelStr), [mesSelStr])

  // Lista de extras (energia, condomínio, etc.) do imóvel no mês.
  const [itens, setItens] = useState<ExtraItem[]>(extras ?? [])
  useEffect(() => setItens(extras ?? []), [extras])
  const [modalExtras, setModalExtras] = useState(false)
  const [novaDesc, setNovaDesc] = useState('')
  const [novoValor, setNovoValor] = useState('')
  // Mês a que o extra se refere. Começa no mês exibido, mas pode ser um mês passado
  // (extra pago com atraso). Reacompanha a navegação de meses.
  const [extraMes, setExtraMes] = useState(mesSelStr)
  useEffect(() => setExtraMes(mesSelStr), [mesSelStr])

  const totalExtras = itens.reduce((s, i) => s + (i.valor ?? 0), 0)
  const temExtras = itens.length > 0

  // Lista de descontos concedidos ao inquilino no mês (subtraem do total).
  const [itensDesc, setItensDesc] = useState<DescontoItem[]>(descontos ?? [])
  useEffect(() => setItensDesc(descontos ?? []), [descontos])
  const [modalDescontos, setModalDescontos] = useState(false)
  const [novaDescDesc, setNovaDescDesc] = useState('')
  const [novoValorDesc, setNovoValorDesc] = useState('')

  const totalDescontos = itensDesc.reduce((s, i) => s + (i.valor ?? 0), 0)
  const temDescontos = itensDesc.length > 0

  async function handlePagou() {
    setLoading(true)
    setEstaPago(v => !v)
    setEstaAtrasado(false)
    try {
      await alternarPagamento(imovel.id, empresaId, mes, ano)
      router.refresh()
    } catch {
      setEstaPago(pago)
      setEstaAtrasado(atrasado)
    } finally {
      setLoading(false)
    }
  }

  async function confirmarAtraso() {
    const valor = parseFloat(valorTexto.replace(',', '.'))
    if (isNaN(valor) || valor <= 0) return
    const [anoSel, mesSel] = mesAtraso.split('-').map(Number)
    if (!anoSel || !mesSel) return
    setLoading(true)
    try {
      await registrarPagamentoComAtraso(imovel.id, empresaId, valor, mesSel, anoSel)
      // O card reflete o status do MÊS EXIBIDO na tela — só marca "com atraso" aqui
      // se o pagamento for desse mês. Se for de outro mês, aparece ao navegar até ele.
      if (mesSel === mes && anoSel === ano) {
        setEstaAtrasado(true)
        setEstaPago(false)
      }
      setModalAberto(false)
      setValorTexto('')
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  async function handleAdicionarExtra() {
    const valor = parseFloat(novoValor.replace(',', '.'))
    if (isNaN(valor) || valor <= 0) return
    const [anoSel, mesSel] = extraMes.split('-').map(Number)
    if (!anoSel || !mesSel) return
    setLoading(true)
    try {
      const item = await adicionarExtra(imovel.id, empresaId, novaDesc, valor, mesSel, anoSel)
      // O modal lista os extras do MÊS EXIBIDO — só adiciona na lista local se o extra
      // for desse mês. Se for de outro mês (pago atrasado), aparece ao navegar até ele.
      if (item && mesSel === mes && anoSel === ano) setItens(prev => [...prev, item])
      setNovaDesc('')
      setNovoValor('')
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  async function handleRemoverExtra(itemId: string) {
    setLoading(true)
    setItens(prev => prev.filter(i => i.id !== itemId))
    try {
      await removerExtra(itemId, empresaId)
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  async function handleAdicionarDesconto() {
    const valor = parseFloat(novoValorDesc.replace(',', '.'))
    if (isNaN(valor) || valor <= 0) return
    setLoading(true)
    try {
      const item = await adicionarDesconto(imovel.id, empresaId, novaDescDesc, valor, mes, ano)
      if (item) setItensDesc(prev => [...prev, item])
      setNovaDescDesc('')
      setNovoValorDesc('')
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  async function handleRemoverDesconto(itemId: string) {
    setLoading(true)
    setItensDesc(prev => prev.filter(i => i.id !== itemId))
    try {
      await removerDesconto(itemId, empresaId)
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-stretch gap-3">
    <div className={`flex-1 flex items-center justify-between border rounded-xl px-5 py-4 transition-all ${
      disponivel ? 'bg-red-50 border-red-300 hover:border-red-400' : 'bg-white border-gray-200 hover:border-gray-300'
    }`}>
      <Link href={`/empresas/${empresaId}/imoveis/${imovel.id}`} className="flex-1 min-w-0">
        <p className={`font-medium truncate ${disponivel ? 'text-red-700' : 'text-gray-900'}`}>{imovel.endereco}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <p className={`text-sm ${disponivel ? 'text-red-500' : 'text-gray-500'}`}>
            R$ {brl(imovel.valor_aluguel ?? 0)}
          </p>
          {/* Selo de reputação — pequeno, ao lado do valor do aluguel */}
          {!disponivel && classificacao && (
            <span
              title={SELO[classificacao].title}
              className={`shrink-0 text-[9px] leading-none font-bold px-2 py-1 rounded text-white ${SELO[classificacao].cls}`}
            >
              {SELO[classificacao].label}
            </span>
          )}
        </div>
        {temExtras && (
          <div className="mt-0.5 space-y-0.5">
            {itens.map(item => (
              <p key={item.id} className="text-xs text-indigo-600 font-medium truncate">
                + {item.descricao || 'Extra'}: R$ {brl(item.valor ?? 0)}
              </p>
            ))}
          </div>
        )}
        {temDescontos && (
          <div className="mt-0.5 space-y-0.5">
            {itensDesc.map(item => (
              <p key={item.id} className="text-xs text-rose-600 font-medium truncate">
                − {item.descricao || 'Desconto'}: R$ {brl(item.valor ?? 0)}
              </p>
            ))}
          </div>
        )}
      </Link>

      {disponivel ? (
        <span className="ml-4 shrink-0 text-sm font-bold px-5 py-2 rounded-lg text-white bg-red-600">
          DISPONÍVEL
        </span>
      ) : (
        <div className="ml-4 shrink-0 flex flex-wrap items-center gap-2 justify-end">
          {/* Pagou em dia: mostra o "PAGO". Some se o pagamento foi com atraso. */}
          {!estaAtrasado && (
            <button
              onClick={handlePagou}
              disabled={loading}
              className={`text-sm font-semibold px-4 py-2 rounded-lg text-white transition-colors disabled:opacity-60 ${
                estaPago ? 'bg-green-700 hover:bg-green-800' : 'bg-green-600 hover:bg-green-700'
              }`}
            >
              {estaPago ? '✓ PAGO' : 'PAGOU'}
            </button>
          )}
          {/* Pagou com atraso: mostra o "COM ATRASO". Some se já foi pago em dia. */}
          {!estaPago && (
            <button
              onClick={() => setModalAberto(true)}
              disabled={loading}
              className={`text-sm font-semibold px-4 py-2 rounded-lg text-white transition-colors disabled:opacity-60 ${
                estaAtrasado ? 'bg-amber-600 hover:bg-amber-700' : 'bg-amber-500 hover:bg-amber-600'
              }`}
            >
              {estaAtrasado ? '✓ COM ATRASO' : 'PAGOU COM ATRASO'}
            </button>
          )}
          {/* EXTRAS e DESCONTOS: menos importantes → empilhados e menores (metade),
              mesma função de antes. */}
          <div className="flex flex-col gap-1">
            <button
              onClick={() => setModalExtras(true)}
              disabled={loading}
              className={`text-[10px] leading-none font-semibold px-2 py-1 rounded-md text-white transition-colors disabled:opacity-60 ${
                temExtras ? 'bg-indigo-700 hover:bg-indigo-800' : 'bg-indigo-500 hover:bg-indigo-600'
              }`}
            >
              {temExtras ? `✓ EXTRAS (${itens.length})` : 'EXTRAS'}
            </button>
            <button
              onClick={() => setModalDescontos(true)}
              disabled={loading}
              className={`text-[10px] leading-none font-semibold px-2 py-1 rounded-md text-white transition-colors disabled:opacity-60 ${
                temDescontos ? 'bg-rose-700 hover:bg-rose-800' : 'bg-rose-500 hover:bg-rose-600'
              }`}
            >
              {temDescontos ? `✓ DESCONTOS (${itensDesc.length})` : 'DESCONTOS'}
            </button>
          </div>
        </div>
      )}
      </div>

      {modalAberto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => !loading && setModalAberto(false)}
        >
          <div className="bg-white rounded-xl p-5 w-full max-w-sm shadow-xl" onClick={e => e.stopPropagation()}>
            <h3 className="font-semibold text-gray-900">Pagamento com atraso</h3>
            <p className="text-sm text-gray-500 mt-0.5 truncate">{imovel.endereco}</p>
            <p className="text-xs text-gray-400 mt-3">
              Aluguel cadastrado: R$ {brl(imovel.valor_aluguel ?? 0)}
            </p>
            <label className="block text-xs font-medium text-gray-600 mt-3 mb-1">Referente ao mês</label>
            <input
              type="month"
              value={mesAtraso}
              onChange={e => setMesAtraso(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
            <label className="block text-xs font-medium text-gray-600 mt-3 mb-1">Valor pago (com multa)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              autoFocus
              value={valorTexto}
              onChange={e => setValorTexto(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') confirmarAtraso() }}
              placeholder="0,00"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
            <div className="flex gap-2 mt-4">
              <button
                onClick={confirmarAtraso}
                disabled={loading || parseFloat(valorTexto.replace(',', '.')) > 0 === false}
                className="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-semibold hover:bg-amber-700 transition-colors disabled:opacity-60"
              >
                {loading ? 'Salvando...' : 'Confirmar'}
              </button>
              <button
                onClick={() => setModalAberto(false)}
                disabled={loading}
                className="px-4 py-2 border border-gray-300 text-gray-600 rounded-lg text-sm hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {modalExtras && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => !loading && setModalExtras(false)}
        >
          <div className="bg-white rounded-xl p-5 w-full max-w-md shadow-xl" onClick={e => e.stopPropagation()}>
            <h3 className="font-semibold text-gray-900">Extras (além do aluguel)</h3>
            <p className="text-sm text-gray-500 mt-0.5 truncate">{imovel.endereco}</p>
            <p className="text-xs text-gray-400 mt-2">
              Energia, condomínio, etc. Adicione quantos quiser — todos somam no total do mês.
            </p>

            {/* Lista de itens já cadastrados */}
            <div className="mt-4 space-y-1.5">
              {itens.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-3">Nenhum extra cadastrado ainda.</p>
              ) : (
                itens.map(item => (
                  <div key={item.id} className="flex items-center justify-between gap-2 bg-gray-50 rounded-lg px-3 py-2">
                    <span className="text-sm text-gray-700 truncate">{item.descricao || 'Extra'}</span>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-sm font-medium text-gray-900">R$ {brl(item.valor ?? 0)}</span>
                      <button
                        onClick={() => handleRemoverExtra(item.id)}
                        disabled={loading}
                        className="text-red-400 hover:text-red-600 text-sm disabled:opacity-50"
                        title="Remover"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {itens.length > 0 && (
              <div className="flex justify-between items-center mt-2 pt-2 border-t border-gray-100 text-sm">
                <span className="text-gray-500">Total dos extras</span>
                <span className="font-semibold text-indigo-700">R$ {brl(totalExtras)}</span>
              </div>
            )}

            {/* Adicionar novo item */}
            <div className="mt-4 pt-3 border-t border-gray-200">
              <label className="block text-xs font-medium text-gray-600 mb-1">Adicionar extra</label>
              <label className="block text-[11px] text-gray-500 mb-1">Referente ao mês (se pago atrasado, escolha o mês certo)</label>
              <input
                type="month"
                value={extraMes}
                onChange={e => setExtraMes(e.target.value)}
                className="w-full mb-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              {extraMes !== mesSelStr && (
                <p className="text-[11px] text-amber-600 mb-2">
                  ⚠️ Este extra será lançado em {(() => { const [a, m] = extraMes.split('-').map(Number); return new Date(a, m - 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }) })()}, não no mês exibido.
                </p>
              )}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={novaDesc}
                  onChange={e => setNovaDesc(e.target.value)}
                  placeholder="Descrição (ex: energia)"
                  className="flex-1 min-w-0 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={novoValor}
                  onChange={e => setNovoValor(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleAdicionarExtra() }}
                  placeholder="R$"
                  className="w-24 shrink-0 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  onClick={handleAdicionarExtra}
                  disabled={loading || parseFloat(novoValor.replace(',', '.')) > 0 === false}
                  className="shrink-0 px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-60"
                >
                  +
                </button>
              </div>
            </div>

            <div className="flex justify-end mt-4">
              <button
                onClick={() => setModalExtras(false)}
                disabled={loading}
                className="px-4 py-2 border border-gray-300 text-gray-600 rounded-lg text-sm hover:bg-gray-50 transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {modalDescontos && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => !loading && setModalDescontos(false)}
        >
          <div className="bg-white rounded-xl p-5 w-full max-w-md shadow-xl" onClick={e => e.stopPropagation()}>
            <h3 className="font-semibold text-gray-900">Descontos concedidos</h3>
            <p className="text-sm text-gray-500 mt-0.5 truncate">{imovel.endereco}</p>
            <p className="text-xs text-gray-400 mt-2">
              Descontos dados ao inquilino. Adicione quantos quiser — todos subtraem do total do mês.
            </p>

            {/* Lista de descontos já cadastrados */}
            <div className="mt-4 space-y-1.5">
              {itensDesc.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-3">Nenhum desconto cadastrado ainda.</p>
              ) : (
                itensDesc.map(item => (
                  <div key={item.id} className="flex items-center justify-between gap-2 bg-rose-50 rounded-lg px-3 py-2">
                    <span className="text-sm text-gray-700 truncate">{item.descricao || 'Desconto'}</span>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-sm font-medium text-rose-700">− R$ {brl(item.valor ?? 0)}</span>
                      <button
                        onClick={() => handleRemoverDesconto(item.id)}
                        disabled={loading}
                        className="text-red-400 hover:text-red-600 text-sm disabled:opacity-50"
                        title="Remover"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {itensDesc.length > 0 && (
              <div className="flex justify-between items-center mt-2 pt-2 border-t border-gray-100 text-sm">
                <span className="text-gray-500">Total dos descontos</span>
                <span className="font-semibold text-rose-700">− R$ {brl(totalDescontos)}</span>
              </div>
            )}

            {/* Adicionar novo desconto */}
            <div className="mt-4 pt-3 border-t border-gray-200">
              <label className="block text-xs font-medium text-gray-600 mb-1">Adicionar desconto</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={novaDescDesc}
                  onChange={e => setNovaDescDesc(e.target.value)}
                  placeholder="Descrição (ex: cortesia)"
                  className="flex-1 min-w-0 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={novoValorDesc}
                  onChange={e => setNovoValorDesc(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleAdicionarDesconto() }}
                  placeholder="R$"
                  className="w-24 shrink-0 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
                <button
                  onClick={handleAdicionarDesconto}
                  disabled={loading || parseFloat(novoValorDesc.replace(',', '.')) > 0 === false}
                  className="shrink-0 px-3 py-2 bg-rose-600 text-white rounded-lg text-sm font-semibold hover:bg-rose-700 transition-colors disabled:opacity-60"
                >
                  +
                </button>
              </div>
            </div>

            <div className="flex justify-end mt-4">
              <button
                onClick={() => setModalDescontos(false)}
                disabled={loading}
                className="px-4 py-2 border border-gray-300 text-gray-600 rounded-lg text-sm hover:bg-gray-50 transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

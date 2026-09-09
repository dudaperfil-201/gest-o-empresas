'use client'

import { useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { salvarMesFinanceiro, importarSaldoDiarioAction, importarExtratoPdfAction, type ItemMes } from '@/app/actions/financeiro'

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
  const [importando, setImportando] = useState(false)
  const [destaque, setDestaque] = useState<Set<string>>(new Set())
  const [msg, setMsg] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const pdfRef = useRef<HTMLInputElement>(null)
  // Conta escolhida para o extrato PDF, no formato "slug|banco". Começa no Itaú Serginho se existir.
  const contasPdf = useMemo(() => {
    const seen = new Set<string>()
    const out: { valor: string; rotulo: string }[] = []
    for (const it of itens) {
      const v = `${it.slug}|${it.banco}`
      if (seen.has(v)) continue
      seen.add(v)
      out.push({ valor: v, rotulo: `${it.carteiraNome} · ${it.banco}` })
    }
    return out
  }, [itens])
  const [contaPdf, setContaPdf] = useState<string>(() =>
    contasPdf.find(c => c.valor === 'itau-serginho|Itaú')?.valor ?? contasPdf[0]?.valor ?? '',
  )

  // Valores base de um mês: mês existente carrega os dele; mês NOVO começa ZERADO.
  const baseDoMes = (idx: number, ehNovo: boolean) => {
    const nv: Record<string, string> = {}
    const nvm: Record<string, string> = {}
    for (const it of itens) {
      const key = chave(it)
      if (ehNovo) { nv[key] = ''; nvm[key] = '' }
      else {
        const v = it.valores[idx]
        nv[key] = v != null ? String(v) : ''
        const vm = it.valoresMoeda[idx]
        nvm[key] = vm != null ? String(vm) : ''
      }
    }
    return { nv, nvm }
  }

  // Quando a seleção muda, recarrega os valores base daquele mês.
  if (iniciado !== sel) {
    const { nv, nvm } = baseDoMes(sel, atual.novo)
    setValores(nv)
    setValoresMoeda(nvm)
    setDestaque(new Set())
    setIniciado(sel)
  }

  // Importa a planilha "Saldo Diário": lê o último mês fechado, preenche os saldos em
  // aberto e JÁ SALVA automaticamente (só os que estavam vazios — não toca no resto).
  async function importar(file: File) {
    setImportando(true)
    setMsg(null)
    try {
      const fd = new FormData()
      fd.append('arquivo', file)
      const r = await importarSaldoDiarioAction(fd)
      if (!r.ok) { setMsg({ tipo: 'erro', texto: r.erro }); return }
      const { ano, mes, itens: importados, dataFecho, parcial, ignorados } = r.resultado

      const idx = navMeses.findIndex(m => m.ano === ano && m.mes === mes)
      if (idx < 0) {
        setMsg({ tipo: 'erro', texto: `A planilha trouxe ${String(mes).padStart(2, '0')}/${ano}, mas esse mês não está na navegação. Lance o mês anterior primeiro.` })
        return
      }

      // Base do mês escolhido + sobreposição dos importados — SÓ nos campos VAZIOS.
      // O que já está preenchido não é tocado (mantém o valor que já havia).
      const { nv, nvm } = baseDoMes(idx, navMeses[idx].novo)
      const keysApp = new Set(itens.map(chave))
      const novoDestaque = new Set<string>()
      const naoEncontrados: string[] = []
      const aSalvar: ItemMes[] = []
      let mantidos = 0
      for (const imp of importados) {
        const key = `${imp.carteira_slug}|${imp.banco}|${imp.investimento}`
        if (!keysApp.has(key)) { naoEncontrados.push(imp.rotulo); continue }
        if ((nv[key] ?? '').trim() !== '') { mantidos++; continue } // já preenchido → não mexe
        nv[key] = String(imp.valor)
        if (imp.valor_moeda != null) nvm[key] = String(imp.valor_moeda)
        novoDestaque.add(key)
        aSalvar.push({ carteira_slug: imp.carteira_slug, banco: imp.banco, investimento: imp.investimento, valor: imp.valor, valor_moeda: imp.valor_moeda })
      }

      setSel(idx)
      setIniciado(idx) // impede o reset do bloco acima de apagar o que acabamos de preencher
      setValores(nv)
      setValoresMoeda(nvm)
      setDestaque(novoDestaque)

      const avisos = [
        parcial ? '⚠️ mês ainda em andamento (sem fecho no último dia)' : null,
        mantidos ? `${mantidos} já preenchido(s) — mantidos` : null,
        naoEncontrados.length ? `${naoEncontrados.length} sem correspondência: ${naoEncontrados.join(', ')}` : null,
        ignorados.length ? `${ignorados.length} ignorada(s) (investimento)` : null,
      ].filter(Boolean).join(' · ')

      if (aSalvar.length === 0) {
        setMsg({ tipo: 'ok', texto: `Nada a preencher em ${NOMES_MES[mes - 1]}/${ano}: os saldos da planilha já estavam lançados.${avisos ? ` — ${avisos}` : ''}` })
        return
      }

      // Salva na hora — importar já é salvar. Não depende de o usuário lembrar do botão.
      const s = await salvarMesFinanceiro(ano, mes, aSalvar)
      if (!s.ok) {
        setMsg({ tipo: 'erro', texto: `Preenchi ${aSalvar.length} saldo(s), mas falhou ao salvar: ${s.erro}. Confira e clique em Salvar mês.` })
        return
      }
      setMsg({ tipo: 'ok', texto: `✅ Importei e salvei ${s.gravados} saldo(s) em aberto de ${NOMES_MES[mes - 1]}/${ano}${dataFecho ? ` (fecho ${dataFecho})` : ''}.${avisos ? ` — ${avisos}` : ''}` })
      router.refresh()
    } finally {
      setImportando(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  // Importa um extrato XP (PDF) para a conta escolhida: Saldo líquido → linha principal
  // (a que não é "Em conta"); Saldo em conta → linha "Em conta". Preenche e JÁ SALVA.
  async function importarPdf(file: File) {
    if (!contaPdf) { setMsg({ tipo: 'erro', texto: 'Escolha a conta do extrato primeiro.' }); return }
    const [slug, banco] = contaPdf.split('|')
    const linhas = itens.filter(it => it.slug === slug && it.banco === banco)
    const emContaItem = linhas.find(it => /em\s*conta/i.test(it.nome))
    const principais = linhas.filter(it => it !== emContaItem)
    if (principais.length !== 1) {
      setMsg({ tipo: 'erro', texto: `A conta "${contasPdf.find(c => c.valor === contaPdf)?.rotulo}" tem ${principais.length} linhas além de "Em conta" — o modo Total não sabe em qual lançar. Use o preenchimento manual nessa conta.` })
      return
    }
    const principal = principais[0]

    setImportando(true)
    setMsg(null)
    try {
      const fd = new FormData()
      fd.append('arquivo', file)
      const r = await importarExtratoPdfAction(fd)
      if (!r.ok) { setMsg({ tipo: 'erro', texto: r.erro }); return }
      const { ano, mes, dataPosicao, saldoLiquido, saldoEmConta } = r.resultado

      const idx = navMeses.findIndex(m => m.ano === ano && m.mes === mes)
      if (idx < 0) {
        setMsg({ tipo: 'erro', texto: `O extrato é de ${String(mes).padStart(2, '0')}/${ano}, mas esse mês não está na navegação. Lance o mês anterior primeiro.` })
        return
      }

      const { nv, nvm } = baseDoMes(idx, navMeses[idx].novo)
      const novoDestaque = new Set<string>()
      const aSalvar: ItemMes[] = []
      if (saldoLiquido != null) {
        const k = chave(principal)
        nv[k] = String(saldoLiquido); novoDestaque.add(k)
        aSalvar.push({ carteira_slug: slug, banco, investimento: principal.nome, valor: saldoLiquido, valor_moeda: null })
      }
      if (emContaItem && saldoEmConta != null) {
        const k = chave(emContaItem)
        nv[k] = String(saldoEmConta); novoDestaque.add(k)
        aSalvar.push({ carteira_slug: slug, banco, investimento: emContaItem.nome, valor: saldoEmConta, valor_moeda: null })
      }

      setSel(idx)
      setIniciado(idx)
      setValores(nv)
      setValoresMoeda(nvm)
      setDestaque(novoDestaque)

      const s = await salvarMesFinanceiro(ano, mes, aSalvar)
      if (!s.ok) {
        setMsg({ tipo: 'erro', texto: `Li o extrato, mas falhou ao salvar: ${s.erro}. Confira os campos e clique em Salvar mês.` })
        return
      }
      const detalhe = `${principal.nome} R$ ${saldoLiquido?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` +
        (emContaItem && saldoEmConta != null ? ` · Em conta R$ ${saldoEmConta.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '')
      setMsg({ tipo: 'ok', texto: `✅ Extrato importado e salvo em ${contasPdf.find(c => c.valor === contaPdf)?.rotulo} — ${NOMES_MES[mes - 1]}/${ano}${dataPosicao ? ` (posição ${dataPosicao})` : ''}: ${detalhe}.` })
      router.refresh()
    } finally {
      setImportando(false)
      if (pdfRef.current) pdfRef.current.value = ''
    }
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

      {/* Importar planilha Saldo Diário (.xls) — funciona no computador e no celular */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1">
          <p className="text-sm font-semibold text-blue-900">Importar Saldo Diário (.xls)</p>
          <p className="text-xs text-blue-700">Suba a planilha da controladoria: eu leio o último mês fechado, preencho os saldos em aberto e <b>salvo automaticamente</b> (não mexo no que já estava lançado).</p>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept=".xls,.xlsx,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) importar(f) }}
        />
        <button
          onClick={() => fileRef.current?.click()}
          disabled={importando}
          className="shrink-0 bg-blue-600 text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-60"
        >
          {importando ? 'Lendo planilha…' : '📥 Escolher arquivo'}
        </button>
      </div>

      {/* Importar extrato de corretora (PDF) — escolhe a conta e sobe o PDF */}
      <div className="bg-violet-50 border border-violet-200 rounded-xl p-4 mb-4">
        <p className="text-sm font-semibold text-violet-900">Importar extrato (PDF)</p>
        <p className="text-xs text-violet-700 mb-3">Extrato XP &quot;Posição a mercado&quot;: escolha a conta, suba o PDF e eu preencho o <b>Saldo líquido</b> e o <b>Saldo em conta</b> — e <b>salvo automaticamente</b>.</p>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <select
            value={contaPdf}
            onChange={e => setContaPdf(e.target.value)}
            className="flex-1 px-3 py-2.5 border border-violet-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-200"
          >
            {contasPdf.map(c => <option key={c.valor} value={c.valor}>{c.rotulo}</option>)}
          </select>
          <input
            ref={pdfRef}
            type="file"
            accept=".pdf,application/pdf"
            className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) importarPdf(f) }}
          />
          <button
            onClick={() => pdfRef.current?.click()}
            disabled={importando}
            className="shrink-0 bg-violet-600 text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-violet-700 transition-colors disabled:opacity-60"
          >
            {importando ? 'Lendo PDF…' : '📄 Escolher PDF'}
          </button>
        </div>
      </div>

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
                                className={`w-28 px-2 py-1.5 border rounded-lg text-sm text-right focus:outline-none focus:ring-2 focus:ring-green-200 ${destaque.has(key) ? 'border-blue-400 bg-blue-50' : 'border-gray-300'}`}
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
                              className={`w-36 px-2 py-1.5 border rounded-lg text-sm text-right focus:outline-none focus:ring-2 focus:ring-green-200 ${destaque.has(key) ? 'border-blue-400 bg-blue-50' : 'border-gray-300'}`}
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

import Link from 'next/link'
import { exigirFinanceiro } from '@/lib/auth'
import { brl } from '@/lib/financeiro/dados'
import { listarCambios } from '@/app/actions/cambios'
import { type Cambio } from '@/lib/cambios'
import CambioForm from './CambioForm'
import RemoverBtn from './RemoverBtn'

export const dynamic = 'force-dynamic'

const usd = (n: number) => 'US$ ' + n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const dataBR = (iso: string) => {
  const [a, m, d] = iso.split('T')[0].split('-')
  return `${d}/${m}/${a}`
}
const MES_NOME = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']

export default async function CambiosPage() {
  await exigirFinanceiro()
  const cambios = await listarCambios()

  // Agrupa por mês (AAAA-MM), já vem ordenado por data desc.
  const grupos = new Map<string, Cambio[]>()
  for (const c of cambios) {
    const chave = c.data.slice(0, 7)
    if (!grupos.has(chave)) grupos.set(chave, [])
    grupos.get(chave)!.push(c)
  }

  const totalUsd = cambios.reduce((s, c) => s + c.valorUsd, 0)
  const totalBrl = cambios.reduce((s, c) => s + (c.valorBrl ?? 0), 0)

  const corPessoa = (quem: string) =>
    quem === 'Serginho' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
        <Link href="/" className="hover:text-blue-600">Início</Link>
        <span>/</span>
        <Link href="/financeiro" className="hover:text-blue-600">Financeiro</Link>
        <span>/</span>
        <span className="text-gray-900 font-medium">Câmbios La Jolla</span>
      </div>

      <div className="flex items-center justify-between gap-3 mb-6 flex-wrap">
        <div className="flex items-center gap-3">
          <span className="text-3xl">💱</span>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Câmbios — La Jolla</h2>
            <p className="text-sm text-gray-500 mt-0.5">Operações R$ → US$ para abastecer a conta (Itaú Miami)</p>
          </div>
        </div>
        <CambioForm />
      </div>

      {/* Totais */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
          <p className="text-sm text-gray-500">Total enviado (US$)</p>
          <p className="text-xl font-bold text-green-700 mt-1">{usd(totalUsd)}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
          <p className="text-sm text-gray-500">Total em R$</p>
          <p className="text-xl font-bold text-gray-900 mt-1">{brl(totalBrl)}</p>
        </div>
      </div>

      {cambios.length === 0 ? (
        <div className="bg-white border border-dashed border-gray-300 rounded-xl p-10 text-center">
          <p className="text-4xl mb-2">💱</p>
          <p className="text-gray-600 font-medium">Nenhum câmbio registrado ainda.</p>
          <p className="text-sm text-gray-400 mt-1">Clique em <b>Adicionar câmbio</b> e anexe o comprovante.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {[...grupos.entries()].map(([chave, lista]) => {
            const [ano, mes] = chave.split('-').map(Number)
            const somaUsd = lista.reduce((s, c) => s + c.valorUsd, 0)
            const somaBrl = lista.reduce((s, c) => s + (c.valorBrl ?? 0), 0)
            return (
              <div key={chave}>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide capitalize">{MES_NOME[mes - 1]} / {ano}</h3>
                  <span className="text-xs text-gray-500">{usd(somaUsd)} · {brl(somaBrl)}</span>
                </div>
                <div className="space-y-2">
                  {lista.map(c => (
                    <div key={c.id} className="bg-white border border-gray-200 rounded-xl p-4">
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-semibold text-gray-900">{dataBR(c.data)}</span>
                            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${corPessoa(c.quem)}`}>{c.quem}</span>
                            {c.instituicao && <span className="text-xs text-gray-400">{c.instituicao}</span>}
                          </div>
                          <p className="text-lg font-bold text-green-700 mt-1">{usd(c.valorUsd)}</p>
                          <p className="text-xs text-gray-500">
                            {c.valorBrl != null && <>{brl(c.valorBrl)}</>}
                            {c.taxa != null && <span> · taxa {c.taxa.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}</span>}
                            {c.iof > 0 && <span> · IOF {brl(c.iof)}</span>}
                            {c.valorDebitado != null && <span> · debitado {brl(c.valorDebitado)}</span>}
                          </p>
                          {c.referencia && <p className="text-[11px] text-gray-400 mt-0.5">Ref. {c.referencia}</p>}
                          {c.obs && <p className="text-xs text-gray-500 mt-1">{c.obs}</p>}
                        </div>
                        <RemoverBtn id={c.id} rotulo={`${dataBR(c.data)} · ${c.quem}`} />
                      </div>

                      {c.comprovantes.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-3">
                          {c.comprovantes.map(comp => (
                            <a key={comp.path} href={comp.url} target="_blank" rel="noopener"
                              className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors">
                              📄 <span className="truncate max-w-[220px]">{comp.nome}</span> ↗
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

import { createClient } from '@/lib/supabase/server'
import { buscarLembretes, DIAS_ANTES } from '@/lib/lembretes'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

const JANELA = 7 // mostra vencimentos dos próximos 7 dias

export default async function LembretesPage() {
  const supabase = await createClient()
  const lembretes = await buscarLembretes(supabase, JANELA)

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
        <Link href="/" className="hover:text-blue-600">Início</Link>
        <span>/</span>
        <span className="text-gray-900 font-medium">Lembretes</span>
      </div>

      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900">🔔 Lembretes de vencimento</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          Aluguéis vencendo nos próximos {JANELA} dias. O e-mail sai automático {DIAS_ANTES} dias antes;
          o WhatsApp você envia com um toque no botão.
        </p>
      </div>

      {lembretes.length === 0 ? (
        <div className="text-center py-12 text-gray-400 bg-white rounded-xl border border-dashed border-gray-200">
          Nenhum vencimento nos próximos {JANELA} dias.
        </div>
      ) : (
        <div className="space-y-3">
          {lembretes.map(l => {
            const destaque = l.diasRestantes === DIAS_ANTES
            return (
              <div
                key={l.imovelId}
                className={`border rounded-xl px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3 justify-between ${
                  destaque ? 'bg-amber-50 border-amber-300' : 'bg-white border-gray-200'
                }`}
              >
                <div className="min-w-0">
                  <p className="font-medium text-gray-900 truncate">{l.inquilinoNome}</p>
                  <p className="text-sm text-gray-500 truncate">{l.endereco}{l.empresaNome ? ` · ${l.empresaNome}` : ''}</p>
                  <p className="text-xs mt-1">
                    <span className={destaque ? 'text-amber-700 font-semibold' : 'text-gray-500'}>
                      Vence {l.vencimento.toLocaleDateString('pt-BR')} · faltam {l.diasRestantes} dia{l.diasRestantes === 1 ? '' : 's'}
                    </span>
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {l.email ?? 'sem e-mail'}{l.jaEnviado && l.email ? ' · ✓ e-mail enviado' : ''}
                  </p>
                </div>
                <div className="shrink-0">
                  {l.whatsUrl ? (
                    <a
                      href={l.whatsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 bg-green-600 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                    >
                      💬 Enviar WhatsApp
                    </a>
                  ) : (
                    <span className="text-xs text-gray-400">sem telefone</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

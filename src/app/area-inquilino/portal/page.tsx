import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { COOKIE_NAME, verificarToken } from '@/lib/auth-inquilino'
import { logoutInquilino } from '@/app/actions/inquilinos'

const BUCKET = 'documentos-inquilino'

const MESES = ['', 'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
function rotuloMes(yyyymm: string): string {
  const m = yyyymm.match(/^(\d{4})-(\d{2})$/)
  if (!m) return yyyymm
  return `${MESES[parseInt(m[2], 10)] ?? m[2]}/${m[1]}`
}
// Nome legível do arquivo (tira o prefixo de mês e o timestamp interno).
function nomeLimpo(nome: string): string {
  return nome.replace(/^\d{4}-\d{2}__/, '').replace(/^\d{13}_/, '')
}

export default async function PortalInquilinoPage() {
  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE_NAME)?.value ?? ''
  const inquilinoId = verificarToken(token)
  if (!inquilinoId) redirect('/area-inquilino')

  const supabase = await createClient()
  const { data: inquilino } = await supabase
    .from('inquilinos').select('id, nome, imovel_id').eq('id', inquilinoId).maybeSingle()
  if (!inquilino) redirect('/area-inquilino')

  const { data: imovel } = await supabase
    .from('imoveis').select('endereco, empresa_id, valor_aluguel').eq('id', inquilino.imovel_id).maybeSingle()
  const { data: empresa } = imovel
    ? await supabase.from('empresas').select('nome').eq('id', imovel.empresa_id).maybeSingle()
    : { data: null }

  // Contrato(s) e boletos do inquilino. Usa a chave de serviço (admin) para
  // não esbarrar na RLS do Storage.
  const admin = createAdminClient()
  const { data: contratoArqs } = await admin.storage.from(BUCKET).list(`${inquilinoId}/contrato`, { limit: 100 })
  const { data: boletoArqs } = await admin.storage.from(BUCKET).list(`${inquilinoId}/boletos`, { limit: 200 })

  async function comUrl(pasta: string, arqs: { name: string; id: string | null }[] | null) {
    const validos = (arqs ?? []).filter(a => a.id !== null)
    return Promise.all(validos.map(async a => {
      const path = `${inquilinoId}/${pasta}/${a.name}`
      const { data } = await admin.storage.from(BUCKET).createSignedUrl(path, 3600)
      return { name: a.name, url: data?.signedUrl ?? null }
    }))
  }
  const contratos = await comUrl('contrato', contratoArqs)
  const boletos = (await comUrl('boletos', boletoArqs))
    .map(b => ({ ...b, mes: b.name.split('__')[0] }))
    .sort((a, b) => b.mes.localeCompare(a.mes)) // mais recente primeiro

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm px-4 py-3 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-gray-800">{inquilino.nome}</p>
          <p className="text-xs text-blue-600 font-medium">Área do Inquilino</p>
        </div>
        <form action={logoutInquilino}>
          <button type="submit" className="text-sm font-medium text-gray-500 border border-gray-200 px-3 py-1.5 rounded-full hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all">
            Sair
          </button>
        </form>
      </header>

      <main className="max-w-2xl mx-auto p-4 md:p-6 space-y-6">
        {imovel && (
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h1 className="text-lg font-semibold text-gray-900">{imovel.endereco}</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {empresa?.nome}
              {imovel.valor_aluguel ? ` · Aluguel: R$ ${imovel.valor_aluguel.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : ''}
            </p>
          </div>
        )}

        {/* Contrato */}
        <section>
          <h2 className="text-base font-semibold text-gray-800 mb-3">📄 Contrato de aluguel</h2>
          {contratos.length === 0 ? (
            <div className="text-center py-6 text-gray-400 bg-white border border-gray-200 rounded-xl text-sm">
              Nenhum contrato disponível ainda.
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              {contratos.map(c => (
                <a key={c.name} href={c.url ?? '#'} target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-between px-4 py-3 border-b last:border-0 border-gray-100 hover:bg-gray-50 transition-colors">
                  <span className="text-sm text-gray-800 truncate flex items-center gap-2"><span>📄</span>{nomeLimpo(c.name)}</span>
                  <span className="ml-3 shrink-0 px-3 py-1.5 text-xs font-medium text-blue-700 border border-blue-200 rounded-full">Abrir</span>
                </a>
              ))}
            </div>
          )}
        </section>

        {/* Boletos */}
        <section>
          <h2 className="text-base font-semibold text-gray-800 mb-3">🧾 Boletos</h2>
          {boletos.length === 0 ? (
            <div className="text-center py-6 text-gray-400 bg-white border border-gray-200 rounded-xl text-sm">
              Nenhum boleto disponível ainda.
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              {boletos.map(b => (
                <a key={b.name} href={b.url ?? '#'} target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-between px-4 py-3 border-b last:border-0 border-gray-100 hover:bg-gray-50 transition-colors">
                  <span className="text-sm text-gray-800 flex items-center gap-2">
                    <span>🧾</span>
                    <span className="font-medium capitalize">{rotuloMes(b.mes)}</span>
                  </span>
                  <span className="ml-3 shrink-0 px-3 py-1.5 text-xs font-medium text-blue-700 border border-blue-200 rounded-full">Baixar</span>
                </a>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}

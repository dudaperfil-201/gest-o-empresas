import type { SupabaseClient } from '@supabase/supabase-js'
import { createAdminClient } from '@/lib/supabase/admin'
import { enviarEmail } from '@/lib/email'

// Quantos dias antes do vencimento o e-mail automático é enviado.
export const DIAS_ANTES = 5

// Janela (em dias) da lista de lembretes e da contagem do botão — os dois usam a
// MESMA janela para que o número do botão bata exatamente com o que aparece na página.
export const JANELA_LEMBRETES = 7

export type Lembrete = {
  imovelId: string
  empresaNome: string
  endereco: string
  inquilinoNome: string
  email: string | null
  telefone: string | null
  vencimento: Date
  diasRestantes: number
  whatsUrl: string | null
  jaEnviado: boolean       // e-mail já enviado neste ciclo
  whatsappEnviado: boolean // WhatsApp já marcado como enviado neste ciclo
}

const fmtData = (d: Date) => d.toLocaleDateString('pt-BR')
const fmtMesAno = (d: Date) =>
  d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })

// Data "hoje" no fuso de Brusque (America/Sao_Paulo), à meia-noite.
function hojeBrusque(): Date {
  const s = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' }) // YYYY-MM-DD
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

// Próximo vencimento a partir de hoje, tratando meses com menos dias (ex.: dia 31).
function proximoVencimento(dia: number, hoje: Date): Date {
  const y = hoje.getFullYear()
  const m = hoje.getMonth()
  const ultimoDesteMes = new Date(y, m + 1, 0).getDate()
  let venc = new Date(y, m, Math.min(dia, ultimoDesteMes))
  if (venc.getTime() < hoje.getTime()) {
    const ultimoProx = new Date(y, m + 2, 0).getDate()
    venc = new Date(y, m + 1, Math.min(dia, ultimoProx))
  }
  return venc
}

const diasEntre = (a: Date, b: Date) => Math.round((b.getTime() - a.getTime()) / 86400000)

// Telefone só com dígitos e com DDI 55 (Brasil) na frente.
export function telefoneWhats(tel: string | null): string | null {
  const d = (tel || '').replace(/\D/g, '')
  if (d.length < 10) return null
  return d.startsWith('55') ? d : '55' + d
}

export function mensagemLembrete(nome: string, endereco: string, venc: Date): string {
  return (
    `Olá, ${nome}! Passando para lembrar que o aluguel do imóvel ${endereco} ` +
    `vence em ${DIAS_ANTES} dias — no dia ${fmtData(venc)} (referente a ${fmtMesAno(venc)}). ` +
    `Qualquer dúvida, estamos à disposição.`
  )
}

function linkWhats(tel: string | null, mensagem: string): string | null {
  const num = telefoneWhats(tel)
  if (!num) return null
  return `https://wa.me/${num}?text=${encodeURIComponent(mensagem)}`
}

type LinhaImovel = {
  id: string
  endereco: string
  dia_vencimento: number | null
  empresas: { nome: string } | { nome: string }[] | null
  inquilinos: { nome: string; email: string | null; telefone: string | null }[] | null
}

// Busca os imóveis cujo vencimento cai dentro de `janelaDias` a partir de hoje,
// com inquilino cadastrado. Marca quais já tiveram o lembrete enviado neste ciclo.
export async function buscarLembretes(
  supabase: SupabaseClient,
  janelaDias: number
): Promise<Lembrete[]> {
  const hoje = hojeBrusque()

  const { data } = await supabase
    .from('imoveis')
    .select('id, endereco, dia_vencimento, empresas(nome), inquilinos(nome, email, telefone)')
    .not('dia_vencimento', 'is', null)
    .eq('ativo', true)

  const linhas = (data ?? []) as unknown as LinhaImovel[]
  const itens: Lembrete[] = []

  for (const im of linhas) {
    if (im.dia_vencimento == null) continue
    const inq = Array.isArray(im.inquilinos) ? im.inquilinos[0] : im.inquilinos
    if (!inq) continue
    const venc = proximoVencimento(im.dia_vencimento, hoje)
    const dias = diasEntre(hoje, venc)
    if (dias < 0 || dias > janelaDias) continue
    const emp = Array.isArray(im.empresas) ? im.empresas[0] : im.empresas
    const msg = mensagemLembrete(inq.nome, im.endereco, venc)
    itens.push({
      imovelId: im.id,
      empresaNome: emp?.nome ?? '',
      endereco: im.endereco,
      inquilinoNome: inq.nome,
      email: inq.email,
      telefone: inq.telefone,
      vencimento: venc,
      diasRestantes: dias,
      whatsUrl: linkWhats(inq.telefone, msg),
      jaEnviado: false,
      whatsappEnviado: false,
    })
  }

  // Marca o que já foi enviado (e-mail e WhatsApp) para este mês/ano de vencimento.
  const ids = itens.map(i => i.imovelId)
  if (ids.length > 0) {
    const chaveDe = (i: Lembrete) => `${i.imovelId}_${i.vencimento.getFullYear()}_${i.vencimento.getMonth() + 1}`
    const [{ data: emails }, { data: whats }] = await Promise.all([
      supabase.from('lembretes_vencimento').select('imovel_id, ano, mes').in('imovel_id', ids),
      supabase.from('lembretes_whatsapp').select('imovel_id, ano, mes').in('imovel_id', ids),
    ])
    const setEmail = new Set((emails ?? []).map(e => `${e.imovel_id}_${e.ano}_${e.mes}`))
    const setWhats = new Set((whats ?? []).map(e => `${e.imovel_id}_${e.ano}_${e.mes}`))
    for (const i of itens) {
      i.jaEnviado = setEmail.has(chaveDe(i))
      i.whatsappEnviado = setWhats.has(chaveDe(i))
    }
  }

  return itens.sort((a, b) => a.diasRestantes - b.diasRestantes)
}

// Quantos WhatsApp estão pendentes de envio (vencendo em até DIAS_ANTES dias, com
// telefone e ainda não marcados como enviados). Usado para acender o botão em vermelho.
export async function contarWhatsAppPendentes(supabase: SupabaseClient): Promise<number> {
  const lembretes = await buscarLembretes(supabase, JANELA_LEMBRETES)
  return lembretes.filter(l => l.whatsUrl && !l.whatsappEnviado).length
}

export type ResultadoLembretes = {
  ok: boolean
  emailsEnviados: number
  totalAlvos: number
  teste: boolean
  mensagem: string
}

// Rotina do cron: envia e-mail aos inquilinos que vencem em DIAS_ANTES dias (uma vez
// por ciclo) e manda ao proprietário um resumo com os links de WhatsApp (wa.me).
// `destinatarioTeste`: se informado, NÃO envia aos inquilinos nem grava controle —
// só manda o resumo (com o que SERIA enviado) para esse e-mail.
export async function processarLembretes(opts?: { destinatarioTeste?: string }): Promise<ResultadoLembretes> {
  const teste = !!opts?.destinatarioTeste
  const supabase = createAdminClient()

  const todos = await buscarLembretes(supabase, DIAS_ANTES)
  const alvos = todos.filter(l => l.diasRestantes === DIAS_ANTES && (teste || !l.jaEnviado))

  let emailsEnviados = 0
  if (!teste) {
    for (const l of alvos) {
      if (l.email) {
        try {
          await enviarEmail({
            destinatario: l.email,
            assunto: `Lembrete: aluguel vence em ${DIAS_ANTES} dias (${fmtData(l.vencimento)})`,
            texto: mensagemLembrete(l.inquilinoNome, l.endereco, l.vencimento) +
              `\n\nAtenciosamente,\n${l.empresaNome || 'HASE Management'}`,
          })
          emailsEnviados++
        } catch (e) {
          console.error('Erro ao enviar lembrete ao inquilino:', e instanceof Error ? e.message : e)
        }
      }
      // Marca como enviado (mesmo sem e-mail: o ciclo do WhatsApp também não repete).
      await supabase.from('lembretes_vencimento').upsert(
        { imovel_id: l.imovelId, ano: l.vencimento.getFullYear(), mes: l.vencimento.getMonth() + 1 },
        { onConflict: 'imovel_id,ano,mes', ignoreDuplicates: true }
      )
    }
  }

  // Resumo ao proprietário com os links de WhatsApp (envio manual — semi-automático).
  const destinoResumo = opts?.destinatarioTeste || process.env.EMAIL_USER
  if (destinoResumo && alvos.length > 0) {
    const linhas = alvos.map(l =>
      `• ${l.inquilinoNome} — ${l.endereco} (vence ${fmtData(l.vencimento)})\n` +
      `  E-mail: ${l.email ?? '(sem e-mail)'}${l.email && !teste ? ' ✓ enviado' : ''}\n` +
      `  WhatsApp: ${l.whatsUrl ?? '(sem telefone)'}`
    ).join('\n\n')
    try {
      await enviarEmail({
        destinatario: destinoResumo,
        assunto: `${teste ? '[TESTE] ' : ''}Lembretes de vencimento — ${alvos.length} imóvel(is) em ${DIAS_ANTES} dias`,
        texto:
          `Imóveis com aluguel vencendo em ${DIAS_ANTES} dias.\n` +
          `${teste ? '(TESTE — nenhum e-mail foi enviado aos inquilinos)\n' : 'Os e-mails aos inquilinos já foram enviados.\n'}` +
          `Para o WhatsApp, toque no link de cada um (abre a mensagem pronta):\n\n${linhas}`,
      })
    } catch (e) {
      console.error('Erro ao enviar resumo ao proprietário:', e instanceof Error ? e.message : e)
    }
  }

  return {
    ok: true,
    emailsEnviados,
    totalAlvos: alvos.length,
    teste,
    mensagem: alvos.length === 0
      ? 'Nenhum imóvel vence em 5 dias hoje.'
      : `${alvos.length} imóvel(is) em ${DIAS_ANTES} dias; ${teste ? 'teste (nada enviado aos inquilinos)' : `${emailsEnviados} e-mail(s) enviado(s)`}.`,
  }
}

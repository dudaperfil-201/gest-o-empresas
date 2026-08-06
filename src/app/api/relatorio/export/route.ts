import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { carregarRelatorio } from '@/lib/relatorio'

// Exporta o relatório de um mês como planilha. Gera uma TABELA HTML com MIME de Excel
// (application/vnd.ms-excel) — o Excel/LibreOffice abre já formatada, sem precisar de
// biblioteca. BOM UTF-8 garante os acentos.
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const agora = new Date()
  const mes = parseInt(searchParams.get('mes') || String(agora.getMonth() + 1), 10)
  const ano = parseInt(searchParams.get('ano') || String(agora.getFullYear()), 10)

  const { resultado, totalEsperado, totalRecebido, totalPendente } = await carregarRelatorio(supabase, mes, ano)

  const brl = (n: number) => 'R$ ' + (n ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })
  const nomeMes = new Date(ano, mes - 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
  const esc = (s: unknown) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const rotulo = (status: string | undefined) =>
    !status ? 'Sem registro' : status === 'pago' ? 'Pago' : status === 'atrasado' ? 'Atrasado' : 'Pendente'

  let corpo = ''
  for (const empresa of resultado) {
    corpo += `<tr><td colspan="7" style="background:#dbeafe;font-weight:bold;font-size:14px">${esc(empresa.nome)}</td></tr>`
    corpo += `<tr style="background:#f3f4f6;font-weight:bold">
      <td>Imóvel</td><td>Inquilino</td><td>Valor</td><td>Recebido</td><td>Extras</td><td>Descontos</td><td>Status</td></tr>`
    for (const im of empresa.imoveis) {
      corpo += `<tr>
        <td>${esc(im.endereco)}</td>
        <td>${esc(im.inquilino?.nome ?? '—')}</td>
        <td>${brl(im.valor_aluguel ?? 0)}</td>
        <td>${im.pag?.valor_pago ? brl(im.pag.valor_pago) : '—'}</td>
        <td>${im.extras > 0 ? brl(im.extras) : '—'}</td>
        <td>${im.descontos > 0 ? brl(im.descontos) : '—'}</td>
        <td>${rotulo(im.pag?.status)}</td></tr>`
    }
    corpo += `<tr style="font-weight:bold;background:#f9fafb">
      <td colspan="2">Total</td>
      <td>${brl(empresa.somaValor)}</td>
      <td style="color:#15803d">${brl(empresa.somaRecebido)}</td>
      <td></td><td></td><td></td></tr>`
    corpo += `<tr><td colspan="7"></td></tr>`
  }

  const html = `<html><head><meta charset="utf-8"></head><body>
    <h2>Relatório Mensal — ${esc(nomeMes)}</h2>
    <table border="1" cellspacing="0" cellpadding="5" style="border-collapse:collapse;font-family:Arial,sans-serif;font-size:12px">
      <tr style="font-weight:bold">
        <td>Total esperado</td><td>${brl(totalEsperado)}</td>
        <td>Total recebido</td><td style="color:#15803d">${brl(totalRecebido)}</td>
        <td>Pendente</td><td style="color:#a16207">${brl(totalPendente)}</td><td></td>
      </tr>
      <tr><td colspan="7"></td></tr>
      ${corpo}
    </table>
  </body></html>`

  const buffer = Buffer.from('﻿' + html, 'utf8')
  const nomeArquivo = `relatorio-${String(mes).padStart(2, '0')}-${ano}.xls`
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/vnd.ms-excel; charset=utf-8',
      'Content-Disposition': `attachment; filename="${nomeArquivo}"`,
    },
  })
}

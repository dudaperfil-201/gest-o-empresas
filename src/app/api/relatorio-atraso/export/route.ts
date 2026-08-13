import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { carregarAtrasos } from '@/lib/atrasos'

// Exporta o relatório de aluguéis em atraso (todas as empresas) como planilha —
// tabela HTML com MIME de Excel, igual à exportação do relatório mensal.
export async function GET(_request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { empresas, totalItens, totalAberto, totalAtual } = await carregarAtrasos(supabase)

  const brl = (n: number) => 'R$ ' + (n ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })
  const esc = (s: unknown) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const hoje = new Date().toLocaleDateString('pt-BR')

  let corpo = ''
  for (const empresa of empresas) {
    corpo += `<tr><td colspan="8" style="background:#fee2e2;font-weight:bold;font-size:14px">${esc(empresa.nome)}</td></tr>`
    corpo += `<tr style="background:#f3f4f6;font-weight:bold">
      <td>Imóvel</td><td>Inquilino</td><td>Contato</td><td>Mês</td><td>Venceu em</td><td>Atraso (dias)</td><td>Aluguel</td><td>Atualizado</td></tr>`
    for (const it of empresa.itens) {
      corpo += `<tr>
        <td>${esc(it.endereco)}</td>
        <td>${esc(it.inquilino)}</td>
        <td>${esc(it.telefone ?? '—')}</td>
        <td>${esc(it.mesRef)}</td>
        <td>${esc(new Date(it.venceEm + 'T12:00:00').toLocaleDateString('pt-BR'))}</td>
        <td>${it.dias}</td>
        <td>${brl(it.valor)}</td>
        <td>${brl(it.valorAtual)}</td></tr>`
    }
    corpo += `<tr style="font-weight:bold;background:#f9fafb">
      <td colspan="6">Subtotal ${esc(empresa.nome)}</td>
      <td style="color:#b91c1c">${brl(empresa.subtotal)}</td>
      <td style="color:#a16207">${brl(empresa.subtotalAtual)}</td></tr>`
    corpo += `<tr><td colspan="8"></td></tr>`
  }

  const html = `<html><head><meta charset="utf-8"></head><body>
    <h2>Aluguéis em Atraso — posição em ${esc(hoje)}</h2>
    <table border="1" cellspacing="0" cellpadding="5" style="border-collapse:collapse;font-family:Arial,sans-serif;font-size:12px">
      <tr style="font-weight:bold">
        <td>Qtd. em atraso</td><td>${totalItens}</td>
        <td>Total em aberto</td><td style="color:#b91c1c">${brl(totalAberto)}</td>
        <td>Atualizado (c/ juros)</td><td style="color:#a16207">${brl(totalAtual)}</td><td colspan="2"></td>
      </tr>
      <tr><td colspan="8"></td></tr>
      ${corpo}
    </table>
  </body></html>`

  const buffer = Buffer.from('﻿' + html, 'utf8')
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/vnd.ms-excel; charset=utf-8',
      'Content-Disposition': `attachment; filename="alugueis-em-atraso.xls"`,
    },
  })
}

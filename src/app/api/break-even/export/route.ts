import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSessao } from '@/lib/auth'

// Exporta o BREAK EVEN (todos os meses salvos) como planilha — tabela HTML com MIME de
// Excel, igual à exportação do relatório de imóveis. Para quem tem a categoria Relatórios.
export async function GET(_request: NextRequest) {
  const sessao = await getSessao()
  if (!sessao) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  if (!sessao.podeRelatorios) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  const supabase = await createClient()
  const { data: rows } = await supabase
    .from('break_even')
    .select('ano, mes, serginho, eduardo, rnx')
    .order('ano', { ascending: true })
    .order('mes', { ascending: true })

  const brl = (n: number) => 'R$ ' + (n ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const esc = (s: unknown) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const nomeMes = (ano: number, mes: number) => new Date(ano, mes - 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })

  // Totais das colunas.
  let tSer = 0, tEdu = 0, tRnx = 0, tTotal = 0, tDez = 0, tPessoa = 0
  let corpo = ''
  for (const r of rows ?? []) {
    const ser = Number(r.serginho) || 0, edu = Number(r.eduardo) || 0, rnx = Number(r.rnx) || 0
    const total = ser + edu + rnx
    const dez = total * 0.10
    const pessoa = dez / 3
    tSer += ser; tEdu += edu; tRnx += rnx; tTotal += total; tDez += dez; tPessoa += pessoa
    corpo += `<tr>
      <td style="text-transform:capitalize">${esc(nomeMes(r.ano, r.mes))}</td>
      <td>${brl(ser)}</td>
      <td>${brl(edu)}</td>
      <td>${brl(rnx)}</td>
      <td>${brl(total)}</td>
      <td>${brl(dez)}</td>
      <td style="color:#6d28d9;font-weight:bold">${brl(pessoa)}</td></tr>`
  }

  const html = `<html><head><meta charset="utf-8"></head><body>
    <h2>Break Even — distribuição de lucros por mês</h2>
    <p style="font-family:Arial,sans-serif;font-size:11px;color:#555">
      Total rendido = Itaú Serginho + Itaú Eduardo + RNX. Distribuição = 10% do total, dividido por 3.
    </p>
    <table border="1" cellspacing="0" cellpadding="5" style="border-collapse:collapse;font-family:Arial,sans-serif;font-size:12px">
      <tr style="background:#ede9fe;font-weight:bold">
        <td>Mês</td><td>Itaú Serginho</td><td>Itaú Eduardo</td><td>RNX</td><td>Total rendido</td><td>10%</td><td>Cada um (÷3)</td>
      </tr>
      ${corpo || '<tr><td colspan="7" style="text-align:center;color:#999">Nenhum mês salvo ainda.</td></tr>'}
      <tr style="background:#f9fafb;font-weight:bold;border-top:2px solid #999">
        <td>TOTAL</td>
        <td>${brl(tSer)}</td><td>${brl(tEdu)}</td><td>${brl(tRnx)}</td><td>${brl(tTotal)}</td><td>${brl(tDez)}</td>
        <td style="color:#6d28d9">${brl(tPessoa)}</td>
      </tr>
    </table>
  </body></html>`

  const buffer = Buffer.from('﻿' + html, 'utf8')
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/vnd.ms-excel; charset=utf-8',
      'Content-Disposition': `attachment; filename="break-even.xls"`,
    },
  })
}

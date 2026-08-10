-- Variação % do ativo no mês (ex.: +1,43 = +1,43%). Fonte:
--  - Ações e ETFs: robô do dia 1 (busca na internet); pode ser sobrescrito pelo relatório.
--  - Demais ativos (Renda Fixa, Notas, Private Equity, Hedge Funds): preenchido a partir
--    do relatório mensal do Itaú (coluna "MTD Return").
-- Guardado por (carteira_slug, banco, investimento, ano, mes), junto do valor.

alter table public.financeiro_valores
  add column if not exists variacao_pct numeric;

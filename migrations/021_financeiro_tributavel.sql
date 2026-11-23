-- 021: classificação tributável × isento por ativo no Financeiro.
-- Cada linha de financeiro_valores pode guardar se aquele ativo é tributável (true),
-- isento/incentivado (false) ou sem classificação (null = não se aplica / caixa).
-- Fonte da verdade: a coluna "IR + IOF" do extrato "Posição a mercado" do Itaú — o
-- importador lê isso (IR>0 → tributável; 0,00 em CRI/CRA/LIG/deb. incentivada/FII → isento).
-- Tratamento tributário não muda mês a mês, então fica por ativo (não por mês); o
-- importador reaplica a cada importação, mantendo tudo em dia.

alter table financeiro_valores
  add column if not exists tributavel boolean;

comment on column financeiro_valores.tributavel is
  'true=tributável, false=isento/incentivado, null=não classificado (ex.: caixa). Vem da coluna IR+IOF do extrato Itaú.';

-- FIPE por veículo: vínculo com a tabela FIPE (códigos marca/modelo/ano) + valor
-- atualizado uma vez por mês por um robô (cron dia 1). Mostrado no card do veículo.

alter table public.veiculos add column if not exists fipe_marca_cod    text;
alter table public.veiculos add column if not exists fipe_modelo_cod   text;
alter table public.veiculos add column if not exists fipe_ano_cod      text;
alter table public.veiculos add column if not exists fipe_valor        numeric(12,2);
alter table public.veiculos add column if not exists fipe_ref          text;        -- mês de referência (ex.: "agosto de 2026")
alter table public.veiculos add column if not exists fipe_atualizado_em timestamptz;

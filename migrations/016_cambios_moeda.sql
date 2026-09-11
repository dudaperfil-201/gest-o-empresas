-- Multi-moeda nos câmbios da La Jolla. Antes só havia dólar (valor_usd); agora cada
-- operação tem a sua MOEDA estrangeira (USD, CHF, EUR, GBP…). A coluna `valor_usd`
-- continua guardando o valor NA MOEDA ESTRANGEIRA (o nome ficou por herança).
-- Operações já existentes viram USD automaticamente (default).

alter table public.lajolla_cambios
  add column if not exists moeda text not null default 'USD';

-- Câmbios da La Jolla: as operações de câmbio (R$ → US$) feitas mensalmente para
-- abastecer a conta da La Jolla (Itaú Miami). É DIFERENTE da carteira "Câmbio em
-- aberto (IMG)" — aqui são as TRANSAÇÕES (data, valores, quem fez), não um saldo.
-- Duas pessoas físicas fazem o câmbio: Eduardo e Serginho (campo `quem`).
-- Os comprovantes (PDFs) ficam no bucket de Storage `comprovantes-cambio`, na
-- pasta com o id do câmbio.

create table if not exists public.lajolla_cambios (
  id             uuid primary key default gen_random_uuid(),
  data           date not null,                 -- data da operação
  quem           text not null,                 -- quem fez: 'Eduardo' | 'Serginho'
  valor_usd      numeric not null,              -- valor em US$
  taxa           numeric,                       -- cotação R$/US$
  valor_brl      numeric,                       -- valor da operação em R$
  iof            numeric not null default 0,    -- IOF (R$)
  valor_debitado numeric,                       -- total debitado (valor_brl + tarifa + iof)
  instituicao    text,                          -- banco (ex.: Itaú Unibanco)
  referencia     text,                          -- nº de referência do comprovante
  obs            text,
  criado_em      timestamptz not null default now()
);

create index if not exists idx_lajolla_cambios_data on public.lajolla_cambios (data);

alter table public.lajolla_cambios enable row level security;

drop policy if exists "lajolla_cambios_auth_all" on public.lajolla_cambios;
create policy "lajolla_cambios_auth_all" on public.lajolla_cambios
  for all to authenticated using (true) with check (true);

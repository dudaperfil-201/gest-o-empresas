-- Preços/taxas dos títulos do Tesouro Direto atrelados à inflação (Tesouro IPCA+).
-- Fonte: Tesouro Transparente (CSV oficial, ~14 MB) — pesado para buscar ao vivo, então
-- um robô diário (/api/cron/tesouro-ipca) baixa, extrai o dia mais recente e grava aqui;
-- o painel de Indicadores lê deste resumo leve.

create table if not exists public.tesouro_ipca (
  titulo        text not null,      -- ex.: "Tesouro IPCA+" | "Tesouro IPCA+ com Juros Semestrais"
  vencimento    date not null,
  taxa          numeric,            -- taxa de compra (IPCA + X% a.a.)
  pu            numeric,            -- preço unitário de compra (R$)
  data_base     date,              -- data de referência da cotação
  atualizado_em timestamptz not null default now(),
  primary key (titulo, vencimento)
);

alter table public.tesouro_ipca enable row level security;

drop policy if exists "tesouro_ipca_auth_all" on public.tesouro_ipca;
create policy "tesouro_ipca_auth_all" on public.tesouro_ipca
  for all to authenticated using (true) with check (true);

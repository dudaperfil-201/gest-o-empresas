-- Imposto de Renda 2026 (reforma Lei 15.270/2025) — distribuicao de lucros a familia.
-- Pessoas do grupo (PF/PJ), distribuicao por empresa/ano e outros rendimentos por
-- pessoa/ano (base do imposto minimo IRPFM). Rodar no SQL Editor do Supabase do app.

create table if not exists ir_pessoas (
  id         uuid primary key default gen_random_uuid(),
  nome       text not null,
  tipo       text not null default 'pf',  -- 'pf' (pessoa fisica) | 'pj' (isenta dos 10%)
  ordem      int  not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists ir_distribuicoes (
  id           uuid primary key default gen_random_uuid(),
  ano          int  not null,
  empresa_id   uuid not null references empresas(id) on delete cascade,
  pessoa_id    uuid not null references ir_pessoas(id) on delete cascade,
  valor_mensal numeric not null default 0,  -- media que a pessoa recebe/mes da empresa
  unique (ano, empresa_id, pessoa_id)
);
create index if not exists ir_distribuicoes_ano_idx on ir_distribuicoes (ano);

create table if not exists ir_pessoa_ano (
  id                 uuid primary key default gen_random_uuid(),
  ano                int  not null,
  pessoa_id          uuid not null references ir_pessoas(id) on delete cascade,
  outros_rendimentos numeric not null default 0,  -- outros rendimentos anuais (base IRPFM)
  unique (ano, pessoa_id)
);

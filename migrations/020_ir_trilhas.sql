-- IR 2026 — evolucao para as TRES TRILHAS tributarias da familia.
-- Cria ir_fontes (fontes de renda classificadas por trilha) e passa as
-- distribuicoes a referenciar a FONTE (nao mais a tabela empresas, que e do
-- modulo de imoveis). Ja semeia a estrutura real mapeada dos contratos sociais.
-- Rodar no SQL Editor do Supabase do app ANTES do deploy (sem RLS, como a 019).
--
-- Trilhas:
--   holding       — holding de topo que distribui a PF (dividendo 10% + IRPFM). [Black Fortune, OB Holding]
--   direta        — operacional que paga DIRETO a PF (dividendo 10% + IRPFM). [Oyster, Summit]
--   offshore      — empresa no exterior (Lei 14.754/2023, ~15%/ano). [La Jolla]
--   fundo         — fundo de investimento (come-cotas/resgate, ~15%). [Golden Sky]
--   intermediaria — elo PJ->PJ ISENTO, nao distribui a PF (so contexto). [IMG, PAN, METVISA, E.M.E]

create table if not exists ir_fontes (
  id         uuid primary key default gen_random_uuid(),
  nome       text not null,
  trilha     text not null default 'direta'
             check (trilha in ('holding','direta','offshore','fundo','intermediaria')),
  ordem      int  not null default 0,
  created_at timestamptz not null default now()
);

-- Distribuicoes agora por FONTE (valor = mensal p/ holding/direta, anual p/ offshore/fundo).
-- A 019 criou ir_distribuicoes referenciando empresas; recriamos referenciando ir_fontes.
drop table if exists ir_distribuicoes;
create table ir_distribuicoes (
  id        uuid primary key default gen_random_uuid(),
  ano       int  not null,
  fonte_id  uuid not null references ir_fontes(id) on delete cascade,
  pessoa_id uuid not null references ir_pessoas(id) on delete cascade,
  valor     numeric not null default 0,  -- mensal (holding/direta) | anual (offshore/fundo)
  unique (ano, fonte_id, pessoa_id)
);
create index if not exists ir_distribuicoes_ano_idx on ir_distribuicoes (ano);

-- Seed das PESSOAS da familia (so se a tabela estiver vazia).
insert into ir_pessoas (nome, tipo, ordem)
select v.nome, v.tipo, v.ordem from (values
  ('Eduardo Coelho','pf',1),
  ('Sérgio Coelho Filho','pf',2),
  ('Sérgio Coelho (Pai)','pf',3),
  ('Roseli Maria Morelli Coelho','pf',4),
  ('Janara Rúbia Venturelli','pf',5)
) as v(nome,tipo,ordem)
where not exists (select 1 from ir_pessoas);

-- Seed das FONTES (estrutura real; so se a tabela estiver vazia).
insert into ir_fontes (nome, trilha, ordem)
select v.nome, v.trilha, v.ordem from (values
  ('Black Fortune Holding','holding',1),
  ('OB Holding','holding',2),
  ('Oyster','direta',3),
  ('Summit','direta',4),
  ('La Jolla Ltd. (offshore)','offshore',5),
  ('FIM Golden Sky (fundo)','fundo',6),
  ('IMG','intermediaria',7),
  ('PAN','intermediaria',8),
  ('METVISA','intermediaria',9),
  ('E.M.E','intermediaria',10)
) as v(nome,trilha,ordem)
where not exists (select 1 from ir_fontes);

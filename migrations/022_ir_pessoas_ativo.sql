-- Pessoas do grupo: marcar ATIVA/INATIVA. As crianças entram como inativas —
-- aparecem no card "Pessoas do grupo" mas ficam FORA dos cálculos e das tabelas
-- do IR até serem ativadas. Rodar no SQL Editor do Supabase do app ANTES do deploy
-- (senão a tela carrega sem pessoas até a coluna existir).

alter table ir_pessoas
  add column if not exists ativo boolean not null default true;

-- Crianças do grupo — entram INATIVAS (ordem alta p/ ficarem por último no card).
-- Sofia Coelho: filha de Eduardo e Janara. Luisa e Pedro Sarti Coelho: filhos de
-- Sérgio Coelho Filho. Idempotente: só insere se ainda não existir pelo nome.
insert into ir_pessoas (nome, tipo, ordem, ativo)
select v.nome, v.tipo, v.ordem, v.ativo
from (values
  ('Sofia Coelho',       'pf', 101, false),
  ('Luisa Sarti Coelho', 'pf', 102, false),
  ('Pedro Sarti Coelho', 'pf', 103, false)
) as v(nome, tipo, ordem, ativo)
where not exists (select 1 from ir_pessoas p where p.nome = v.nome);

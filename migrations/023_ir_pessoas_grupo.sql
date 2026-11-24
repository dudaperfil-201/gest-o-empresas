-- Organização do card "Pessoas do grupo": cada pessoa/empresa num GRUPO.
--   PF  -> família: 'Eduardo' | 'Sérgio Filho' | 'Pais'
--   PJ  -> holding:  'Black Fortune' | 'OB Holding' | 'Diretas' | 'Offshore/Fundo'
-- As empresas entram como PJ só p/ ORGANIZAÇÃO (não viram coluna na grade de
-- distribuição, que segue só com as PFs). Rodar no SQL Editor do Supabase do app
-- ANTES do deploy (senão o select de pessoas quebra até a coluna existir).

alter table ir_pessoas
  add column if not exists grupo text;

-- Famílias das PFs já cadastradas (por nome, como semeadas na 020/022).
update ir_pessoas set grupo = 'Eduardo'      where nome in ('Eduardo Coelho','Janara Rúbia Venturelli','Sofia Coelho');
update ir_pessoas set grupo = 'Sérgio Filho' where nome in ('Sérgio Coelho Filho','Pedro Sarti Coelho','Luisa Sarti Coelho');
update ir_pessoas set grupo = 'Pais'         where nome in ('Sérgio Coelho (Pai)','Roseli Maria Morelli Coelho');

-- Ana Carolina (esposa do Sérgio Filho, dona da Seastar) — PF ativa, Família Sérgio Filho.
insert into ir_pessoas (nome, tipo, ordem, ativo, grupo)
select 'Ana Carolina Sarti Coelho', 'pf', 6, true, 'Sérgio Filho'
where not exists (select 1 from ir_pessoas p where p.nome = 'Ana Carolina Sarti Coelho');

-- Empresas do grupo como PJ, organizadas por holding (idempotente por nome).
insert into ir_pessoas (nome, tipo, ordem, ativo, grupo)
select v.nome, 'pj', v.ordem, true, v.grupo
from (values
  ('Black Fortune Holding', 201, 'Black Fortune'),
  ('PAN',                   202, 'Black Fortune'),
  ('IMG',                   203, 'Black Fortune'),
  ('OB Holding',            204, 'OB Holding'),
  ('METVISA',               205, 'OB Holding'),
  ('E.M.E',                 206, 'OB Holding'),
  ('Oyster',                207, 'Diretas'),
  ('Summit',                208, 'Diretas'),
  ('Seastar',               209, 'Diretas'),
  ('La Jolla',              210, 'Offshore/Fundo'),
  ('Golden Sky',            211, 'Offshore/Fundo')
) as v(nome, ordem, grupo)
where not exists (select 1 from ir_pessoas p where p.nome = v.nome);

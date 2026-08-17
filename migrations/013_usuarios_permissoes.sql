-- Permissões por MÓDULO, independentes (caixas marcáveis por pessoa na tela Usuários):
-- RELATÓRIOS, IMÓVEIS, FINANCEIRO, FROTA e ADMINISTRADOR. Substitui o antigo `papel`
-- em escada. ADMINISTRADOR implica acesso a tudo (regra na aplicação — lib/auth.ts).
-- A coluna `papel` fica no banco por compatibilidade, mas não é mais usada para decidir acesso.
alter table public.usuarios add column if not exists relatorios    boolean not null default false;
alter table public.usuarios add column if not exists imoveis       boolean not null default false;
alter table public.usuarios add column if not exists financeiro    boolean not null default false;
alter table public.usuarios add column if not exists administrador boolean not null default false;
-- (a coluna `frota` já existe, criada na migration 012)

-- Preserva o acesso que cada pessoa já tinha, derivando do papel + frota atuais:
--  admin        → tudo
--  ambos        → imóveis + financeiro + relatórios (+ frota se já tinha)
--  imoveis      → imóveis + relatórios (+ frota se já tinha)
--  relatorios   → só relatórios
update public.usuarios set
  administrador = (papel = 'admin'),
  financeiro    = (papel in ('ambos', 'admin')),
  imoveis       = (papel in ('imoveis', 'ambos', 'admin')),
  relatorios    = (papel in ('relatorios', 'imoveis', 'ambos', 'admin')),
  frota         = (coalesce(frota, false) or papel = 'admin');

-- Permissão granular de módulo: acesso à FROTA por usuário. Nasce FECHADA (false):
-- o admin libera pessoa a pessoa na tela de Usuários. O admin/dono sempre enxerga a
-- Frota, independente desta coluna (essa regra fica na aplicação — lib/auth.ts).
alter table public.usuarios add column if not exists frota boolean not null default false;

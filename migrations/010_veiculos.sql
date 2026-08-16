-- Módulo FROTA VEÍCULOS: cadastro dos veículos da frota. (Fase 1 = só o cadastro;
-- manutenções e documentos/vencimentos entram depois, em tabelas próprias.)
-- empresa_id (opcional) liga o veículo a uma das empresas já cadastradas.

create table if not exists public.veiculos (
  id           uuid primary key default gen_random_uuid(),
  empresa_id   uuid references public.empresas,
  placa        text,
  marca        text,
  modelo       text,
  ano          int,
  cor          text,
  renavam      text,
  km_atual     int,
  observacoes  text,
  ativo        boolean not null default true,
  created_at   timestamptz not null default now()
);
alter table public.veiculos enable row level security;
drop policy if exists "veiculos_auth_all" on public.veiculos;
create policy "veiculos_auth_all" on public.veiculos
  for all to authenticated using (true) with check (true);

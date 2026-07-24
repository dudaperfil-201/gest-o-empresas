-- Área do Inquilino: senha de acesso ao portal (texto, enviada ao inquilino).
alter table public.inquilinos add column if not exists senha_acesso text;

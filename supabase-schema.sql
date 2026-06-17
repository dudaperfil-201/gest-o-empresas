-- Usuários do sistema
create table usuarios (
  id uuid references auth.users primary key,
  nome text not null,
  papel text not null default 'usuario',
  created_at timestamptz default now()
);
alter table usuarios enable row level security;
create policy "usuarios: leitura autenticada" on usuarios for select to authenticated using (true);

-- Empresas proprietárias
create table empresas (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  created_at timestamptz default now()
);
alter table empresas enable row level security;
create policy "empresas: leitura autenticada" on empresas for select to authenticated using (true);
create policy "empresas: escrita autenticada" on empresas for all to authenticated using (true);

-- Imóveis
create table imoveis (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid references empresas not null,
  nome text not null,
  avaliacao text check (avaliacao in ('otimo', 'bom', 'razoavel', 'ruim')),
  dia_vencimento int check (dia_vencimento between 1 and 31),
  valor_aluguel numeric(12,2),
  condominio_responsavel text check (condominio_responsavel in ('locatario', 'locador', 'nenhum')),
  iptu_responsavel text check (iptu_responsavel in ('locatario', 'locador', 'nenhum')),
  ativo boolean default true,
  created_at timestamptz default now()
);
alter table imoveis enable row level security;
create policy "imoveis: leitura autenticada" on imoveis for select to authenticated using (true);
create policy "imoveis: escrita autenticada" on imoveis for all to authenticated using (true);

-- Inquilinos
create table inquilinos (
  id uuid primary key default gen_random_uuid(),
  imovel_id uuid references imoveis not null,
  nome text not null,
  telefone text,
  email text,
  cpf_cnpj text,
  data_inicio date,
  data_fim date,
  juros_percentual numeric(5,2) default 1.0,
  multa_percentual numeric(5,2) default 2.0,
  ativo boolean default true,
  created_at timestamptz default now()
);
alter table inquilinos enable row level security;
create policy "inquilinos: leitura autenticada" on inquilinos for select to authenticated using (true);
create policy "inquilinos: escrita autenticada" on inquilinos for all to authenticated using (true);

-- Pagamentos
create table pagamentos (
  id uuid primary key default gen_random_uuid(),
  imovel_id uuid references imoveis not null,
  inquilino_id uuid references inquilinos not null,
  mes int check (mes between 1 and 12),
  ano int,
  valor_original numeric(12,2),
  valor_pago numeric(12,2),
  data_pagamento date,
  data_vencimento date,
  status text check (status in ('pago', 'pendente', 'atrasado')) default 'pendente',
  juros numeric(12,2) default 0,
  multa numeric(12,2) default 0,
  observacoes text,
  created_at timestamptz default now()
);
alter table pagamentos enable row level security;
create policy "pagamentos: leitura autenticada" on pagamentos for select to authenticated using (true);
create policy "pagamentos: escrita autenticada" on pagamentos for all to authenticated using (true);

-- Inserir as 4 empresas
insert into empresas (nome) values
  ('E.M.E.'),
  ('METVISA'),
  ('OB Holding'),
  ('Black Fortune');

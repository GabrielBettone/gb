-- Supabase foundation schema for Gesso Bettone.
-- Phase 1 only: this creates a destination schema; it does NOT copy PocketBase data
-- and it does NOT switch the frontend away from PocketBase.
-- Apply only to a NEW Supabase project, after reviewing this file.

create extension if not exists pgcrypto;

-- Profiles are linked to Supabase Auth identities. New signups are members by default;
-- promote the first trusted administrator manually after creating that user.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  legacy_pocketbase_id text unique,
  email text not null default '',
  name text not null default '',
  avatar_url text,
  role text not null default 'member' check (role in ('member', 'admin')),
  created timestamptz not null default now(),
  updated timestamptz not null default now()
);

create or replace function public.set_updated_timestamp()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated = now();
  return new;
end;
$$;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, name, role)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'name', ''),
    'member'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_auth_user();

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  );
$$;

-- Sales and quotation module.
create table if not exists public.produtos (
  id uuid primary key default gen_random_uuid(),
  legacy_pocketbase_id text unique,
  nome text not null,
  descricao text,
  ativo boolean not null default true,
  created timestamptz not null default now(),
  updated timestamptz not null default now()
);

create table if not exists public.clientes_grupos (
  id uuid primary key default gen_random_uuid(),
  legacy_pocketbase_id text unique,
  nome text not null unique,
  descricao text,
  ativo boolean not null default true,
  padrao boolean not null default false,
  created timestamptz not null default now(),
  updated timestamptz not null default now()
);

create table if not exists public.clientes (
  id uuid primary key default gen_random_uuid(),
  legacy_pocketbase_id text unique,
  nome text not null,
  grupo_id uuid not null references public.clientes_grupos(id) on delete restrict,
  documento text,
  whatsapp text,
  email text,
  cidade text,
  endereco text,
  observacoes text,
  created timestamptz not null default now(),
  updated timestamptz not null default now()
);

create table if not exists public.orcamento_servicos (
  id uuid primary key default gen_random_uuid(),
  legacy_pocketbase_id text unique,
  nome text not null,
  grupo_id uuid references public.clientes_grupos(id) on delete set null,
  modo_calculo text not null default 'area' check (modo_calculo in ('area', 'dimensoes')),
  unidade text not null default 'm²',
  preco_unitario numeric(14,2) not null default 0,
  descricao_pdf text,
  ativo boolean not null default true,
  site_service_id uuid,
  created timestamptz not null default now(),
  updated timestamptz not null default now()
);

create table if not exists public.metodos_pagamento (
  id uuid primary key default gen_random_uuid(),
  legacy_pocketbase_id text unique,
  nome text not null,
  desconto_a_vista numeric(7,3) not null default 0,
  condicoes jsonb not null default '[]'::jsonb,
  numero_parcelas integer not null default 1 check (numero_parcelas > 0),
  padrao boolean not null default false,
  ativo boolean not null default true,
  created timestamptz not null default now(),
  updated timestamptz not null default now()
);

create table if not exists public.orcamento_configuracoes (
  id uuid primary key default gen_random_uuid(),
  legacy_pocketbase_id text unique,
  chave text not null unique,
  razao_social text,
  nome_fantasia text,
  cnpj text,
  exibir_cnpj_padrao boolean not null default false,
  nosso_compromisso jsonb not null default '[]'::jsonb,
  telefone text,
  email text,
  endereco text,
  cidade text,
  arquivo_logo text,
  logo_url text,
  created timestamptz not null default now(),
  updated timestamptz not null default now()
);

create table if not exists public.orcamentos (
  id uuid primary key default gen_random_uuid(),
  legacy_pocketbase_id text unique,
  numero text not null unique,
  cliente text not null,
  contato text,
  cidade text,
  canal_origem text not null default 'WhatsApp'
    check (canal_origem in ('WhatsApp', 'E-mail', 'Instagram', 'Loja física')),
  status text not null default 'Orçamentos a realizar'
    check (status in (
      'Orçamentos a realizar',
      'Aguardando aprovação',
      'Aprovados aguardando início',
      'Trabalhos iniciados',
      'Concluídos'
    )),
  produto_principal_id uuid references public.produtos(id) on delete set null,
  cliente_cadastrado_id uuid references public.clientes(id) on delete set null,
  grupo_id uuid references public.clientes_grupos(id) on delete set null,
  metodo_pagamento_id uuid references public.metodos_pagamento(id) on delete set null,
  itens jsonb not null default '[]'::jsonb,
  subtotal numeric(14,2) not null default 0,
  desconto numeric(14,2) not null default 0,
  valor_total numeric(14,2) not null default 0,
  valor_a_vista numeric(14,2),
  valor_a_prazo numeric(14,2),
  exibir_cnpj boolean not null default false,
  data_inicio_prevista date,
  data_fim_prevista date,
  data_conclusao date,
  validade date,
  observacoes text,
  created timestamptz not null default now(),
  updated timestamptz not null default now()
);

create index if not exists idx_orcamentos_status on public.orcamentos(status);
create index if not exists idx_orcamentos_cliente on public.orcamentos(cliente);
create index if not exists idx_orcamentos_data_inicio on public.orcamentos(data_inicio_prevista);
create index if not exists idx_clientes_grupo on public.clientes(grupo_id);
create index if not exists idx_orcamento_servicos_grupo on public.orcamento_servicos(grupo_id);

create table if not exists public.pagamentos_parcelas (
  id uuid primary key default gen_random_uuid(),
  legacy_pocketbase_id text unique,
  orcamento_id uuid not null references public.orcamentos(id) on delete cascade,
  numero_parcela integer not null check (numero_parcela > 0),
  total_parcelas integer not null check (total_parcelas > 0),
  descricao text,
  valor_previsto numeric(14,2) not null default 0,
  data_vencimento date not null,
  status text not null default 'a_pagar' check (status in ('a_pagar', 'paga', 'cancelada')),
  data_pagamento date,
  valor_pago numeric(14,2),
  ajuste numeric(14,2),
  forma_pagamento text,
  observacoes_baixa text,
  created timestamptz not null default now(),
  updated timestamptz not null default now()
);

create index if not exists idx_pagamentos_parcelas_orcamento on public.pagamentos_parcelas(orcamento_id);
create index if not exists idx_pagamentos_parcelas_vencimento on public.pagamentos_parcelas(data_vencimento);

create table if not exists public.vendas (
  id uuid primary key default gen_random_uuid(),
  legacy_pocketbase_id text unique,
  data date not null,
  cliente text not null,
  produto_id uuid not null references public.produtos(id) on delete restrict,
  canal text not null check (canal in ('WhatsApp', 'E-mail', 'Instagram', 'Loja física')),
  cidade text,
  valor numeric(14,2) not null default 0,
  orcamento_id uuid references public.orcamentos(id) on delete set null,
  created timestamptz not null default now(),
  updated timestamptz not null default now()
);

create index if not exists idx_vendas_data on public.vendas(data);
create index if not exists idx_vendas_produto on public.vendas(produto_id);
create index if not exists idx_vendas_canal on public.vendas(canal);

create table if not exists public.regras_alerta (
  id uuid primary key default gen_random_uuid(),
  legacy_pocketbase_id text unique,
  nome text not null,
  indicador text not null check (indicador in ('faturamento', 'ticket_medio', 'quantidade')),
  comparacao text not null check (comparacao in ('acima', 'abaixo', 'variacao_percentual')),
  limite numeric(14,2) not null,
  habilitada boolean not null default true,
  created timestamptz not null default now(),
  updated timestamptz not null default now()
);

create table if not exists public.alertas (
  id uuid primary key default gen_random_uuid(),
  legacy_pocketbase_id text unique,
  regra_id uuid references public.regras_alerta(id) on delete set null,
  tipo text not null check (tipo in ('positivo', 'negativo')),
  mensagem text not null,
  valor_atual numeric(14,2) not null default 0,
  lido boolean not null default false,
  created timestamptz not null default now(),
  updated timestamptz not null default now()
);

create table if not exists public.importacoes (
  id uuid primary key default gen_random_uuid(),
  legacy_pocketbase_id text unique,
  data date not null,
  arquivo text not null,
  total_registros integer not null default 0,
  created timestamptz not null default now(),
  updated timestamptz not null default now()
);

-- Public website content. File columns hold Storage object paths after migration,
-- not legacy PHP URLs and not PocketBase attachment URLs.
create table if not exists public.site_categories (
  id uuid primary key default gen_random_uuid(),
  legacy_pocketbase_id text unique,
  nome text not null,
  slug text not null unique,
  ativa boolean not null default true,
  ordem integer not null default 0,
  created timestamptz not null default now(),
  updated timestamptz not null default now()
);

create table if not exists public.site_services (
  id uuid primary key default gen_random_uuid(),
  legacy_pocketbase_id text unique,
  nome text not null,
  slug text not null unique,
  categoria text not null,
  destaque boolean not null default false,
  ativo boolean not null default true,
  ordem integer not null default 0,
  descricao_curta text,
  descricao_longa text,
  beneficios jsonb not null default '[]'::jsonb,
  imagem_principal text,
  galeria jsonb not null default '[]'::jsonb,
  arquivo_principal text,
  arquivos_galeria jsonb not null default '[]'::jsonb,
  meta_title text,
  meta_description text,
  keywords jsonb not null default '[]'::jsonb,
  created timestamptz not null default now(),
  updated timestamptz not null default now()
);

create index if not exists idx_site_services_ativo on public.site_services(ativo);
create index if not exists idx_site_services_destaque on public.site_services(destaque);

create table if not exists public.site_portfolio (
  id uuid primary key default gen_random_uuid(),
  legacy_pocketbase_id text unique,
  titulo text not null,
  slug text not null unique,
  categoria text not null,
  subtitulo text,
  cidade text,
  descricao text,
  detalhes_tecnicos jsonb not null default '[]'::jsonb,
  imagem_capa text,
  arquivo_capa text,
  galeria jsonb not null default '[]'::jsonb,
  arquivos_galeria jsonb not null default '[]'::jsonb,
  fotos_count integer not null default 0,
  videos jsonb not null default '[]'::jsonb,
  arquivos_videos jsonb not null default '[]'::jsonb,
  videos_count integer not null default 0,
  destaque boolean not null default false,
  ativo boolean not null default true,
  ordem integer not null default 0,
  meta_title text,
  meta_description text,
  created timestamptz not null default now(),
  updated timestamptz not null default now()
);

create index if not exists idx_site_portfolio_ativo on public.site_portfolio(ativo);
create index if not exists idx_site_portfolio_destaque on public.site_portfolio(destaque);

create table if not exists public.site_testimonials (
  id uuid primary key default gen_random_uuid(),
  legacy_pocketbase_id text unique,
  nome text not null,
  cidade text,
  texto text not null,
  nota numeric(3,1) check (nota is null or (nota >= 0 and nota <= 5)),
  aprovado boolean not null default false,
  ordem integer not null default 0,
  created timestamptz not null default now(),
  updated timestamptz not null default now()
);

create table if not exists public.partner_categories (
  id uuid primary key default gen_random_uuid(),
  legacy_pocketbase_id text unique,
  nome text not null,
  slug text not null unique,
  ativa boolean not null default true,
  ordem integer not null default 0,
  created timestamptz not null default now(),
  updated timestamptz not null default now()
);

create table if not exists public.site_partners (
  id uuid primary key default gen_random_uuid(),
  legacy_pocketbase_id text unique,
  nome text not null,
  categoria text,
  papel text,
  whatsapp text,
  logo text,
  arquivo_logo text,
  descricao text,
  destaque boolean not null default false,
  ativo boolean not null default true,
  ordem integer not null default 0,
  created timestamptz not null default now(),
  updated timestamptz not null default now()
);

create table if not exists public.partner_clicks (
  id uuid primary key default gen_random_uuid(),
  legacy_pocketbase_id text unique,
  parceiro_id text not null,
  parceiro_nome text,
  data date not null default current_date,
  ano_mes text,
  visitor_id text,
  created timestamptz not null default now(),
  updated timestamptz not null default now()
);

create table if not exists public.site_settings (
  id uuid primary key default gen_random_uuid(),
  legacy_pocketbase_id text unique,
  chave text not null unique,
  nome_site text,
  whatsapp_principal text,
  email_contato text,
  mensagem_orcamento text,
  instagram text,
  cnpj text,
  exibir_depoimentos boolean not null default true,
  cidades_atendidas jsonb not null default '[]'::jsonb,
  pagina_parceiros_ativa boolean not null default true,
  arquivo_logo text,
  logo_url text,
  simulador_ativo boolean not null default false,
  simulador_exigir_login boolean not null default false,
  simulador_cota_padrao integer not null default 0,
  created timestamptz not null default now(),
  updated timestamptz not null default now()
);

create table if not exists public.site_analytics_events (
  id uuid primary key default gen_random_uuid(),
  legacy_pocketbase_id text unique,
  tipo text not null check (tipo in ('pageview', 'click_whatsapp', 'contato', 'click_servico', 'view_categoria')),
  pagina text,
  servico_slug text,
  servico_nome text,
  categoria_nome text,
  visitor_id text,
  data timestamptz not null default now(),
  data_dia text,
  metadata jsonb not null default '{}'::jsonb,
  created timestamptz not null default now(),
  updated timestamptz not null default now()
);

create index if not exists idx_site_analytics_tipo on public.site_analytics_events(tipo);
create index if not exists idx_site_analytics_dia on public.site_analytics_events(data_dia);

-- Simulator customer history. OTP/PIN values are stored as hashes in Supabase;
-- existing plaintext values must not be copied directly during the migration.
create table if not exists public.simulador_clientes (
  id uuid primary key default gen_random_uuid(),
  legacy_pocketbase_id text unique,
  telefone text not null unique,
  nome text,
  bloqueado boolean not null default false,
  cota_mensal integer,
  geracoes_mes_atual integer not null default 0,
  mes_referencia text,
  pin_hash text,
  ultimo_codigo_hash text,
  confirmado boolean not null default false,
  observacoes text,
  created timestamptz not null default now(),
  updated timestamptz not null default now()
);

create table if not exists public.simulador_historico (
  id uuid primary key default gen_random_uuid(),
  legacy_pocketbase_id text unique,
  cliente_id uuid references public.simulador_clientes(id) on delete set null,
  telefone text,
  servico_nome text not null,
  servico_slug text,
  foto_original_path text,
  foto_resultado_path text,
  url_original text,
  url_resultado text,
  prompt_usado text,
  status text not null default 'concluido',
  created timestamptz not null default now(),
  updated timestamptz not null default now()
);

create index if not exists idx_simulador_historico_telefone on public.simulador_historico(telefone);
create index if not exists idx_simulador_historico_created on public.simulador_historico(created);

-- RLS is enabled for every application table. Business/financial records are
-- admin-only; public visitors only read published website content and can write
-- analytics/click events. Simulator writes will go through trusted Edge Functions.
do $$
declare
  t text;
begin
  foreach t in array array[
    'profiles','produtos','clientes_grupos','clientes','orcamento_servicos',
    'metodos_pagamento','orcamento_configuracoes','orcamentos','pagamentos_parcelas',
    'vendas','regras_alerta','alertas','importacoes','site_categories','site_services',
    'site_portfolio','site_testimonials','partner_categories','site_partners',
    'partner_clicks','site_settings','site_analytics_events','simulador_clientes',
    'simulador_historico'
  ] loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

drop policy if exists profiles_read_self_or_admin on public.profiles;
create policy profiles_read_self_or_admin on public.profiles
for select to authenticated
using (id = auth.uid() or public.is_admin());
drop policy if exists profiles_admin_manage on public.profiles;
create policy profiles_admin_manage on public.profiles
for all to authenticated
using (public.is_admin())
with check (public.is_admin());

-- All internal application records are available to the trusted administrator only.
do $$
declare
  t text;
begin
  foreach t in array array[
    'produtos','clientes_grupos','clientes','orcamento_servicos','metodos_pagamento',
    'orcamento_configuracoes','orcamentos','pagamentos_parcelas','vendas',
    'regras_alerta','alertas','importacoes','simulador_clientes','simulador_historico'
  ] loop
    execute format('drop policy if exists admin_manage_all on public.%I', t);
    execute format(
      'create policy admin_manage_all on public.%I for all to authenticated using (public.is_admin()) with check (public.is_admin())',
      t
    );
  end loop;
end $$;

-- Published website content is readable by visitors; edits remain admin-only.
drop policy if exists public_read_active on public.site_categories;
create policy public_read_active on public.site_categories for select to anon, authenticated using (ativa or public.is_admin());
drop policy if exists admin_manage_all on public.site_categories;
create policy admin_manage_all on public.site_categories for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists public_read_active on public.site_services;
create policy public_read_active on public.site_services for select to anon, authenticated using (ativo or public.is_admin());
drop policy if exists admin_manage_all on public.site_services;
create policy admin_manage_all on public.site_services for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists public_read_active on public.site_portfolio;
create policy public_read_active on public.site_portfolio for select to anon, authenticated using (ativo or public.is_admin());
drop policy if exists admin_manage_all on public.site_portfolio;
create policy admin_manage_all on public.site_portfolio for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists public_read_approved on public.site_testimonials;
create policy public_read_approved on public.site_testimonials for select to anon, authenticated using (aprovado or public.is_admin());
drop policy if exists admin_manage_all on public.site_testimonials;
create policy admin_manage_all on public.site_testimonials for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists public_read_active on public.partner_categories;
create policy public_read_active on public.partner_categories for select to anon, authenticated using (ativa or public.is_admin());
drop policy if exists admin_manage_all on public.partner_categories;
create policy admin_manage_all on public.partner_categories for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists public_read_active on public.site_partners;
create policy public_read_active on public.site_partners for select to anon, authenticated using (ativo or public.is_admin());
drop policy if exists admin_manage_all on public.site_partners;
create policy admin_manage_all on public.site_partners for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists public_read_primary_settings on public.site_settings;
create policy public_read_primary_settings on public.site_settings for select to anon, authenticated using (chave = 'principal' or public.is_admin());
drop policy if exists admin_manage_all on public.site_settings;
create policy admin_manage_all on public.site_settings for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists public_insert_analytics on public.site_analytics_events;
create policy public_insert_analytics on public.site_analytics_events
for insert to anon, authenticated
with check (tipo in ('pageview', 'click_whatsapp', 'contato', 'click_servico', 'view_categoria'));
drop policy if exists admin_read_analytics on public.site_analytics_events;
create policy admin_read_analytics on public.site_analytics_events
for select to authenticated using (public.is_admin());
drop policy if exists admin_manage_analytics on public.site_analytics_events;
create policy admin_manage_analytics on public.site_analytics_events
for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists public_insert_partner_clicks on public.partner_clicks;
create policy public_insert_partner_clicks on public.partner_clicks
for insert to anon, authenticated with check (char_length(parceiro_id) between 1 and 100);
drop policy if exists admin_manage_partner_clicks on public.partner_clicks;
create policy admin_manage_partner_clicks on public.partner_clicks
for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Public images/videos live in the site-media bucket. Simulator files remain private.
insert into storage.buckets (id, name, public, file_size_limit)
values ('site-media', 'site-media', true, 52428800)
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit;

insert into storage.buckets (id, name, public, file_size_limit)
values ('simulator-private', 'simulator-private', false, 52428800)
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit;

drop policy if exists public_read_site_media on storage.objects;
create policy public_read_site_media on storage.objects
for select to anon, authenticated using (bucket_id = 'site-media');
drop policy if exists admin_insert_media on storage.objects;
create policy admin_insert_media on storage.objects
for insert to authenticated with check (
  bucket_id in ('site-media', 'simulator-private') and public.is_admin()
);
drop policy if exists admin_update_media on storage.objects;
create policy admin_update_media on storage.objects
for update to authenticated using (
  bucket_id in ('site-media', 'simulator-private') and public.is_admin()
) with check (
  bucket_id in ('site-media', 'simulator-private') and public.is_admin()
);
drop policy if exists admin_delete_media on storage.objects;
create policy admin_delete_media on storage.objects
for delete to authenticated using (
  bucket_id in ('site-media', 'simulator-private') and public.is_admin()
);

-- SQL privileges are required in addition to RLS policies. The policies above
-- restrict actual rows/operations; these grants make the Data API roles eligible
-- to reach the tables in the first place.
grant usage on schema public to anon, authenticated;
grant execute on function public.is_admin() to anon, authenticated;

grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.produtos to authenticated;
grant select, insert, update, delete on public.clientes_grupos to authenticated;
grant select, insert, update, delete on public.clientes to authenticated;
grant select, insert, update, delete on public.orcamento_servicos to authenticated;
grant select, insert, update, delete on public.metodos_pagamento to authenticated;
grant select, insert, update, delete on public.orcamento_configuracoes to authenticated;
grant select, insert, update, delete on public.orcamentos to authenticated;
grant select, insert, update, delete on public.pagamentos_parcelas to authenticated;
grant select, insert, update, delete on public.vendas to authenticated;
grant select, insert, update, delete on public.regras_alerta to authenticated;
grant select, insert, update, delete on public.alertas to authenticated;
grant select, insert, update, delete on public.importacoes to authenticated;

grant select on public.site_categories to anon, authenticated;
grant insert, update, delete on public.site_categories to authenticated;
grant select on public.site_services to anon, authenticated;
grant insert, update, delete on public.site_services to authenticated;
grant select on public.site_portfolio to anon, authenticated;
grant insert, update, delete on public.site_portfolio to authenticated;
grant select on public.site_testimonials to anon, authenticated;
grant insert, update, delete on public.site_testimonials to authenticated;
grant select on public.partner_categories to anon, authenticated;
grant insert, update, delete on public.partner_categories to authenticated;
grant select on public.site_partners to anon, authenticated;
grant insert, update, delete on public.site_partners to authenticated;
grant select, insert, update, delete on public.partner_clicks to anon, authenticated;
grant select, insert, update, delete on public.site_settings to anon, authenticated;
grant select, insert, update, delete on public.site_analytics_events to anon, authenticated;

grant select, insert, update, delete on public.simulador_clientes to authenticated;
grant select, insert, update, delete on public.simulador_historico to authenticated;

grant select on storage.objects to anon, authenticated;
grant insert, update, delete on storage.objects to authenticated;

-- Keep updated timestamps aligned with the existing frontend field names.
do $$
declare
  t text;
begin
  foreach t in array array[
    'profiles','produtos','clientes_grupos','clientes','orcamento_servicos',
    'metodos_pagamento','orcamento_configuracoes','orcamentos','pagamentos_parcelas',
    'vendas','regras_alerta','alertas','importacoes','site_categories','site_services',
    'site_portfolio','site_testimonials','partner_categories','site_partners',
    'partner_clicks','site_settings','site_analytics_events','simulador_clientes',
    'simulador_historico'
  ] loop
    execute format('drop trigger if exists set_updated_timestamp on public.%I', t);
    execute format(
      'create trigger set_updated_timestamp before update on public.%I for each row execute procedure public.set_updated_timestamp()',
      t
    );
  end loop;
end $$;

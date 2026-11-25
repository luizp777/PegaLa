-- ============================================================================
-- PegaLá — Schema Supabase (PostgreSQL + Realtime + RLS + RPC + Rate Limit)
-- Execute este script no SQL Editor do seu projeto Supabase.
-- ============================================================================

create extension if not exists "pgcrypto";

-- 1. Tabela de Listas
create table if not exists public.lists (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null default 'mercado' check (type in ('mercado', 'farmacia', 'geral')),
  share_code text unique not null,
  owner_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop index if exists public.idx_lists_share_code;

-- 2. Tabela de Itens da Lista
create table if not exists public.list_items (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null references public.lists(id) on delete cascade,
  name text not null,
  normalized_name text not null,
  quantity numeric not null default 1 check (quantity > 0),
  unit text not null default 'un',
  category_id text not null default 'outros',
  is_checked boolean not null default false,
  checked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1 from pg_constraint
     where conname = 'lists_name_length' and conrelid = 'public.lists'::regclass
  ) then
    alter table public.lists add constraint lists_name_length check (char_length(trim(name)) between 1 and 80);
  end if;

  if not exists (
    select 1 from pg_constraint
     where conname = 'lists_share_code_length' and conrelid = 'public.lists'::regclass
  ) then
    alter table public.lists add constraint lists_share_code_length check (char_length(trim(share_code)) between 4 and 24);
  end if;

  if not exists (
    select 1 from pg_constraint
     where conname = 'list_items_quantity_positive' and conrelid = 'public.list_items'::regclass
  ) then
    alter table public.list_items add constraint list_items_quantity_positive check (quantity > 0);
  end if;

  if not exists (
    select 1 from pg_constraint
     where conname = 'list_items_name_length' and conrelid = 'public.list_items'::regclass
  ) then
    alter table public.list_items add constraint list_items_name_length check (char_length(trim(name)) between 1 and 120);
  end if;

  if not exists (
    select 1 from pg_constraint
     where conname = 'list_items_normalized_name_length' and conrelid = 'public.list_items'::regclass
  ) then
    alter table public.list_items add constraint list_items_normalized_name_length check (char_length(trim(normalized_name)) between 1 and 120);
  end if;

  if not exists (
    select 1 from pg_constraint
     where conname = 'list_items_unit_length' and conrelid = 'public.list_items'::regclass
  ) then
    alter table public.list_items add constraint list_items_unit_length check (char_length(trim(unit)) between 1 and 20);
  end if;
end;
$$;

create index if not exists idx_list_items_list_id on public.list_items (list_id);

-- Limpa eventuais duplicatas antigas antes de criar o índice único por (list_id, normalized_name)
delete from public.list_items a
using public.list_items b
where a.list_id = b.list_id
  and a.normalized_name = b.normalized_name
  and (
    a.updated_at < b.updated_at
    or (a.updated_at = b.updated_at and a.id::text < b.id::text)
  );

create unique index if not exists idx_list_items_list_normalized_unique
  on public.list_items (list_id, normalized_name);

-- 3. Tabela de Membros (vínculo de sessões anônimas ou contas Google)
create table if not exists public.list_members (
  list_id uuid not null references public.lists(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'editor' check (role in ('owner', 'editor')),
  joined_at timestamptz not null default now(),
  primary key (list_id, user_id)
);

-- 3b. Tabela interna de controle de tentativas de entrada por código (anti força bruta)
create table if not exists public.join_attempts (
  id bigserial primary key,
  user_id uuid not null,
  attempted_at timestamptz not null default now()
);

create index if not exists idx_join_attempts_user_time
  on public.join_attempts (user_id, attempted_at desc);

create index if not exists idx_join_attempts_attempted_at
  on public.join_attempts (attempted_at);

-- 4. Triggers de integridade, timestamps autoritativos e proteção de colunas imutáveis

-- 4a. Timestamp updated_at autoritativo no servidor (evita conflitos por relógio desalinhado)
create or replace function public.set_server_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_lists_server_updated_at on public.lists;
create trigger trg_lists_server_updated_at
  before insert or update on public.lists
  for each row
  execute function public.set_server_updated_at();

drop trigger if exists trg_list_items_server_updated_at on public.list_items;
create trigger trg_list_items_server_updated_at
  before insert or update on public.list_items
  for each row
  execute function public.set_server_updated_at();

-- 4b. Protege owner_id e share_code contra alteração indevida por convidados
create or replace function public.guard_lists_immutable_fields()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.owner_id is distinct from old.owner_id then
    raise exception 'owner_id cannot be changed' using errcode = '42501';
  end if;

  if new.share_code is distinct from old.share_code and old.owner_id is distinct from auth.uid() then
    raise exception 'Only the list owner can change share_code' using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_lists_guard_immutable on public.lists;
create trigger trg_lists_guard_immutable
  before update on public.lists
  for each row
  execute function public.guard_lists_immutable_fields();

-- 4c. Registra automaticamente o criador como owner em list_members
create or replace function public.handle_new_list_member()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.owner_id is not null then
    insert into public.list_members (list_id, user_id, role)
    values (new.id, new.owner_id, 'owner')
    on conflict (list_id, user_id) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_lists_add_owner_member on public.lists;
create trigger trg_lists_add_owner_member
  after insert on public.lists
  for each row
  execute function public.handle_new_list_member();

-- 5. RPC segura para entrar em uma lista via share_code (com rate limit anti força bruta)
create or replace function public.join_list_by_share_code(p_share_code text)
returns setof public.lists
language plpgsql
security definer
set search_path = public
as $$
declare
  v_list public.lists%rowtype;
  v_uid uuid := auth.uid();
  v_recent_attempts integer := 0;
begin
  if v_uid is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if p_share_code is null or char_length(trim(p_share_code)) < 4 or char_length(trim(p_share_code)) > 32 then
    return;
  end if;

  -- Limpa registros expirados (deste usuário > 5 min e globais > 1 hora) para evitar crescimento ilimitado
  delete from public.join_attempts
   where (user_id = v_uid and attempted_at < now() - interval '5 minutes')
      or attempted_at < now() - interval '1 hour';

  select count(*)
    into v_recent_attempts
    from public.join_attempts
   where user_id = v_uid
     and attempted_at >= now() - interval '1 minute';

  if v_recent_attempts >= 10 then
    raise exception 'Muitas tentativas. Aguarde 1 minuto e tente novamente.' using errcode = 'P0001';
  end if;

  insert into public.join_attempts (user_id) values (v_uid);

  select *
    into v_list
    from public.lists
   where share_code = upper(trim(p_share_code))
   limit 1;

  if not found then
    return;
  end if;

  insert into public.list_members (list_id, user_id, role)
  values (v_list.id, v_uid, 'editor')
  on conflict (list_id, user_id) do nothing;

  return next v_list;
end;
$$;

-- 6. Habilitar Realtime para sincronização instantânea entre dispositivos
-- REPLICA IDENTITY FULL garante que eventos DELETE incluam filtros em lists e list_items
alter table public.lists replica identity full;
alter table public.list_items replica identity full;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
     where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'lists'
  ) then
    alter publication supabase_realtime add table public.lists;
  end if;

  if not exists (
    select 1 from pg_publication_tables
     where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'list_items'
  ) then
    alter publication supabase_realtime add table public.list_items;
  end if;
end;
$$;

-- 7. Helper de autorização (evita recursão de RLS)
create or replace function public.is_list_member(p_list_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
      from public.list_members
     where list_id = p_list_id
       and user_id = auth.uid()
  );
$$;

-- 8. Row Level Security (RLS) restrita a membros e donos
-- IMPORTANTE: ative "Anonymous Sign-Ins" em Authentication -> Providers no Supabase
-- para que usuários sem conta Google também tenham auth.uid() válido.
alter table public.lists enable row level security;
alter table public.list_items enable row level security;
alter table public.list_members enable row level security;
alter table public.join_attempts enable row level security;

drop policy if exists "lists_collaborative_access" on public.lists;
drop policy if exists "list_items_collaborative_access" on public.list_items;
drop policy if exists "list_members_self_manage" on public.list_members;
drop policy if exists "lists_select_member" on public.lists;
drop policy if exists "lists_insert_authenticated" on public.lists;
drop policy if exists "lists_update_member" on public.lists;
drop policy if exists "lists_delete_owner" on public.lists;
drop policy if exists "list_items_member_access" on public.list_items;
drop policy if exists "list_members_select_self" on public.list_members;
drop policy if exists "list_members_delete_self" on public.list_members;

create policy "lists_select_member"
  on public.lists
  for select
  using (owner_id = auth.uid() or public.is_list_member(id));

create policy "lists_insert_authenticated"
  on public.lists
  for insert
  with check (auth.uid() is not null and owner_id = auth.uid());

create policy "lists_update_member"
  on public.lists
  for update
  using (owner_id = auth.uid() or public.is_list_member(id))
  with check (owner_id = auth.uid() or public.is_list_member(id));

create policy "lists_delete_owner"
  on public.lists
  for delete
  using (owner_id = auth.uid());

create policy "list_items_member_access"
  on public.list_items
  for all
  using (
    public.is_list_member(list_id)
    or exists (
      select 1 from public.lists l
       where l.id = list_id
         and l.owner_id = auth.uid()
    )
  )
  with check (
    public.is_list_member(list_id)
    or exists (
      select 1 from public.lists l
       where l.id = list_id
         and l.owner_id = auth.uid()
    )
  );

-- list_members: usuário só pode ler e sair (DELETE) do próprio vínculo de convidado; dono exclui a lista inteira
create policy "list_members_select_self"
  on public.list_members
  for select
  using (auth.uid() = user_id);

create policy "list_members_delete_self"
  on public.list_members
  for delete
  using (auth.uid() = user_id and role <> 'owner');

-- 9. Permissões explícitas para role authenticated (sessões anônimas e Google OAuth operam como authenticated)
grant usage on schema public to authenticated;
revoke all on public.lists, public.list_items, public.list_members, public.join_attempts from anon;
grant select, insert, update, delete on public.lists to authenticated;
grant select, insert, update, delete on public.list_items to authenticated;
revoke insert, update on public.list_members from authenticated;
grant select, delete on public.list_members to authenticated;
revoke all on public.join_attempts from authenticated;
revoke execute on function public.is_list_member(uuid) from public, anon;
revoke execute on function public.join_list_by_share_code(text) from public, anon;
grant execute on function public.is_list_member(uuid) to authenticated;
grant execute on function public.join_list_by_share_code(text) to authenticated;

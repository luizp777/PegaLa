-- ============================================================================
-- PegaLá — Schema Supabase (PostgreSQL + Realtime + RLS + RPC)
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

create index if not exists idx_lists_share_code on public.lists (share_code);

-- 2. Tabela de Itens da Lista
create table if not exists public.list_items (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null references public.lists(id) on delete cascade,
  name text not null,
  normalized_name text not null,
  quantity numeric not null default 1,
  unit text not null default 'un',
  category_id text not null default 'outros',
  is_checked boolean not null default false,
  checked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_list_items_list_id on public.list_items (list_id);

-- 3. Tabela de Membros (vínculo de sessões anônimas ou contas Google)
create table if not exists public.list_members (
  list_id uuid not null references public.lists(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'editor' check (role in ('owner', 'editor')),
  joined_at timestamptz not null default now(),
  primary key (list_id, user_id)
);

-- 4. Trigger: registra automaticamente o criador como owner em list_members
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

-- 5. RPC segura para entrar em uma lista via share_code (sem expor listagem pública)
create or replace function public.join_list_by_share_code(p_share_code text)
returns setof public.lists
language plpgsql
security definer
set search_path = public
as $$
declare
  v_list public.lists%rowtype;
  v_uid uuid := auth.uid();
begin
  select *
    into v_list
    from public.lists
   where share_code = upper(trim(p_share_code))
   limit 1;

  if not found then
    return;
  end if;

  if v_uid is not null then
    insert into public.list_members (list_id, user_id, role)
    values (v_list.id, v_uid, 'editor')
    on conflict (list_id, user_id) do nothing;
  end if;

  return next v_list;
end;
$$;

grant execute on function public.join_list_by_share_code(text) to anon, authenticated;

-- 6. Habilitar Realtime para sincronização instantânea entre dispositivos
-- REPLICA IDENTITY FULL garante que eventos DELETE incluam list_id para o filtro Realtime
alter table public.list_items replica identity full;
alter publication supabase_realtime add table public.lists;
alter publication supabase_realtime add table public.list_items;

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

drop policy if exists "lists_collaborative_access" on public.lists;
drop policy if exists "list_items_collaborative_access" on public.list_items;
drop policy if exists "list_members_self_manage" on public.list_members;

create policy "lists_select_member"
  on public.lists
  for select
  using (owner_id = auth.uid() or public.is_list_member(id));

create policy "lists_insert_authenticated"
  on public.lists
  for insert
  with check (auth.uid() is not null and (owner_id is null or owner_id = auth.uid()));

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
  using (public.is_list_member(list_id))
  with check (public.is_list_member(list_id));

create policy "list_members_self_manage"
  on public.list_members
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 9. Permissões explícitas para roles anon e authenticated (obrigatório no Supabase atual)
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on public.lists to anon, authenticated;
grant select, insert, update, delete on public.list_items to anon, authenticated;
grant select, insert, update, delete on public.list_members to anon, authenticated;
grant execute on function public.is_list_member(uuid) to anon, authenticated;
grant execute on function public.join_list_by_share_code(text) to anon, authenticated;

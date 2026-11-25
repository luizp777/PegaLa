-- ============================================================================
-- PegaLá — Comparador de Preços em Mercados e Farmácias Próximos
-- Tabelas: stores, store_prices, price_report_attempts, price_api_rate_limits
-- View pública: store_prices_public (security_invoker = true, omite reported_by)
-- RPCs: report_community_price, upsert_online_prices, check_price_api_rate_limit
-- ============================================================================

-- 1. Estabelecimentos físicos (populados via OSM / API server-only)
create table if not exists public.stores (
  id uuid primary key default gen_random_uuid(),
  osm_id text unique,
  name text not null check (char_length(trim(name)) between 1 and 160),
  chain_slug text,
  store_type text not null check (store_type in ('mercado', 'farmacia')),
  lat double precision not null,
  lng double precision not null,
  geohash5 text not null check (char_length(geohash5) between 4 and 8),
  cep text,
  city text,
  neighborhood text,
  fetched_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_stores_geohash_type
  on public.stores (geohash5, store_type);

create index if not exists idx_stores_type_lat_lng
  on public.stores (store_type, lat, lng);

create index if not exists idx_stores_chain_slug
  on public.stores (chain_slug)
  where chain_slug is not null;

-- 2. Preços observados (online cacheado por rede/cep_prefix ou comunidade por store_id)
create table if not exists public.store_prices (
  id uuid primary key default gen_random_uuid(),
  store_id uuid references public.stores(id) on delete cascade,
  chain_slug text,
  cep_prefix text check (cep_prefix is null or char_length(cep_prefix) = 5),
  normalized_term text not null check (char_length(trim(normalized_term)) between 1 and 120),
  product_key text not null check (char_length(trim(product_key)) between 1 and 160),
  product_title text not null check (char_length(trim(product_title)) between 1 and 240),
  brand text,
  ean text,
  pack_quantity numeric not null default 1 check (pack_quantity > 0),
  pack_unit text not null default 'un' check (char_length(trim(pack_unit)) between 1 and 20),
  price_cents integer not null check (price_cents between 10 and 5000000),
  source text not null check (source in ('online', 'community', 'nfce')),
  reported_by uuid references auth.users(id) on delete set null,
  weight numeric not null default 1.0 check (weight > 0 and weight <= 2.0),
  observed_at timestamptz not null default now(),
  expires_at timestamptz not null,
  constraint store_prices_scope_check check (
    store_id is not null or (chain_slug is not null and cep_prefix is not null)
  )
);

create unique index if not exists idx_store_prices_online_unique
  on public.store_prices (chain_slug, cep_prefix, normalized_term, product_key)
  where source = 'online';

create index if not exists idx_store_prices_term_cep_exp
  on public.store_prices (normalized_term, cep_prefix, expires_at desc);

create index if not exists idx_store_prices_store_term_exp
  on public.store_prices (store_id, normalized_term, expires_at desc);

create index if not exists idx_store_prices_expires_at
  on public.store_prices (expires_at);

-- 3. View pública com security_invoker = true (omite reported_by)
create or replace view public.store_prices_public
with (security_invoker = true) as
select
  id,
  store_id,
  chain_slug,
  cep_prefix,
  normalized_term,
  product_key,
  product_title,
  brand,
  ean,
  pack_quantity,
  pack_unit,
  price_cents,
  source,
  weight,
  observed_at,
  expires_at
from public.store_prices
where expires_at > now();

-- 4. Controle de tentativas de contribuição (anti-spam / rate limit)
create table if not exists public.price_report_attempts (
  id bigserial primary key,
  user_id uuid not null,
  attempted_at timestamptz not null default now()
);

create index if not exists idx_price_report_attempts_user_time
  on public.price_report_attempts (user_id, attempted_at desc);

-- 5. Rate limit genérico para endpoints /api/prices/* (por usuário ou hash de IP)
create table if not exists public.price_api_rate_limits (
  id bigserial primary key,
  bucket_key text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_price_api_rate_limits_bucket_time
  on public.price_api_rate_limits (bucket_key, created_at desc);

-- 6. RPC server-only para upsert de cache online (resolve ON CONFLICT com índice parcial)
create or replace function public.upsert_online_prices(p_rows jsonb)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer := 0;
begin
  if p_rows is null or jsonb_typeof(p_rows) <> 'array' then
    return 0;
  end if;

  insert into public.store_prices (
    store_id,
    chain_slug,
    cep_prefix,
    normalized_term,
    product_key,
    product_title,
    brand,
    ean,
    pack_quantity,
    pack_unit,
    price_cents,
    source,
    weight,
    observed_at,
    expires_at
  )
  select
    null,
    r->>'chain_slug',
    r->>'cep_prefix',
    r->>'normalized_term',
    r->>'product_key',
    r->>'product_title',
    nullif(r->>'brand', ''),
    nullif(r->>'ean', ''),
    greatest(coalesce((r->>'pack_quantity')::numeric, 1), 0.01),
    coalesce(nullif(r->>'pack_unit', ''), 'un'),
    (r->>'price_cents')::integer,
    'online',
    1.0,
    coalesce((r->>'observed_at')::timestamptz, now()),
    (r->>'expires_at')::timestamptz
  from jsonb_array_elements(p_rows) as r
  where (r->>'price_cents')::integer between 10 and 5000000
  on conflict (chain_slug, cep_prefix, normalized_term, product_key)
  where source = 'online'
  do update set
    product_title = excluded.product_title,
    brand = excluded.brand,
    ean = excluded.ean,
    pack_quantity = excluded.pack_quantity,
    pack_unit = excluded.pack_unit,
    price_cents = excluded.price_cents,
    observed_at = excluded.observed_at,
    expires_at = excluded.expires_at;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- 7. RPC server-only para rate limit atômico com limpeza automática
create or replace function public.check_price_api_rate_limit(
  p_bucket_key text,
  p_max_per_hour integer
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current integer := 0;
begin
  delete from public.price_api_rate_limits
   where id in (
     select id from public.price_api_rate_limits
      where created_at < now() - interval '2 hours'
      limit 500
   );

  select count(*)
    into v_current
    from public.price_api_rate_limits
   where bucket_key = p_bucket_key
     and created_at >= now() - interval '1 hour';

  if v_current >= p_max_per_hour then
    return false;
  end if;

  insert into public.price_api_rate_limits (bucket_key) values (p_bucket_key);
  return true;
end;
$$;

-- 8. RPC segura para registro de preço colaborativo (retorna jsonb sem reported_by)
drop function if exists public.report_community_price(uuid, text, text, numeric, text, integer, text, text);

create or replace function public.report_community_price(
  p_store_id uuid,
  p_normalized_term text,
  p_product_title text,
  p_pack_quantity numeric,
  p_pack_unit text,
  p_price_cents integer,
  p_product_key text default null,
  p_brand text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_store public.stores%rowtype;
  v_recent_count integer := 0;
  v_median numeric;
  v_valid_count integer := 0;
  v_user_created_at timestamptz;
  v_is_anon boolean := true;
  v_weight numeric := 1.0;
  v_term text := lower(trim(coalesce(p_normalized_term, '')));
  v_title text := trim(coalesce(p_product_title, ''));
  v_unit text := coalesce(nullif(trim(p_pack_unit), ''), 'un');
  v_qty numeric := greatest(coalesce(p_pack_quantity, 1), 0.01);
  v_key text;
  v_inserted public.store_prices%rowtype;
begin
  if v_uid is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if char_length(v_term) < 1 or char_length(v_term) > 120 then
    raise exception 'Termo inválido' using errcode = 'P0001';
  end if;

  if char_length(v_title) < 1 or char_length(v_title) > 240 then
    raise exception 'Título do produto inválido' using errcode = 'P0001';
  end if;

  if p_price_cents is null or p_price_cents < 10 or p_price_cents > 5000000 then
    raise exception 'Preço fora da faixa permitida (R$ 0,10 a R$ 50.000,00)' using errcode = 'P0001';
  end if;

  select * into v_store from public.stores where id = p_store_id limit 1;
  if not found then
    raise exception 'Estabelecimento não encontrado' using errcode = 'P0001';
  end if;

  delete from public.store_prices
   where id in (
     select id from public.store_prices
      where expires_at < now() - interval '1 day'
      limit 500
   );

  delete from public.price_report_attempts
   where attempted_at < now() - interval '2 hours';

  select count(*)
    into v_recent_count
    from public.price_report_attempts
   where user_id = v_uid
     and attempted_at >= now() - interval '1 hour';

  if v_recent_count >= 30 then
    raise exception 'Limite de 30 preços por hora atingido. Tente novamente mais tarde.' using errcode = 'P0001';
  end if;

  insert into public.price_report_attempts (user_id) values (v_uid);

  select
    count(*),
    percentile_cont(0.5) within group (order by sp.price_cents)
    into v_valid_count, v_median
    from public.store_prices sp
   where sp.normalized_term = v_term
     and sp.expires_at > now()
     and (
       sp.store_id = p_store_id
       or (v_store.cep is not null and sp.cep_prefix = left(regexp_replace(v_store.cep, '\D', '', 'g'), 5))
     );

  if v_valid_count >= 2 and v_median is not null and v_median > 0 then
    if p_price_cents < (v_median * 0.2) or p_price_cents > (v_median * 4.0) then
      raise exception 'Valor muito distante dos preços da região. Confira o preço digitado.' using errcode = 'P0001';
    end if;
  end if;

  select u.created_at, coalesce(u.is_anonymous, true)
    into v_user_created_at, v_is_anon
    from auth.users u
   where u.id = v_uid;

  if v_is_anon and v_user_created_at is not null and v_user_created_at > now() - interval '24 hours' then
    v_weight := 0.5;
  end if;

  v_key := coalesce(
    nullif(trim(p_product_key), ''),
    regexp_replace(lower(v_title), '[^a-z0-9]+', '-', 'g')
  );

  insert into public.store_prices (
    store_id,
    chain_slug,
    cep_prefix,
    normalized_term,
    product_key,
    product_title,
    brand,
    pack_quantity,
    pack_unit,
    price_cents,
    source,
    reported_by,
    weight,
    observed_at,
    expires_at
  ) values (
    v_store.id,
    v_store.chain_slug,
    case
      when v_store.cep is not null and char_length(regexp_replace(v_store.cep, '\D', '', 'g')) >= 5
        then left(regexp_replace(v_store.cep, '\D', '', 'g'), 5)
      else null
    end,
    v_term,
    left(v_key, 160),
    v_title,
    nullif(trim(p_brand), ''),
    v_qty,
    v_unit,
    p_price_cents,
    'community',
    v_uid,
    v_weight,
    now(),
    now() + interval '14 days'
  )
  returning * into v_inserted;

  return jsonb_build_object(
    'id', v_inserted.id,
    'store_id', v_inserted.store_id,
    'chain_slug', v_inserted.chain_slug,
    'cep_prefix', v_inserted.cep_prefix,
    'normalized_term', v_inserted.normalized_term,
    'product_key', v_inserted.product_key,
    'product_title', v_inserted.product_title,
    'brand', v_inserted.brand,
    'ean', v_inserted.ean,
    'pack_quantity', v_inserted.pack_quantity,
    'pack_unit', v_inserted.pack_unit,
    'price_cents', v_inserted.price_cents,
    'source', v_inserted.source,
    'weight', v_inserted.weight,
    'observed_at', v_inserted.observed_at,
    'expires_at', v_inserted.expires_at
  );
end;
$$;

-- 9. RLS e permissões explícitas
alter table public.stores enable row level security;
alter table public.store_prices enable row level security;
alter table public.price_report_attempts enable row level security;
alter table public.price_api_rate_limits enable row level security;

drop policy if exists "stores_select_authenticated" on public.stores;
create policy "stores_select_authenticated"
  on public.stores
  for select
  using (auth.uid() is not null);

revoke all on public.stores from public, anon, authenticated;
grant select on public.stores to authenticated;

revoke all on public.store_prices from public, anon, authenticated;
revoke all on public.store_prices_public from public, anon, authenticated;

revoke all on public.price_report_attempts from public, anon, authenticated;
revoke all on public.price_api_rate_limits from public, anon, authenticated;

revoke execute on function public.upsert_online_prices(jsonb) from public, anon, authenticated;
revoke execute on function public.check_price_api_rate_limit(text, integer) from public, anon, authenticated;
revoke execute on function public.report_community_price(uuid, text, text, numeric, text, integer, text, text) from public, anon;
grant execute on function public.report_community_price(uuid, text, text, numeric, text, integer, text, text) to authenticated;

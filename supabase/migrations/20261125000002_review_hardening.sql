-- ============================================================================
-- PegaLá — Hardening pós-code-review:
-- 1. Permite ON DELETE SET NULL em public.lists.owner_id no trigger imutável
-- 2. Advisory locks anti-TOCTOU nos rate limits
-- 3. Índices de expiração em price_api_rate_limits e price_report_attempts
-- 4. Normalização de unidades (kg/g, L/ml) e limites em report_community_price
-- 5. Proteção de product_key vazio em upsert_online_prices e bounds de lat/lng
-- ============================================================================

-- 1. Trigger guard_lists_immutable_fields compatível com ON DELETE SET NULL
create or replace function public.guard_lists_immutable_fields()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.owner_id is distinct from old.owner_id
     and not (new.owner_id is null and auth.uid() is null) then
    raise exception 'owner_id cannot be changed' using errcode = '42501';
  end if;

  if new.share_code is distinct from old.share_code and old.owner_id is distinct from auth.uid() then
    raise exception 'Only the list owner can change share_code' using errcode = '42501';
  end if;

  return new;
end;
$$;

-- 2. Índices para evitar seq scans nas limpezas de rate limit
create index if not exists idx_price_api_rate_limits_created_at
  on public.price_api_rate_limits (created_at);

create index if not exists idx_price_report_attempts_attempted_at
  on public.price_report_attempts (attempted_at);

-- 3. Bounds geográficos em public.stores
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'stores_lat_range_check'
  ) then
    alter table public.stores
      add constraint stores_lat_range_check check (lat between -90 and 90);
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'stores_lng_range_check'
  ) then
    alter table public.stores
      add constraint stores_lng_range_check check (lng between -180 and 180);
  end if;
end $$;

-- 4. Advisory lock em join_list_by_share_code
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

  perform pg_advisory_xact_lock(hashtext('join:' || v_uid::text));

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

-- 5. Advisory lock em check_price_api_rate_limit
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
  perform pg_advisory_xact_lock(hashtext('ratelimit:' || coalesce(p_bucket_key, '')));

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

-- 6. Proteção de product_key vazio em upsert_online_prices
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
    left(trim(r->>'product_key'), 160),
    left(trim(r->>'product_title'), 240),
    nullif(r->>'brand', ''),
    nullif(r->>'ean', ''),
    least(greatest(coalesce((r->>'pack_quantity')::numeric, 1), 0.01), 10000),
    left(coalesce(nullif(trim(r->>'pack_unit'), ''), 'un'), 20),
    (r->>'price_cents')::integer,
    'online',
    1.0,
    coalesce((r->>'observed_at')::timestamptz, now()),
    (r->>'expires_at')::timestamptz
  from jsonb_array_elements(p_rows) as r
  where (r->>'price_cents')::integer between 10 and 5000000
    and char_length(trim(coalesce(r->>'product_key', ''))) >= 1
    and char_length(trim(coalesce(r->>'product_title', ''))) >= 1
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

-- 7. Normalização de unidades base (kg/g, L/ml), advisory lock e teto em report_community_price
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
  v_median_unit_price numeric;
  v_valid_count integer := 0;
  v_user_created_at timestamptz;
  v_is_anon boolean := true;
  v_weight numeric := 1.0;
  v_term text := lower(trim(coalesce(p_normalized_term, '')));
  v_title text := trim(coalesce(p_product_title, ''));
  v_raw_unit text := lower(coalesce(nullif(trim(p_pack_unit), ''), 'un'));
  v_unit text;
  v_qty numeric := least(greatest(coalesce(p_pack_quantity, 1), 0.01), 10000);
  v_base_group text;
  v_base_qty numeric;
  v_unit_price numeric;
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

  if char_length(v_raw_unit) > 20 then
    raise exception 'Unidade inválida' using errcode = 'P0001';
  end if;

  if p_price_cents is null or p_price_cents < 10 or p_price_cents > 5000000 then
    raise exception 'Preço fora da faixa permitida (R$ 0,10 a R$ 50.000,00)' using errcode = 'P0001';
  end if;

  -- Normaliza unidade e escala base para comparação consistente de outliers
  v_unit := case v_raw_unit
    when 'gr' then 'g'
    when 'lt' then 'L'
    when 'litro' then 'L'
    when 'litros' then 'L'
    when 'l' then 'L'
    when 'und' then 'un'
    else v_raw_unit
  end;

  if v_unit = 'kg' then
    v_base_group := 'mass';
    v_base_qty := v_qty;
  elsif v_unit = 'g' then
    v_base_group := 'mass';
    v_base_qty := v_qty / 1000.0;
  elsif v_unit = 'L' then
    v_base_group := 'volume';
    v_base_qty := v_qty;
  elsif v_unit = 'ml' then
    v_base_group := 'volume';
    v_base_qty := v_qty / 1000.0;
  else
    v_base_group := v_unit;
    v_base_qty := v_qty;
  end if;

  v_unit_price := p_price_cents / greatest(v_base_qty, 0.0001);

  select * into v_store from public.stores where id = p_store_id limit 1;
  if not found then
    raise exception 'Estabelecimento não encontrado' using errcode = 'P0001';
  end if;

  perform pg_advisory_xact_lock(hashtext('report:' || v_uid::text));

  delete from public.store_prices
   where id in (
     select id from public.store_prices
      where expires_at < now() - interval '1 day'
      limit 500
   );

  delete from public.price_report_attempts
   where id in (
     select id from public.price_report_attempts
      where attempted_at < now() - interval '2 hours'
      limit 500
   );

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
    percentile_cont(0.5) within group (
      order by (
        sp.price_cents / greatest(
          case lower(sp.pack_unit)
            when 'g' then sp.pack_quantity / 1000.0
            when 'gr' then sp.pack_quantity / 1000.0
            when 'ml' then sp.pack_quantity / 1000.0
            else sp.pack_quantity
          end,
          0.0001
        )
      )
    )
    into v_valid_count, v_median_unit_price
    from public.store_prices sp
   where sp.normalized_term = v_term
     and sp.weight >= 1.0
     and sp.expires_at > now()
     and (
       case lower(sp.pack_unit)
         when 'kg' then 'mass'
         when 'g' then 'mass'
         when 'gr' then 'mass'
         when 'l' then 'volume'
         when 'lt' then 'volume'
         when 'litro' then 'volume'
         when 'litros' then 'volume'
         when 'ml' then 'volume'
         when 'und' then 'un'
         else lower(sp.pack_unit)
       end
     ) = v_base_group
     and (
       sp.store_id = p_store_id
       or (v_store.cep is not null and sp.cep_prefix = left(regexp_replace(v_store.cep, '\D', '', 'g'), 5))
     );

  if v_valid_count >= 2 and v_median_unit_price is not null and v_median_unit_price > 0 then
    if v_unit_price < (v_median_unit_price * 0.2) or v_unit_price > (v_median_unit_price * 4.0) then
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
    nullif(trim(both '-' from regexp_replace(lower(v_title), '[^a-z0-9]+', '-', 'g')), ''),
    'item-' || substr(md5(v_title), 1, 12)
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

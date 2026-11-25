-- ============================================================================
-- PegaLá — Melhoria de precisão do comparador de preços:
-- 1. Adiciona coluna `retail_category` em `public.store_prices`
-- 2. Atualiza view `public.store_prices_public` e RPC `public.upsert_online_prices`
-- 3. Remove cache antigo `source = 'online'` sem `retail_category` (preservando comunidade)
-- ============================================================================

alter table public.store_prices
  add column if not exists retail_category text;

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
  expires_at,
  retail_category
from public.store_prices
where expires_at > now();

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
    retail_category,
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
    nullif(left(trim(coalesce(r->>'retail_category', '')), 240), ''),
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
    retail_category = excluded.retail_category,
    pack_quantity = excluded.pack_quantity,
    pack_unit = excluded.pack_unit,
    price_cents = excluded.price_cents,
    observed_at = excluded.observed_at,
    expires_at = excluded.expires_at;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- Limpa cache online antigo (máximo 8 itens e sem retail_category), preservando preços colaborativos
delete from public.store_prices
where source = 'online';

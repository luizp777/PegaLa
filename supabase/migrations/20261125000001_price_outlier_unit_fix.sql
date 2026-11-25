-- ============================================================================
-- PegaLá — Normaliza validação anti-outlier por unidade/embalagem em
-- `public.report_community_price` para evitar rejeição de pacotes menores/maiores
-- (ex.: Arroz 1kg vs Arroz 5kg).
-- ============================================================================

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
  v_unit text := lower(coalesce(nullif(trim(p_pack_unit), ''), 'un'));
  v_qty numeric := greatest(coalesce(p_pack_quantity, 1), 0.01);
  v_unit_price numeric := p_price_cents / greatest(coalesce(p_pack_quantity, 1), 0.01);
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
    percentile_cont(0.5) within group (order by (sp.price_cents / greatest(sp.pack_quantity, 0.01)))
    into v_valid_count, v_median_unit_price
    from public.store_prices sp
   where sp.normalized_term = v_term
     and lower(sp.pack_unit) = v_unit
     and sp.expires_at > now()
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

-- ============================================================================
-- PegaLá — Concede EXECUTE explícito para `service_role` nas RPCs server-only
-- (`check_price_api_rate_limit` e `upsert_online_prices`), já que `REVOKE FROM public`
-- revoga também o acesso implícito de `service_role`.
-- ============================================================================

grant execute on function public.check_price_api_rate_limit(text, integer) to service_role;
grant execute on function public.upsert_online_prices(jsonb) to service_role;

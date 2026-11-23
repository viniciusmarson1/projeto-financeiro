-- The server API accesses financial data with the Supabase service-role key,
-- which bypasses RLS. Do not grant direct database access to authenticated
-- users: an accidentally created account must not be able to query data via
-- the public Supabase API.
drop policy if exists "permit auth access" on public.app_settings;
drop policy if exists "permit auth access" on public.financial_movements;
drop policy if exists "permit auth access" on public.recurring_fixed_expenses;
drop policy if exists "permit auth access" on public.monthly_balances;

drop policy if exists "authenticated users can access settings" on public.app_settings;
drop policy if exists "authenticated users can access movements" on public.financial_movements;
drop policy if exists "authenticated users can access recurring expenses" on public.recurring_fixed_expenses;
drop policy if exists "authenticated users can access monthly balances" on public.monthly_balances;

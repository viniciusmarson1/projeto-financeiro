-- Run this migration in projects that previously applied the old 002 policy.
-- Financial data is accessed only by the server API using the service-role
-- key, which bypasses RLS. No authenticated user should access it directly.
drop policy if exists "authenticated users can access settings" on public.app_settings;
drop policy if exists "authenticated users can access movements" on public.financial_movements;
drop policy if exists "authenticated users can access recurring expenses" on public.recurring_fixed_expenses;
drop policy if exists "authenticated users can access monthly balances" on public.monthly_balances;

-- Execute esta migração se a 001 já tiver sido aplicada com as políticas antigas.
drop policy if exists "permit auth access" on public.app_settings;
drop policy if exists "permit auth access" on public.financial_movements;
drop policy if exists "permit auth access" on public.recurring_fixed_expenses;
drop policy if exists "permit auth access" on public.monthly_balances;

drop policy if exists "authenticated users can access settings" on public.app_settings;
drop policy if exists "authenticated users can access movements" on public.financial_movements;
drop policy if exists "authenticated users can access recurring expenses" on public.recurring_fixed_expenses;
drop policy if exists "authenticated users can access monthly balances" on public.monthly_balances;

create policy "authenticated users can access settings" on public.app_settings
  for all to authenticated using (true) with check (true);
create policy "authenticated users can access movements" on public.financial_movements
  for all to authenticated using (true) with check (true);
create policy "authenticated users can access recurring expenses" on public.recurring_fixed_expenses
  for all to authenticated using (true) with check (true);
create policy "authenticated users can access monthly balances" on public.monthly_balances
  for all to authenticated using (true) with check (true);

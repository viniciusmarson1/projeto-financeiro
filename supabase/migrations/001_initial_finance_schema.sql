create extension if not exists pgcrypto;

create table if not exists public.app_settings (
  id uuid primary key default gen_random_uuid(),
  family_name text not null default 'Família',
  opening_balance integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.financial_movements (
  id uuid primary key default gen_random_uuid(),
  month_key text not null,
  description text not null,
  category text not null,
  amount integer not null check (amount >= 0),
  date date not null,
  type text not null check (type in ('income', 'expense')),
  person text not null check (person in ('eu', 'esposa', 'familia')),
  status text not null check (status in ('planned', 'received', 'paid', 'pending')),
  recurring boolean not null default false,
  source text not null default 'custom',
  observed text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.recurring_fixed_expenses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null,
  default_amount integer not null,
  due_day integer not null,
  recurring_monthly boolean not null default true,
  person text not null check (person in ('eu', 'esposa', 'familia')),
  active boolean not null default true,
  observed text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.monthly_balances (
  id uuid primary key default gen_random_uuid(),
  month_key text not null unique,
  opening_balance integer not null default 0,
  adjusted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists financial_movements_month_key_idx on public.financial_movements (month_key);
create index if not exists financial_movements_date_idx on public.financial_movements (date);
create index if not exists recurring_fixed_expenses_active_idx on public.recurring_fixed_expenses (active);

alter table public.app_settings enable row level security;
alter table public.financial_movements enable row level security;
alter table public.recurring_fixed_expenses enable row level security;
alter table public.monthly_balances enable row level security;

create policy "authenticated users can access settings" on public.app_settings
  for all to authenticated using (true) with check (true);
create policy "authenticated users can access movements" on public.financial_movements
  for all to authenticated using (true) with check (true);
create policy "authenticated users can access recurring expenses" on public.recurring_fixed_expenses
  for all to authenticated using (true) with check (true);
create policy "authenticated users can access monthly balances" on public.monthly_balances
  for all to authenticated using (true) with check (true);

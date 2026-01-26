-- Tabellen
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('admin','sales','azubi')) default 'azubi',
  created_at timestamptz default now()
);

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  street text,
  zip text,
  city text,
  country text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.contacts (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  name text not null,
  title text,
  email text,
  phone text,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(customer_id, name)
);

create table if not exists public.action_flags (
  contact_id uuid primary key references public.contacts(id) on delete cascade,

  your_logistics boolean default false,
  newsletter boolean default false,
  pegelstand boolean default false,
  osteraktion boolean default false,
  spargelaktion boolean default false,
  herbstaktion boolean default false,
  adventskalender boolean default false,

  wandkalender_4m boolean default false,
  wandkalender_6m boolean default false,
  wandkalender_spezial boolean default false,
  tischkalender_hoch boolean default false,
  tischkalender_quer boolean default false,
  personalisierte_kalender boolean default false,
  weihnachtsaktion boolean default false,

  updated_at timestamptz default now()
);

-- Trigger updated_at
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_customers_updated on public.customers;
create trigger trg_customers_updated before update on public.customers
for each row execute function public.set_updated_at();

drop trigger if exists trg_contacts_updated on public.contacts;
create trigger trg_contacts_updated before update on public.contacts
for each row execute function public.set_updated_at();

-- RLS
alter table public.profiles enable row level security;
alter table public.customers enable row level security;
alter table public.contacts enable row level security;
alter table public.action_flags enable row level security;

-- Helper: current user role
create or replace function public.current_role()
returns text as $$
  select role from public.profiles where id = auth.uid()
$$ language sql stable;

-- Profiles: user can read own profile; admin can read all
drop policy if exists "profiles_read_own" on public.profiles;
create policy "profiles_read_own" on public.profiles
for select using (id = auth.uid() or public.current_role() = 'admin');

drop policy if exists "profiles_admin_write" on public.profiles;
create policy "profiles_admin_write" on public.profiles
for all using (public.current_role() = 'admin') with check (public.current_role() = 'admin');

-- Customers: all authenticated can read
drop policy if exists "customers_read" on public.customers;
create policy "customers_read" on public.customers
for select using (auth.role() = 'authenticated');

-- Customers: only admin/sales can write
drop policy if exists "customers_write" on public.customers;
create policy "customers_write" on public.customers
for insert with check (public.current_role() in ('admin','sales'));
create policy "customers_update" on public.customers
for update using (public.current_role() in ('admin','sales')) with check (public.current_role() in ('admin','sales'));
create policy "customers_delete" on public.customers
for delete using (public.current_role() in ('admin','sales'));

-- Contacts: all authenticated can read
drop policy if exists "contacts_read" on public.contacts;
create policy "contacts_read" on public.contacts
for select using (auth.role() = 'authenticated');

-- Contacts: only admin/sales can write
drop policy if exists "contacts_write" on public.contacts;
create policy "contacts_insert" on public.contacts
for insert with check (public.current_role() in ('admin','sales'));
create policy "contacts_update" on public.contacts
for update using (public.current_role() in ('admin','sales')) with check (public.current_role() in ('admin','sales'));
create policy "contacts_delete" on public.contacts
for delete using (public.current_role() in ('admin','sales'));

-- Flags: all authenticated can read
drop policy if exists "flags_read" on public.action_flags;
create policy "flags_read" on public.action_flags
for select using (auth.role() = 'authenticated');

-- Flags: only admin/sales can write
drop policy if exists "flags_write" on public.action_flags;
create policy "flags_insert" on public.action_flags
for insert with check (public.current_role() in ('admin','sales'));
create policy "flags_update" on public.action_flags
for update using (public.current_role() in ('admin','sales')) with check (public.current_role() in ('admin','sales'));
create policy "flags_delete" on public.action_flags
for delete using (public.current_role() in ('admin','sales'));

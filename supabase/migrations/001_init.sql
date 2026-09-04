-- =============================================================================
-- MASALAN BUSINESS ENTERPRISE
-- Initial schema migration: tables, foreign keys, constraints, indexes,
-- functions, triggers, Row Level Security (RLS) and seed data.
--
-- Apply via Supabase Dashboard -> SQL Editor (paste & run), or:
--   supabase link --project-ref gxrnlrogpmlagzmwlwjp
--   supabase db push
--
-- Idempotent: safe to run more than once.
-- =============================================================================

create extension if not exists pgcrypto;

-- -----------------------------------------------------------------------------
-- Helper: bump updated_at
-- -----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- PROFILES (linked 1:1 to Supabase Auth users)
-- -----------------------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text not null default '',
  email       text not null default '',
  role        text not null default 'manager'
              check (role in ('owner', 'manager', 'developer')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Create a profile row automatically when an Auth user is created.
-- New sign-ups are assigned the low-privilege 'manager' role; the Owner
-- promotes users explicitly (the very first Owner is bootstrapped manually).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
begin
  insert into public.profiles (id, full_name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(new.email, ''),
    'manager'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- -----------------------------------------------------------------------------
-- Role helpers (used by RLS policies)
-- -----------------------------------------------------------------------------
create or replace function public.is_owner()
returns boolean
language sql
stable
security definer
set search_path = public, pg_catalog
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'owner'
  );
$$;

create or replace function public.is_manager()
returns boolean
language sql
stable
security definer
set search_path = public, pg_catalog
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'manager'
  );
$$;

create or replace function public.is_developer()
returns boolean
language sql
stable
security definer
set search_path = public, pg_catalog
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'developer'
  );
$$;

create or replace function public.is_owner_or_manager()
returns boolean
language sql
stable
security definer
set search_path = public, pg_catalog
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('owner', 'manager')
  );
$$;

-- -----------------------------------------------------------------------------
-- BUSINESSES
-- -----------------------------------------------------------------------------
create table if not exists public.businesses (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  description text,
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

drop trigger if exists businesses_set_updated_at on public.businesses;
create trigger businesses_set_updated_at
  before update on public.businesses
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- PRODUCTS
-- -----------------------------------------------------------------------------
create table if not exists public.products (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name        text not null,
  price       numeric(14,2) not null check (price >= 0),
  unit        text not null default 'unit',
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (business_id, name, price)
);

drop trigger if exists products_set_updated_at on public.products;
create trigger products_set_updated_at
  before update on public.products
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- CUSTOMERS
-- -----------------------------------------------------------------------------
create table if not exists public.customers (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  customer_type text not null default 'individual'
                check (customer_type in ('individual', 'business')),
  business_name text,
  phone         text,
  email         text,
  address       text,
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

drop trigger if exists customers_set_updated_at on public.customers;
create trigger customers_set_updated_at
  before update on public.customers
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- STAFF (workers — NO Supabase Auth accounts)
-- -----------------------------------------------------------------------------
create table if not exists public.staff (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid references public.businesses(id) on delete set null,
  name        text not null,
  phone       text,
  position    text,
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

drop trigger if exists staff_set_updated_at on public.staff;
create trigger staff_set_updated_at
  before update on public.staff
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- SALES
-- -----------------------------------------------------------------------------
create table if not exists public.sales (
  id                 uuid primary key default gen_random_uuid(),
  business_id        uuid not null references public.businesses(id),
  customer_id        uuid not null references public.customers(id),
  created_by         uuid references public.profiles(id) on delete set null,
  staff_id           uuid references public.staff(id) on delete set null,
  sale_date          timestamptz not null default now(),
  subtotal           numeric(14,2) not null default 0 check (subtotal >= 0),
  total_amount       numeric(14,2) not null default 0 check (total_amount >= 0),
  amount_paid        numeric(14,2) not null default 0 check (amount_paid >= 0),
  amount_outstanding numeric(14,2) not null default 0 check (amount_outstanding >= 0),
  payment_status     text not null default 'credit'
                     check (payment_status in ('paid', 'partial', 'credit')),
  notes              text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

drop trigger if exists sales_set_updated_at on public.sales;
create trigger sales_set_updated_at
  before update on public.sales
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- SALE ITEMS
-- -----------------------------------------------------------------------------
create table if not exists public.sale_items (
  id         uuid primary key default gen_random_uuid(),
  sale_id    uuid not null references public.sales(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  quantity   numeric(12,3) not null check (quantity > 0),
  unit_price numeric(14,2) not null check (unit_price >= 0),
  subtotal   numeric(14,2) not null check (subtotal >= 0),
  created_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- PAYMENTS (records only — the app does not process payments)
-- -----------------------------------------------------------------------------
create table if not exists public.payments (
  id             uuid primary key default gen_random_uuid(),
  sale_id        uuid not null references public.sales(id) on delete cascade,
  amount         numeric(14,2) not null check (amount > 0),
  payment_method text not null check (payment_method in ('cash', 'bank_transfer')),
  recorded_by    uuid references public.profiles(id) on delete set null,
  payment_date   timestamptz not null default now(),
  notes          text,
  created_at     timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- EXPENSES
-- -----------------------------------------------------------------------------
create table if not exists public.expenses (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid not null references public.businesses(id),
  category     text not null check (char_length(category) > 0),
  description  text not null check (char_length(description) > 0),
  amount       numeric(14,2) not null check (amount > 0),
  expense_date timestamptz not null default now(),
  recorded_by  uuid references public.profiles(id) on delete set null,
  notes        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

drop trigger if exists expenses_set_updated_at on public.expenses;
create trigger expenses_set_updated_at
  before update on public.expenses
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- AUDIT LOGS
-- -----------------------------------------------------------------------------
create table if not exists public.audit_logs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references public.profiles(id) on delete set null,
  action      text not null,
  entity_type text not null default '',
  entity_id   text,
  metadata    jsonb,
  created_at  timestamptz not null default now()
);

-- =============================================================================
-- PAYMENT VALIDATION & SALE SYNC (database-level business logic)
-- =============================================================================

-- Before insert/update: a payment must be > 0 and must not exceed the
-- outstanding balance of its sale.
create or replace function public.validate_payment()
returns trigger
language plpgsql
set search_path = public, pg_catalog
as $$
declare
  v_total numeric(14,2);
  v_paid  numeric(14,2);
begin
  if new.amount is null or new.amount <= 0 then
    raise exception 'Payment amount must be greater than zero';
  end if;

  select total_amount into v_total
  from public.sales
  where id = new.sale_id
  for update;

  if v_total is null then
    raise exception 'Sale not found';
  end if;

  select coalesce(sum(amount), 0) into v_paid
  from public.payments
  where sale_id = new.sale_id
    and (tg_op = 'INSERT' or id <> new.id);

  if v_paid + new.amount > v_total + 0.009 then
    raise exception 'Payment amount exceeds the outstanding balance of this sale';
  end if;

  return new;
end;
$$;

drop trigger if exists payments_validate on public.payments;
create trigger payments_validate
  before insert or update on public.payments
  for each row execute function public.validate_payment();

-- After any payment change, keep the parent sale in sync.
create or replace function public.sync_sale_from_payments()
returns trigger
language plpgsql
set search_path = public, pg_catalog
as $$
declare
  v_sale_id uuid;
  v_total   numeric(14,2);
  v_paid    numeric(14,2);
  v_status  text;
begin
  if tg_op = 'DELETE' then
    v_sale_id := old.sale_id;
  else
    v_sale_id := new.sale_id;
  end if;

  select total_amount into v_total from public.sales where id = v_sale_id;
  if v_total is null then
    return null;
  end if;

  select coalesce(sum(amount), 0) into v_paid
  from public.payments
  where sale_id = v_sale_id;

  v_status := case
    when v_paid >= v_total - 0.009 then 'paid'
    when v_paid > 0 then 'partial'
    else 'credit'
  end;

  update public.sales
  set amount_paid        = v_paid,
      amount_outstanding = greatest(v_total - v_paid, 0),
      payment_status     = v_status,
      updated_at         = now()
  where id = v_sale_id;

  return null;
end;
$$;

drop trigger if exists payments_sync_sale on public.payments;
create trigger payments_sync_sale
  after insert or update or delete on public.payments
  for each row execute function public.sync_sale_from_payments();

-- =============================================================================
-- FINANCIAL RECORD FUNCTIONS (SECURITY DEFINER)
-- Financial rows cannot be inserted directly; they must go through these
-- functions so totals and payments are validated at the database level.
-- =============================================================================

-- record_sale: creates sale + sale_items (+ optional initial payment) atomically.
create or replace function public.record_sale(
  p_business_id   uuid,
  p_customer_id   uuid,
  p_items         jsonb,
  p_amount_paid   numeric default 0,
  p_payment_method text default null,
  p_staff_id      uuid default null,
  p_sale_date     timestamptz default null,
  p_notes         text default null
) returns uuid
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_role         text;
  v_item         jsonb;
  v_product      record;
  v_total        numeric(14,2) := 0;
  v_item_sub     numeric(14,2);
  v_sale_id      uuid;
  v_unit_price   numeric(14,2);
  v_business_ok  boolean;
begin
  select role into v_role from public.profiles where id = auth.uid();
  if v_role is null or v_role not in ('owner', 'manager') then
    raise exception 'Not authorized to record sales';
  end if;

  if p_business_id is null or p_customer_id is null then
    raise exception 'Business and customer are required';
  end if;

  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'At least one product is required';
  end if;

  if p_amount_paid < 0 then
    raise exception 'Amount paid cannot be negative';
  end if;
  if p_amount_paid > 0 and p_payment_method is null then
    raise exception 'Payment method is required when an amount is paid';
  end if;

  select exists (select 1 from public.businesses where id = p_business_id and active)
  into v_business_ok;
  if not v_business_ok then
    raise exception 'Selected business is not valid or active';
  end if;

  for v_item in select * from jsonb_array_elements(p_items) loop
    select id, business_id, price into v_product
    from public.products
    where id = (v_item ->> 'product_id')::uuid and active;

    if v_product is null then
      raise exception 'A selected product does not exist or is inactive';
    end if;
    if v_product.business_id <> p_business_id then
      raise exception 'Product "%" does not belong to the selected business', v_product.id;
    end if;
    if (v_item ->> 'quantity')::numeric <= 0 then
      raise exception 'Quantity must be greater than zero';
    end if;

    v_item_sub := round(((v_item ->> 'quantity')::numeric * v_product.price)::numeric, 2);
    v_total := v_total + v_item_sub;
  end loop;

  insert into public.sales (
    business_id, customer_id, created_by, staff_id, sale_date,
    subtotal, total_amount, amount_paid, amount_outstanding, payment_status, notes
  ) values (
    p_business_id, p_customer_id, auth.uid(), p_staff_id, coalesce(p_sale_date, now()),
    v_total, v_total, 0, v_total, 'credit', p_notes
  ) returning id into v_sale_id;

  for v_item in select * from jsonb_array_elements(p_items) loop
    select price into v_unit_price
    from public.products
    where id = (v_item ->> 'product_id')::uuid;

    insert into public.sale_items (sale_id, product_id, quantity, unit_price, subtotal)
    values (
      v_sale_id,
      (v_item ->> 'product_id')::uuid,
      (v_item ->> 'quantity')::numeric,
      v_unit_price,
      round(((v_item ->> 'quantity')::numeric * v_unit_price)::numeric, 2)
    );
  end loop;

  if p_amount_paid > 0 then
    insert into public.payments (sale_id, amount, payment_method, recorded_by, payment_date, notes)
    values (v_sale_id, p_amount_paid, p_payment_method, auth.uid(), coalesce(p_sale_date, now()), 'Initial payment');
  end if;

  insert into public.audit_logs (user_id, action, entity_type, entity_id, metadata)
  values (
    auth.uid(), 'sale.created', 'sale', v_sale_id::text,
    jsonb_build_object(
      'business_id', p_business_id,
      'total_amount', v_total,
      'amount_paid', p_amount_paid
    )
  );

  return v_sale_id;
end;
$$;

-- record_payment: records an additional payment against a sale.
create or replace function public.record_payment(
  p_sale_id         uuid,
  p_amount          numeric,
  p_payment_method  text,
  p_payment_date    timestamptz default null,
  p_notes           text default null
) returns uuid
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_role        text;
  v_sale        record;
  v_payment_id  uuid;
begin
  select role into v_role from public.profiles where id = auth.uid();
  if v_role is null or v_role not in ('owner', 'manager') then
    raise exception 'Not authorized to record payments';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'Payment amount must be greater than zero';
  end if;
  if p_payment_method is null then
    raise exception 'Payment method is required';
  end if;

  select * into v_sale from public.sales where id = p_sale_id;
  if v_sale is null then
    raise exception 'Sale not found';
  end if;
  if v_sale.amount_outstanding < p_amount - 0.009 then
    raise exception 'Payment amount exceeds the outstanding balance of this sale';
  end if;

  insert into public.payments (sale_id, amount, payment_method, recorded_by, payment_date, notes)
  values (p_sale_id, p_amount, p_payment_method, auth.uid(), coalesce(p_payment_date, now()), p_notes)
  returning id into v_payment_id;

  insert into public.audit_logs (user_id, action, entity_type, entity_id, metadata)
  values (
    auth.uid(), 'payment.recorded', 'payment', v_payment_id::text,
    jsonb_build_object('sale_id', p_sale_id, 'amount', p_amount, 'method', p_payment_method)
  );

  return v_payment_id;
end;
$$;

-- record_expense: records an outgoing expense/debit.
create or replace function public.record_expense(
  p_business_id   uuid,
  p_category      text,
  p_description   text,
  p_amount        numeric,
  p_expense_date  timestamptz default null,
  p_notes         text default null
) returns uuid
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_role         text;
  v_expense_id   uuid;
  v_business_ok  boolean;
begin
  select role into v_role from public.profiles where id = auth.uid();
  if v_role is null or v_role not in ('owner', 'manager') then
    raise exception 'Not authorized to record expenses';
  end if;

  if p_business_id is null then
    raise exception 'Business is required';
  end if;
  if p_category is null or char_length(p_category) = 0 then
    raise exception 'Expense category is required';
  end if;
  if p_description is null or char_length(p_description) = 0 then
    raise exception 'Expense description is required';
  end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'Expense amount must be greater than zero';
  end if;

  select exists (select 1 from public.businesses where id = p_business_id and active)
  into v_business_ok;
  if not v_business_ok then
    raise exception 'Selected business is not valid or active';
  end if;

  insert into public.expenses (business_id, category, description, amount, expense_date, recorded_by, notes)
  values (p_business_id, p_category, p_description, p_amount, coalesce(p_expense_date, now()), auth.uid(), p_notes)
  returning id into v_expense_id;

  insert into public.audit_logs (user_id, action, entity_type, entity_id, metadata)
  values (
    auth.uid(), 'expense.recorded', 'expense', v_expense_id::text,
    jsonb_build_object('business_id', p_business_id, 'amount', p_amount, 'category', p_category)
  );

  return v_expense_id;
end;
$$;

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

-- PROFILES
alter table public.profiles enable row level security;
drop policy if exists profiles_select_self on public.profiles;
create policy profiles_select_self on public.profiles
  for select to authenticated using (id = auth.uid());
drop policy if exists profiles_select_owner on public.profiles;
create policy profiles_select_owner on public.profiles
  for select to authenticated using (public.is_owner());
drop policy if exists profiles_update_owner on public.profiles;
create policy profiles_update_owner on public.profiles
  for update to authenticated using (public.is_owner()) with check (public.is_owner());
drop policy if exists profiles_update_own_name on public.profiles;
create policy profiles_update_own_name on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid() and role = (select role from public.profiles where id = auth.uid()));

-- BUSINESSES
alter table public.businesses enable row level security;
drop policy if exists businesses_select on public.businesses;
create policy businesses_select on public.businesses
  for select to authenticated using (true);
drop policy if exists businesses_write on public.businesses;
create policy businesses_write on public.businesses
  for all to authenticated using (public.is_owner()) with check (public.is_owner());

-- PRODUCTS
alter table public.products enable row level security;
drop policy if exists products_select on public.products;
create policy products_select on public.products
  for select to authenticated using (true);
drop policy if exists products_write on public.products;
create policy products_write on public.products
  for all to authenticated using (public.is_owner()) with check (public.is_owner());

-- CUSTOMERS
alter table public.customers enable row level security;
drop policy if exists customers_select on public.customers;
create policy customers_select on public.customers
  for select to authenticated using (public.is_owner() or public.is_manager());
drop policy if exists customers_insert on public.customers;
create policy customers_insert on public.customers
  for insert to authenticated with check (public.is_owner() or public.is_manager());
drop policy if exists customers_update on public.customers;
create policy customers_update on public.customers
  for update to authenticated using (public.is_owner() or public.is_manager())
  with check (public.is_owner() or public.is_manager());
drop policy if exists customers_delete on public.customers;
create policy customers_delete on public.customers
  for delete to authenticated using (public.is_owner());

-- STAFF
alter table public.staff enable row level security;
drop policy if exists staff_select on public.staff;
create policy staff_select on public.staff
  for select to authenticated using (public.is_owner() or public.is_manager());
drop policy if exists staff_insert on public.staff;
create policy staff_insert on public.staff
  for insert to authenticated with check (public.is_owner() or public.is_manager());
drop policy if exists staff_update on public.staff;
create policy staff_update on public.staff
  for update to authenticated using (public.is_owner() or public.is_manager())
  with check (public.is_owner() or public.is_manager());
drop policy if exists staff_delete on public.staff;
create policy staff_delete on public.staff
  for delete to authenticated using (public.is_owner());

-- SALES (no direct INSERT — must go through record_sale())
alter table public.sales enable row level security;
drop policy if exists sales_select on public.sales;
create policy sales_select on public.sales
  for select to authenticated using (public.is_owner() or public.is_manager());
drop policy if exists sales_update on public.sales;
create policy sales_update on public.sales
  for update to authenticated using (public.is_owner()) with check (public.is_owner());
drop policy if exists sales_delete on public.sales;
create policy sales_delete on public.sales
  for delete to authenticated using (public.is_owner());

-- SALE ITEMS
alter table public.sale_items enable row level security;
drop policy if exists sale_items_select on public.sale_items;
create policy sale_items_select on public.sale_items
  for select to authenticated using (public.is_owner() or public.is_manager());
drop policy if exists sale_items_update on public.sale_items;
create policy sale_items_update on public.sale_items
  for update to authenticated using (public.is_owner()) with check (public.is_owner());
drop policy if exists sale_items_delete on public.sale_items;
create policy sale_items_delete on public.sale_items
  for delete to authenticated using (public.is_owner());

-- PAYMENTS (no direct INSERT — must go through record_sale()/record_payment())
alter table public.payments enable row level security;
drop policy if exists payments_select on public.payments;
create policy payments_select on public.payments
  for select to authenticated using (public.is_owner() or public.is_manager());
drop policy if exists payments_update on public.payments;
create policy payments_update on public.payments
  for update to authenticated using (public.is_owner()) with check (public.is_owner());
drop policy if exists payments_delete on public.payments;
create policy payments_delete on public.payments
  for delete to authenticated using (public.is_owner());

-- EXPENSES (no direct INSERT — must go through record_expense())
alter table public.expenses enable row level security;
drop policy if exists expenses_select on public.expenses;
create policy expenses_select on public.expenses
  for select to authenticated using (public.is_owner() or public.is_manager());
drop policy if exists expenses_update on public.expenses;
create policy expenses_update on public.expenses
  for update to authenticated using (public.is_owner()) with check (public.is_owner());
drop policy if exists expenses_delete on public.expenses;
create policy expenses_delete on public.expenses
  for delete to authenticated using (public.is_owner());

-- AUDIT LOGS (users can only log their own actions; everyone can read them)
alter table public.audit_logs enable row level security;
drop policy if exists audit_logs_select on public.audit_logs;
create policy audit_logs_select on public.audit_logs
  for select to authenticated using (true);
drop policy if exists audit_logs_insert on public.audit_logs;
create policy audit_logs_insert on public.audit_logs
  for insert to authenticated with check (user_id = auth.uid());

-- =============================================================================
-- INDEXES
-- =============================================================================
create index if not exists idx_products_business_id on public.products(business_id);
create index if not exists idx_customers_name on public.customers(name);
create index if not exists idx_customers_customer_type on public.customers(customer_type);
create index if not exists idx_customers_phone on public.customers(phone);
create index if not exists idx_staff_business_id on public.staff(business_id);
create index if not exists idx_staff_name on public.staff(name);
create index if not exists idx_sales_business_id on public.sales(business_id);
create index if not exists idx_sales_customer_id on public.sales(customer_id);
create index if not exists idx_sales_sale_date on public.sales(sale_date);
create index if not exists idx_sales_created_by on public.sales(created_by);
create index if not exists idx_sales_payment_status on public.sales(payment_status);
create index if not exists idx_sale_items_sale_id on public.sale_items(sale_id);
create index if not exists idx_sale_items_product_id on public.sale_items(product_id);
create index if not exists idx_payments_sale_id on public.payments(sale_id);
create index if not exists idx_payments_payment_date on public.payments(payment_date);
create index if not exists idx_payments_recorded_by on public.payments(recorded_by);
create index if not exists idx_expenses_business_id on public.expenses(business_id);
create index if not exists idx_expenses_expense_date on public.expenses(expense_date);
create index if not exists idx_expenses_category on public.expenses(category);
create index if not exists idx_audit_logs_created_at on public.audit_logs(created_at);
create index if not exists idx_audit_logs_user_id on public.audit_logs(user_id);
create index if not exists idx_audit_logs_entity_type on public.audit_logs(entity_type);

-- =============================================================================
-- SEED DATA
-- =============================================================================
insert into public.businesses (name, description, active) values
  ('Masalan Bakery Limited', 'Bakery operations for Masalan Business Enterprise', true),
  ('Masalan Water Factory', 'Pure water production for Masalan Business Enterprise', true)
on conflict (name) do nothing;

insert into public.products (business_id, name, price, unit, active)
select b.id, p.name, p.price, p.unit, true
from public.businesses b
cross join (values
  ('Masalan Bakery Limited', 'Masalan Bread', 500.00, 'loaf'),
  ('Masalan Bakery Limited', 'Masalan Bread', 1000.00, 'loaf'),
  ('Masalan Water Factory', 'Pure Water', 400.00, 'bag')
) as p(business_name, name, price, unit)
where b.name = p.business_name
on conflict (business_id, name, price) do nothing;

-- =============================================================================
-- MASALAN BUSINESS ENTERPRISE — Inventory Migration
--
-- Changes:
--   1. Products: add opening_stock and reorder_level columns
--   2. New view: inventory_stock (computed available stock per product)
--
-- Stock model:
--   opening_stock = starting quantity the owner records for a product.
--   sold_quantity  = SUM(sale_items.quantity) for the product (never changes).
--   available      = opening_stock - sold_quantity  (derived, no drift).
--   low stock      = available <= reorder_level AND available > 0, or
--                    available <= reorder_level (if reorder_level > 0).
--
-- Applying this does not back-fill historical sales, so opening_stock should be
-- set to the quantity on hand BEFORE this migration is applied. The owner can
-- correct it any time in the Products page.
--
-- Apply via Supabase Dashboard -> SQL Editor, or:
--   supabase link --project-ref gxrnlrogpmlagzmwlwjp
--   supabase db push
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. PRODUCTS: stock columns
-- -----------------------------------------------------------------------------
alter table public.products
  add column if not exists opening_stock numeric(12,3) not null default 0
    check (opening_stock >= 0),
  add column if not exists reorder_level numeric(12,3) not null default 0
    check (reorder_level >= 0);

-- -----------------------------------------------------------------------------
-- 2. INVENTORY VIEW (computed, never stored)
--    security_invoker: RLS of the underlying tables applies to the caller.
-- -----------------------------------------------------------------------------
create or replace view public.inventory_stock
with (security_invoker = on) as
select
  p.id                                                         as product_id,
  p.business_id,
  p.name,
  p.unit,
  p.price,
  p.active,
  p.opening_stock,
  p.reorder_level,
  coalesce(sum(si.quantity), 0)                                as sold_quantity,
  p.opening_stock - coalesce(sum(si.quantity), 0)              as available
from public.products p
left join public.sale_items si on si.product_id = p.id
group by p.id;

grant select on public.inventory_stock to authenticated;

-- -----------------------------------------------------------------------------
-- 3. HELPERS used by the app to flag low stock
-- -----------------------------------------------------------------------------
create or replace function public.is_low_stock(p_product_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_catalog
as $$
  select exists (
    select 1
    from public.inventory_stock v
    where v.product_id = p_product_id
      and v.reorder_level > 0
      and v.available <= v.reorder_level
  );
$$;

-- -----------------------------------------------------------------------------
-- 4. INDEXES
-- -----------------------------------------------------------------------------
create index if not exists idx_products_opening_stock on public.products(opening_stock);
create index if not exists idx_products_reorder_level on public.products(reorder_level);
-- Crea tabla de estado de QR por producto + bucket privado en Storage
-- (product-qrs) + políticas RLS.

-- 1) Tabla de estado para QR por producto
create table if not exists public.product_qr_assets (
  product_id uuid primary key references public.products(id) on delete cascade,
  barcode text not null,
  qr_path text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Trigger updated_at
create or replace function public.set_product_qr_assets_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_product_qr_assets_updated_at on public.product_qr_assets;
create trigger trg_product_qr_assets_updated_at
before update on public.product_qr_assets
for each row execute function public.set_product_qr_assets_updated_at();

-- RLS
alter table public.product_qr_assets enable row level security;

-- Políticas simples (ajustables por rol/permisos más adelante)
do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'product_qr_assets' and policyname = 'product_qr_assets_select_auth'
  ) then
    create policy product_qr_assets_select_auth
      on public.product_qr_assets
      for select
      to authenticated
      using (true);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'product_qr_assets' and policyname = 'product_qr_assets_insert_auth'
  ) then
    create policy product_qr_assets_insert_auth
      on public.product_qr_assets
      for insert
      to authenticated
      with check (true);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'product_qr_assets' and policyname = 'product_qr_assets_update_auth'
  ) then
    create policy product_qr_assets_update_auth
      on public.product_qr_assets
      for update
      to authenticated
      using (true)
      with check (true);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'product_qr_assets' and policyname = 'product_qr_assets_delete_auth'
  ) then
    create policy product_qr_assets_delete_auth
      on public.product_qr_assets
      for delete
      to authenticated
      using (true);
  end if;
end $$;

-- 2) Bucket privado para QR
insert into storage.buckets (id, name, public)
values ('product-qrs', 'product-qrs', false)
on conflict (id) do nothing;

-- 3) Políticas de Storage para el bucket product-qrs
-- Nota: storage.objects ya tiene RLS habilitado.
do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'product_qrs_objects_select_auth'
  ) then
    create policy product_qrs_objects_select_auth
      on storage.objects
      for select
      to authenticated
      using (bucket_id = 'product-qrs');
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'product_qrs_objects_insert_auth'
  ) then
    create policy product_qrs_objects_insert_auth
      on storage.objects
      for insert
      to authenticated
      with check (bucket_id = 'product-qrs');
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'product_qrs_objects_update_auth'
  ) then
    create policy product_qrs_objects_update_auth
      on storage.objects
      for update
      to authenticated
      using (bucket_id = 'product-qrs')
      with check (bucket_id = 'product-qrs');
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'product_qrs_objects_delete_auth'
  ) then
    create policy product_qrs_objects_delete_auth
      on storage.objects
      for delete
      to authenticated
      using (bucket_id = 'product-qrs');
  end if;
end $$;

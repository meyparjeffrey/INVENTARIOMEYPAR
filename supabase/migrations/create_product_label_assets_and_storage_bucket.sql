-- Crear tabla de assets de etiquetas y bucket de Storage (privado)

create extension if not exists pgcrypto;

create table if not exists public.product_label_assets (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  label_path text not null,
  config_hash text not null,
  config_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists product_label_assets_product_id_idx on public.product_label_assets (product_id);
create index if not exists product_label_assets_created_at_idx on public.product_label_assets (created_at desc);

alter table public.product_label_assets enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'product_label_assets'
      and policyname = 'product_label_assets_select'
  ) then
    create policy product_label_assets_select
      on public.product_label_assets
      for select
      to authenticated
      using (true);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'product_label_assets'
      and policyname = 'product_label_assets_insert'
  ) then
    create policy product_label_assets_insert
      on public.product_label_assets
      for insert
      to authenticated
      with check (true);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'product_label_assets'
      and policyname = 'product_label_assets_delete'
  ) then
    create policy product_label_assets_delete
      on public.product_label_assets
      for delete
      to authenticated
      using (true);
  end if;
end $$;

-- Bucket privado para etiquetas
insert into storage.buckets (id, name, public)
values ('product-labels', 'product-labels', false)
on conflict (id) do nothing;

-- Policies de Storage para el bucket 'product-labels'
do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'storage_product_labels_select'
  ) then
    create policy storage_product_labels_select
      on storage.objects
      for select
      to authenticated
      using (bucket_id = 'product-labels');
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'storage_product_labels_insert'
  ) then
    create policy storage_product_labels_insert
      on storage.objects
      for insert
      to authenticated
      with check (bucket_id = 'product-labels');
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'storage_product_labels_update'
  ) then
    create policy storage_product_labels_update
      on storage.objects
      for update
      to authenticated
      using (bucket_id = 'product-labels')
      with check (bucket_id = 'product-labels');
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'storage_product_labels_delete'
  ) then
    create policy storage_product_labels_delete
      on storage.objects
      for delete
      to authenticated
      using (bucket_id = 'product-labels');
  end if;
end $$;


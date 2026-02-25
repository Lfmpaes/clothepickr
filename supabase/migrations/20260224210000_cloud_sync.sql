-- Cloud Sync backend schema for ClothePickr
-- Mirrors local entities with user-scoped composite keys for multi-device sync.

create extension if not exists pgcrypto;

create table if not exists public.categories (
  user_id uuid not null references auth.users (id) on delete cascade,
  id uuid not null default gen_random_uuid(),
  name text not null,
  is_default boolean not null default false,
  archived boolean not null default false,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  deleted_at timestamptz,
  server_updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

create table if not exists public.items (
  user_id uuid not null references auth.users (id) on delete cascade,
  id uuid not null default gen_random_uuid(),
  name text not null,
  category_id uuid not null,
  status text not null check (status in ('clean', 'dirty', 'washing', 'drying')),
  color text not null default '',
  brand text not null default '',
  size text not null default '',
  notes text not null default '',
  season_tags text[] not null default '{}',
  photo_ids uuid[] not null default '{}',
  created_at timestamptz not null,
  updated_at timestamptz not null,
  deleted_at timestamptz,
  server_updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

create table if not exists public.outfits (
  user_id uuid not null references auth.users (id) on delete cascade,
  id uuid not null default gen_random_uuid(),
  name text not null,
  item_ids uuid[] not null default '{}',
  occasion text not null default '',
  notes text not null default '',
  is_favorite boolean not null default false,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  deleted_at timestamptz,
  server_updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

create table if not exists public.laundry_logs (
  user_id uuid not null references auth.users (id) on delete cascade,
  id uuid not null default gen_random_uuid(),
  item_id uuid not null,
  from_status text not null check (from_status in ('clean', 'dirty', 'washing', 'drying')),
  to_status text not null check (to_status in ('clean', 'dirty', 'washing', 'drying')),
  changed_at timestamptz not null,
  reason text not null check (reason in ('manual', 'cycle')),
  deleted_at timestamptz,
  server_updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

create table if not exists public.photos (
  user_id uuid not null references auth.users (id) on delete cascade,
  id uuid not null default gen_random_uuid(),
  item_id uuid not null,
  storage_path text not null,
  mime_type text not null,
  width int not null check (width >= 0),
  height int not null check (height >= 0),
  created_at timestamptz not null,
  deleted_at timestamptz,
  server_updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

create index if not exists categories_user_server_idx
  on public.categories (user_id, server_updated_at, id);
create index if not exists items_user_server_idx
  on public.items (user_id, server_updated_at, id);
create index if not exists outfits_user_server_idx
  on public.outfits (user_id, server_updated_at, id);
create index if not exists laundry_logs_user_server_idx
  on public.laundry_logs (user_id, server_updated_at, id);
create index if not exists photos_user_server_idx
  on public.photos (user_id, server_updated_at, id);

alter table public.categories enable row level security;
alter table public.items enable row level security;
alter table public.outfits enable row level security;
alter table public.laundry_logs enable row level security;
alter table public.photos enable row level security;

drop policy if exists categories_select_own on public.categories;
drop policy if exists categories_insert_own on public.categories;
drop policy if exists categories_update_own on public.categories;
drop policy if exists categories_delete_own on public.categories;

create policy categories_select_own on public.categories
  for select using (auth.uid() = user_id);
create policy categories_insert_own on public.categories
  for insert with check (auth.uid() = user_id);
create policy categories_update_own on public.categories
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy categories_delete_own on public.categories
  for delete using (auth.uid() = user_id);

drop policy if exists items_select_own on public.items;
drop policy if exists items_insert_own on public.items;
drop policy if exists items_update_own on public.items;
drop policy if exists items_delete_own on public.items;

create policy items_select_own on public.items
  for select using (auth.uid() = user_id);
create policy items_insert_own on public.items
  for insert with check (auth.uid() = user_id);
create policy items_update_own on public.items
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy items_delete_own on public.items
  for delete using (auth.uid() = user_id);

drop policy if exists outfits_select_own on public.outfits;
drop policy if exists outfits_insert_own on public.outfits;
drop policy if exists outfits_update_own on public.outfits;
drop policy if exists outfits_delete_own on public.outfits;

create policy outfits_select_own on public.outfits
  for select using (auth.uid() = user_id);
create policy outfits_insert_own on public.outfits
  for insert with check (auth.uid() = user_id);
create policy outfits_update_own on public.outfits
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy outfits_delete_own on public.outfits
  for delete using (auth.uid() = user_id);

drop policy if exists laundry_logs_select_own on public.laundry_logs;
drop policy if exists laundry_logs_insert_own on public.laundry_logs;
drop policy if exists laundry_logs_update_own on public.laundry_logs;
drop policy if exists laundry_logs_delete_own on public.laundry_logs;

create policy laundry_logs_select_own on public.laundry_logs
  for select using (auth.uid() = user_id);
create policy laundry_logs_insert_own on public.laundry_logs
  for insert with check (auth.uid() = user_id);
create policy laundry_logs_update_own on public.laundry_logs
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy laundry_logs_delete_own on public.laundry_logs
  for delete using (auth.uid() = user_id);

drop policy if exists photos_select_own on public.photos;
drop policy if exists photos_insert_own on public.photos;
drop policy if exists photos_update_own on public.photos;
drop policy if exists photos_delete_own on public.photos;

create policy photos_select_own on public.photos
  for select using (auth.uid() = user_id);
create policy photos_insert_own on public.photos
  for insert with check (auth.uid() = user_id);
create policy photos_update_own on public.photos
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy photos_delete_own on public.photos
  for delete using (auth.uid() = user_id);

create or replace function public.set_server_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.server_updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_categories_server_updated_at on public.categories;
create trigger set_categories_server_updated_at
before update on public.categories
for each row execute procedure public.set_server_updated_at();

drop trigger if exists set_items_server_updated_at on public.items;
create trigger set_items_server_updated_at
before update on public.items
for each row execute procedure public.set_server_updated_at();

drop trigger if exists set_outfits_server_updated_at on public.outfits;
create trigger set_outfits_server_updated_at
before update on public.outfits
for each row execute procedure public.set_server_updated_at();

drop trigger if exists set_laundry_logs_server_updated_at on public.laundry_logs;
create trigger set_laundry_logs_server_updated_at
before update on public.laundry_logs
for each row execute procedure public.set_server_updated_at();

drop trigger if exists set_photos_server_updated_at on public.photos;
create trigger set_photos_server_updated_at
before update on public.photos
for each row execute procedure public.set_server_updated_at();

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'categories'
  ) then
    alter publication supabase_realtime add table public.categories;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'items'
  ) then
    alter publication supabase_realtime add table public.items;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'outfits'
  ) then
    alter publication supabase_realtime add table public.outfits;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'laundry_logs'
  ) then
    alter publication supabase_realtime add table public.laundry_logs;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'photos'
  ) then
    alter publication supabase_realtime add table public.photos;
  end if;
end;
$$;

insert into storage.buckets (id, name, public)
values ('item-photos', 'item-photos', false)
on conflict (id) do nothing;

-- File path convention for object names:
-- {user_id}/{item_id}/{photo_id}.jpg
drop policy if exists item_photos_select_own on storage.objects;
drop policy if exists item_photos_insert_own on storage.objects;
drop policy if exists item_photos_update_own on storage.objects;
drop policy if exists item_photos_delete_own on storage.objects;

create policy item_photos_select_own on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'item-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy item_photos_insert_own on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'item-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy item_photos_update_own on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'item-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'item-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy item_photos_delete_own on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'item-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create table if not exists public.categories (
  user_id uuid not null,
  id uuid not null,
  name text not null,
  is_default boolean not null default false,
  archived boolean not null default false,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  deleted_at timestamptz,
  server_updated_at timestamptz not null default now(),
  primary key (user_id, id),
  constraint categories_name_not_empty check (char_length(name) > 0)
);

create table if not exists public.items (
  user_id uuid not null,
  id uuid not null,
  name text not null,
  category_id uuid not null,
  status text not null,
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
  primary key (user_id, id),
  constraint items_status_valid check (status in ('clean', 'dirty', 'washing', 'drying')),
  constraint items_name_not_empty check (char_length(name) > 0)
);

create table if not exists public.outfits (
  user_id uuid not null,
  id uuid not null,
  name text not null,
  item_ids uuid[] not null default '{}',
  occasion text not null default '',
  notes text not null default '',
  is_favorite boolean not null default false,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  deleted_at timestamptz,
  server_updated_at timestamptz not null default now(),
  primary key (user_id, id),
  constraint outfits_name_not_empty check (char_length(name) > 0)
);

create table if not exists public.laundry_logs (
  user_id uuid not null,
  id uuid not null,
  item_id uuid not null,
  from_status text not null,
  to_status text not null,
  changed_at timestamptz not null,
  reason text not null,
  deleted_at timestamptz,
  server_updated_at timestamptz not null default now(),
  primary key (user_id, id),
  constraint laundry_logs_from_status_valid check (from_status in ('clean', 'dirty', 'washing', 'drying')),
  constraint laundry_logs_to_status_valid check (to_status in ('clean', 'dirty', 'washing', 'drying')),
  constraint laundry_logs_reason_valid check (reason in ('manual', 'cycle'))
);

create table if not exists public.photos (
  user_id uuid not null,
  id uuid not null,
  item_id uuid not null,
  storage_path text not null,
  mime_type text not null,
  width integer not null,
  height integer not null,
  created_at timestamptz not null,
  deleted_at timestamptz,
  server_updated_at timestamptz not null default now(),
  primary key (user_id, id),
  constraint photos_storage_path_not_empty check (char_length(storage_path) > 0),
  constraint photos_dimensions_nonnegative check (width >= 0 and height >= 0)
);

create index if not exists idx_categories_user_server_cursor on public.categories (user_id, server_updated_at, id);
create index if not exists idx_items_user_server_cursor on public.items (user_id, server_updated_at, id);
create index if not exists idx_outfits_user_server_cursor on public.outfits (user_id, server_updated_at, id);
create index if not exists idx_laundry_logs_user_server_cursor on public.laundry_logs (user_id, server_updated_at, id);
create index if not exists idx_photos_user_server_cursor on public.photos (user_id, server_updated_at, id);

alter table public.categories enable row level security;
alter table public.items enable row level security;
alter table public.outfits enable row level security;
alter table public.laundry_logs enable row level security;
alter table public.photos enable row level security;

drop policy if exists categories_all_own on public.categories;
create policy categories_all_own
on public.categories
for all
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists items_all_own on public.items;
create policy items_all_own
on public.items
for all
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists outfits_all_own on public.outfits;
create policy outfits_all_own
on public.outfits
for all
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists laundry_logs_all_own on public.laundry_logs;
create policy laundry_logs_all_own
on public.laundry_logs
for all
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists photos_all_own on public.photos;
create policy photos_all_own
on public.photos
for all
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create or replace function public.set_server_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.server_updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_server_updated_at_categories on public.categories;
create trigger set_server_updated_at_categories
before update on public.categories
for each row
execute function public.set_server_updated_at();

drop trigger if exists set_server_updated_at_items on public.items;
create trigger set_server_updated_at_items
before update on public.items
for each row
execute function public.set_server_updated_at();

drop trigger if exists set_server_updated_at_outfits on public.outfits;
create trigger set_server_updated_at_outfits
before update on public.outfits
for each row
execute function public.set_server_updated_at();

drop trigger if exists set_server_updated_at_laundry_logs on public.laundry_logs;
create trigger set_server_updated_at_laundry_logs
before update on public.laundry_logs
for each row
execute function public.set_server_updated_at();

drop trigger if exists set_server_updated_at_photos on public.photos;
create trigger set_server_updated_at_photos
before update on public.photos
for each row
execute function public.set_server_updated_at();

do $$
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'categories'
  ) then
    alter publication supabase_realtime add table public.categories;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'items'
  ) then
    alter publication supabase_realtime add table public.items;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'outfits'
  ) then
    alter publication supabase_realtime add table public.outfits;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'laundry_logs'
  ) then
    alter publication supabase_realtime add table public.laundry_logs;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'photos'
  ) then
    alter publication supabase_realtime add table public.photos;
  end if;
end $$;

insert into storage.buckets (id, name, public)
values ('item-photos', 'item-photos', false)
on conflict (id)
do update set public = excluded.public;

drop policy if exists item_photos_select_own on storage.objects;
create policy item_photos_select_own
on storage.objects
for select
to authenticated
using (
  bucket_id = 'item-photos'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

drop policy if exists item_photos_insert_own on storage.objects;
create policy item_photos_insert_own
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'item-photos'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

drop policy if exists item_photos_update_own on storage.objects;
create policy item_photos_update_own
on storage.objects
for update
to authenticated
using (
  bucket_id = 'item-photos'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
)
with check (
  bucket_id = 'item-photos'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

drop policy if exists item_photos_delete_own on storage.objects;
create policy item_photos_delete_own
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'item-photos'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

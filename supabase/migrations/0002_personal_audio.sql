-- Personal lossless library.
-- Keeps uploaded masters private and separate from the public release catalog.

-- Every authenticated account needs a profile because the original catalog
-- schema uses profiles as its user table. This also covers the first owner
-- account created through a magic link.
create or replace function public.handle_new_user() returns trigger as $$
begin
  insert into public.profiles (id, handle, display_name)
  values (
    new.id,
    'listener_' || left(replace(new.id::text, '-', ''), 12),
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(coalesce(new.email, 'Listener'), '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer set search_path = '';

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill profiles for accounts created before this migration.
insert into public.profiles (id, handle, display_name)
select
  user_row.id,
  'listener_' || left(replace(user_row.id::text, '-', ''), 12),
  coalesce(user_row.raw_user_meta_data ->> 'display_name', split_part(coalesce(user_row.email, 'Listener'), '@', 1))
from auth.users user_row
left join public.profiles profile on profile.id = user_row.id
where profile.id is null;

create table public.library_tracks (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 300),
  artist text,
  album text,
  storage_path text not null unique,
  original_filename text not null,
  mime_type text not null check (mime_type in ('audio/wav', 'audio/x-wav', 'audio/wave')),
  file_size bigint not null check (file_size > 0),
  duration_secs numeric,
  sample_rate integer,
  bit_depth integer,
  channels integer,
  codec text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (storage_path like owner_id::text || '/%')
);

create index library_tracks_owner_created_idx
  on public.library_tracks (owner_id, created_at desc);

alter table public.library_tracks enable row level security;

create policy "library tracks are private to owner"
  on public.library_tracks for select
  using (owner_id = auth.uid());

create policy "library tracks owner insert"
  on public.library_tracks for insert
  with check (owner_id = auth.uid());

create policy "library tracks owner update"
  on public.library_tracks for update
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy "library tracks owner delete"
  on public.library_tracks for delete
  using (owner_id = auth.uid());

create trigger library_tracks_updated before update on public.library_tracks
  for each row execute function public.set_updated_at();

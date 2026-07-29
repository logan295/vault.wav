-- vault.wav initial schema — Phase A (core platform) + Phase B (social/subscription layer)
-- Run in the Supabase SQL editor (or `supabase db push`).

-- ============================================================
-- PROFILES
-- ============================================================
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  handle text not null unique check (handle ~ '^[a-z0-9_]{3,30}$'),
  display_name text not null,
  bio text,
  avatar_url text,
  is_artist boolean not null default false,
  is_private boolean not null default false,
  theme jsonb,                       -- { preset, accent, bg } — null = default vault.wav dark
  timezone text not null default 'UTC',
  stripe_account_id text,            -- Connect Express (artists)
  supporter_price_cents integer,     -- artist's monthly supporter tier; null = not offered
  stripe_customer_id text,           -- Billing customer (fans, for Plus)
  plus_subscription_id text,
  plus_status text check (plus_status in ('active','past_due','canceled')),
  bonus_seconds integer not null default 0, -- welcome-back bonus pool
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- CATALOG
-- ============================================================
create table public.releases (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid not null references public.profiles (id) on delete cascade,
  slug text not null,
  title text not null,
  type text not null default 'single' check (type in ('single','ep','album')),
  cover_url text,
  price_cents integer,               -- null = streaming-only (not for sale)
  pwyw_min_cents integer,            -- pay-what-you-want floor; null = fixed price
  published_at timestamptz,          -- null = draft
  created_at timestamptz not null default now(),
  unique (artist_id, slug)
);

create table public.tracks (
  id uuid primary key default gen_random_uuid(),
  release_id uuid not null references public.releases (id) on delete cascade,
  title text not null,
  position integer not null default 1,
  file_path text not null,           -- private `audio` bucket path
  file_size bigint,
  format text not null default 'wav' check (format in ('wav','mp3')),
  duration_secs numeric,
  sample_rate integer,               -- WAV
  bit_depth integer,                 -- WAV
  bitrate_kbps integer,              -- MP3
  peaks jsonb,                       -- precomputed waveform peaks
  audd_fingerprint_id text,          -- set when published to AudD custom catalog
  created_at timestamptz not null default now()
);
create index tracks_release_idx on public.tracks (release_id, position);

-- ============================================================
-- COMMUNITY
-- ============================================================
create table public.comments (
  id uuid primary key default gen_random_uuid(),
  track_id uuid not null references public.tracks (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  time_secs numeric,                 -- null = general comment; else pinned to the waveform
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index comments_track_idx on public.comments (track_id, created_at);

create table public.follows (
  fan_id uuid not null references public.profiles (id) on delete cascade,
  artist_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (fan_id, artist_id),
  check (fan_id <> artist_id)
);

create table public.likes (
  user_id uuid not null references public.profiles (id) on delete cascade,
  track_id uuid not null references public.tracks (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, track_id)
);

create table public.reposts (
  user_id uuid not null references public.profiles (id) on delete cascade,
  release_id uuid not null references public.releases (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, release_id)
);

create table public.playlists (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 100),
  cover_url text,
  is_public boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.playlist_tracks (
  playlist_id uuid not null references public.playlists (id) on delete cascade,
  track_id uuid not null references public.tracks (id) on delete cascade,
  position integer not null default 1,
  added_at timestamptz not null default now(),
  primary key (playlist_id, track_id)
);

-- Artist self-promotion + interviews: the ONLY promotional surface on vault.wav.
create table public.posts (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('promo','interview')),
  title text not null,
  body text,
  media_url text,
  published_at timestamptz not null default now()
);
create index posts_artist_idx on public.posts (artist_id, published_at desc);

-- ============================================================
-- MONEY
-- ============================================================
create table public.purchases (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references public.profiles (id) on delete cascade,
  release_id uuid not null references public.releases (id) on delete cascade,
  amount_cents integer not null,
  stripe_payment_intent text not null unique,
  created_at timestamptz not null default now(),
  unique (buyer_id, release_id)
);

create table public.supporters (
  id uuid primary key default gen_random_uuid(),
  fan_id uuid not null references public.profiles (id) on delete cascade,
  artist_id uuid not null references public.profiles (id) on delete cascade,
  stripe_subscription_id text not null unique,
  status text not null check (status in ('active','past_due','canceled')),
  started_at timestamptz not null default now(),
  unique (fan_id, artist_id)
);

-- ============================================================
-- RECOGNITION ("shazam") + USAGE METERING
-- ============================================================
create table public.recognitions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  matched_track_id uuid references public.tracks (id) on delete set null,
  external_meta jsonb,               -- {title, artist, album, links} when not on vault.wav
  created_at timestamptz not null default now()
);
create index recognitions_user_idx on public.recognitions (user_id, created_at desc);

create table public.play_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  track_id uuid not null references public.tracks (id) on delete cascade,
  seconds integer not null default 0,
  started_on date not null default (now()::date)
);
create index play_sessions_user_month_idx on public.play_sessions (user_id, started_on);

-- Monthly discovery-streaming usage per user (Library plays are never inserted).
create view public.monthly_usage as
select
  user_id,
  date_trunc('month', started_on)::date as month,
  sum(seconds)::integer as seconds
from public.play_sessions
group by 1, 2;

-- ============================================================
-- LAUNCH PHASE CONFIG (beta → pause → live), data not deploys
-- ============================================================
create table public.app_config (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);
insert into public.app_config (key, value) values
  ('phase', '"beta"'),                       -- beta | pause | live
  ('phase_ends_at', 'null'),
  ('free_monthly_seconds', '36000'),         -- 10 hours
  ('free_monthly_recognitions', '20'),
  ('weekend_lockout', 'true');

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table public.profiles enable row level security;
alter table public.releases enable row level security;
alter table public.tracks enable row level security;
alter table public.comments enable row level security;
alter table public.follows enable row level security;
alter table public.likes enable row level security;
alter table public.reposts enable row level security;
alter table public.playlists enable row level security;
alter table public.playlist_tracks enable row level security;
alter table public.posts enable row level security;
alter table public.purchases enable row level security;
alter table public.supporters enable row level security;
alter table public.recognitions enable row level security;
alter table public.play_sessions enable row level security;
alter table public.app_config enable row level security;

-- profiles: public read (private profiles expose only handle/display/avatar via API shaping);
-- the row itself stays readable so handles resolve — content tables below enforce privacy.
create policy "profiles readable" on public.profiles for select using (true);
create policy "profiles self insert" on public.profiles for insert with check (auth.uid() = id);
create policy "profiles self update" on public.profiles for update using (auth.uid() = id);

-- releases/tracks: published readable by all; drafts only by owner
create policy "releases readable" on public.releases for select
  using (published_at is not null or artist_id = auth.uid());
create policy "releases owner write" on public.releases for all
  using (artist_id = auth.uid()) with check (artist_id = auth.uid());

create policy "tracks readable" on public.tracks for select
  using (exists (select 1 from public.releases r
                 where r.id = release_id
                   and (r.published_at is not null or r.artist_id = auth.uid())));
create policy "tracks owner write" on public.tracks for all
  using (exists (select 1 from public.releases r
                 where r.id = release_id and r.artist_id = auth.uid()))
  with check (exists (select 1 from public.releases r
                      where r.id = release_id and r.artist_id = auth.uid()));

-- comments: public read, authed write own
create policy "comments readable" on public.comments for select using (true);
create policy "comments write own" on public.comments for insert with check (auth.uid() = author_id);
create policy "comments delete own" on public.comments for delete using (auth.uid() = author_id);

-- follows: readable, write own edge
create policy "follows readable" on public.follows for select using (true);
create policy "follows write own" on public.follows for all
  using (auth.uid() = fan_id) with check (auth.uid() = fan_id);

-- likes/reposts: visible unless the owner's profile is private (then owner-only)
create policy "likes visible" on public.likes for select
  using (auth.uid() = user_id
         or not exists (select 1 from public.profiles p where p.id = user_id and p.is_private));
create policy "likes write own" on public.likes for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "reposts visible" on public.reposts for select
  using (auth.uid() = user_id
         or not exists (select 1 from public.profiles p where p.id = user_id and p.is_private));
create policy "reposts write own" on public.reposts for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- playlists: public playlists visible unless owner private; owner sees all
create policy "playlists visible" on public.playlists for select
  using (owner_id = auth.uid()
         or (is_public
             and not exists (select 1 from public.profiles p where p.id = owner_id and p.is_private)));
create policy "playlists write own" on public.playlists for all
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy "playlist_tracks visible" on public.playlist_tracks for select
  using (exists (select 1 from public.playlists pl
                 where pl.id = playlist_id
                   and (pl.owner_id = auth.uid()
                        or (pl.is_public
                            and not exists (select 1 from public.profiles p
                                            where p.id = pl.owner_id and p.is_private)))));
create policy "playlist_tracks write own" on public.playlist_tracks for all
  using (exists (select 1 from public.playlists pl
                 where pl.id = playlist_id and pl.owner_id = auth.uid()))
  with check (exists (select 1 from public.playlists pl
                      where pl.id = playlist_id and pl.owner_id = auth.uid()));

-- posts: public read; artists write their own
create policy "posts readable" on public.posts for select using (true);
create policy "posts owner write" on public.posts for all
  using (artist_id = auth.uid()) with check (artist_id = auth.uid());

-- purchases/supporters: buyer + artist can read; writes happen via service role (webhooks)
create policy "purchases visible to parties" on public.purchases for select
  using (buyer_id = auth.uid()
         or exists (select 1 from public.releases r
                    where r.id = release_id and r.artist_id = auth.uid()));
create policy "supporters visible to parties" on public.supporters for select
  using (fan_id = auth.uid() or artist_id = auth.uid());

-- recognitions / play_sessions: owner-only (heartbeat inserts as the user)
create policy "recognitions own" on public.recognitions for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "play_sessions own" on public.play_sessions for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- app_config: readable by everyone; writes via service role only
create policy "app_config readable" on public.app_config for select using (true);

-- ============================================================
-- STORAGE BUCKETS
--   audio  : private — signed URLs only (stream/download minted server-side)
--   covers : public read, owner write
-- ============================================================
insert into storage.buckets (id, name, public) values ('audio', 'audio', false);
insert into storage.buckets (id, name, public) values ('covers', 'covers', true);

create policy "audio owner upload" on storage.objects for insert
  with check (bucket_id = 'audio' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "audio owner manage" on storage.objects for all
  using (bucket_id = 'audio' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "covers public read" on storage.objects for select
  using (bucket_id = 'covers');
create policy "covers owner upload" on storage.objects for insert
  with check (bucket_id = 'covers' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "covers owner manage" on storage.objects for all
  using (bucket_id = 'covers' and (storage.foldername(name))[1] = auth.uid()::text);

-- ============================================================
-- updated_at trigger
-- ============================================================
create or replace function public.set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end $$ language plpgsql;

create trigger profiles_updated before update on public.profiles
  for each row execute function public.set_updated_at();

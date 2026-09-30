-- add podcasts

-- Auto-update updatedAt on row changes.
create or replace function touchUpdatedAt()
returns trigger
language plpgsql
as $$
begin
  new.updatedAt = now();
  return new;
end;
$$;

create table users (
  id uuid primary key default uuidGenerateV7(),
  createdAt timestamptz not null default now(),
  updatedAt timestamptz not null default now(),
  email text not null unique,
  name text not null,
  passwordHash text not null
);

create trigger usersTouchUpdatedAt
  before update on users
  for each row execute function touchUpdatedAt();

-- Uploaded bytes: cover art and episode audio. The hash goes in the url so a
-- cover can be cached forever and a replaced file gets a new address.
create table files (
  id uuid primary key default uuidGenerateV7(),
  createdAt timestamptz not null default now(),
  updatedAt timestamptz not null default now(),
  name text not null,
  contentType text not null,
  size integer not null,
  data bytea not null,
  hash text generated always as (encode(sha256(data), 'hex')) stored
);

create trigger filesTouchUpdatedAt
  before update on files
  for each row execute function touchUpdatedAt();

create table shows (
  id uuid primary key default uuidGenerateV7(),
  createdAt timestamptz not null default now(),
  updatedAt timestamptz not null default now(),
  userId uuid not null references users(id) on delete cascade,
  slug text not null unique,
  title text not null,
  description text not null,
  author text not null,
  category text not null,
  language text not null default 'en',
  explicit boolean not null default false,
  coverFileId uuid references files(id) on delete set null,
  applePodcastsUrl text not null default '',
  spotifyUrl text not null default ''
);

create index showsUserIdx on shows (userId);

create trigger showsTouchUpdatedAt
  before update on shows
  for each row execute function touchUpdatedAt();

create table episodes (
  id uuid primary key default uuidGenerateV7(),
  createdAt timestamptz not null default now(),
  updatedAt timestamptz not null default now(),
  showId uuid not null references shows(id) on delete cascade,
  number integer not null check (number > 0),
  title text not null,
  notes text not null default '',
  audioFileId uuid not null references files(id),
  durationSeconds integer not null default 0,
  publishAt timestamptz not null default now(),
  unique (showId, number)
);

create index episodesPublishIdx on episodes (showId, publishAt desc);

create trigger episodesTouchUpdatedAt
  before update on episodes
  for each row execute function touchUpdatedAt();

-- One row per episode per day. userId is the show's owner, so the dashboard
-- opens one partition per podcaster.
create table downloadDays (
  id uuid primary key default uuidGenerateV7(),
  createdAt timestamptz not null default now(),
  updatedAt timestamptz not null default now(),
  userId uuid not null references users(id) on delete cascade,
  showId uuid not null references shows(id) on delete cascade,
  episodeId uuid not null references episodes(id) on delete cascade,
  day date not null,
  count integer not null default 0,
  unique (episodeId, day)
);

create index downloadDaysUserDayIdx on downloadDays (userId, day);

create trigger downloadDaysTouchUpdatedAt
  before update on downloadDays
  for each row execute function touchUpdatedAt();

-- A listener's app asks for the same file in many range requests, and again
-- when it resumes. One visitor counts once per episode per day.
create table downloadHits (
  id uuid primary key default uuidGenerateV7(),
  createdAt timestamptz not null default now(),
  updatedAt timestamptz not null default now(),
  episodeId uuid not null references episodes(id) on delete cascade,
  day date not null,
  visitor text not null,
  unique (episodeId, day, visitor)
);

create trigger downloadHitsTouchUpdatedAt
  before update on downloadHits
  for each row execute function touchUpdatedAt();

-- Counts are written with plain sql from the audio route, so the write itself
-- carries the change to the owner's open dashboards.
create or replace function downloadDaysNotify() returns trigger
language plpgsql as $$
declare
  r record;
  payload text;
begin
  r := coalesce(new, old);

  payload := json_build_object(
    'op', lower(tg_op),
    'data', json_build_object(
      'id', r.id,
      'userId', r.userId,
      'showId', r.showId,
      'episodeId', r.episodeId,
      'day', to_char(r.day, 'YYYY-MM-DD'),
      'count', r.count
    )
  )::text;

  perform pg_notify(channel_name('download_days'), payload);

  return r;
end;
$$;

create trigger downloadDaysNotifyTrigger
  after insert or update or delete on downloadDays
  for each row execute function downloadDaysNotify();

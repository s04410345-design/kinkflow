begin;

-- Profile visibility stays backward-compatible in profiles.layout_config.profileMeta.
-- Remove the old public SELECT surface so public profile reads go through the
-- visibility-aware server API instead of exposing the whole row.
drop policy if exists "Public profiles are viewable by everyone." on public.profiles;
create policy "Profile owner can read own profile"
  on public.profiles
  for select to authenticated
  using (id = auth.uid());
create policy "Administrators can read profiles"
  on public.profiles
  for select to authenticated
  using (private.is_forum_admin(auth.uid()));

create index if not exists profiles_username_lower_idx
  on public.profiles (lower(username));

-- Direct-to-storage video uploads never pass the file through a Next.js
-- request body. This table records the signed-upload lifecycle before the
-- corresponding media_assets row becomes active.
create table if not exists public.video_uploads (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  storage_path text not null unique,
  byte_size bigint not null check (byte_size > 0),
  width integer not null check (width > 0),
  height integer not null check (height > 0),
  duration_seconds numeric not null check (duration_seconds > 0),
  status text not null default 'pending' check (status in ('pending', 'active', 'abandoned')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '30 minutes')
);
alter table public.video_uploads
  add column if not exists media_asset_id uuid references public.media_assets(id) on delete set null;
create index if not exists video_uploads_owner_status_idx
  on public.video_uploads (owner_id, status, created_at desc);
create index if not exists video_uploads_media_asset_idx
  on public.video_uploads (media_asset_id);
alter table public.video_uploads enable row level security;
revoke all on table public.video_uploads from anon, authenticated;
grant select, insert, update on table public.video_uploads to authenticated;
create policy "Video upload owners can read own rows"
  on public.video_uploads
  for select to authenticated
  using (owner_id = auth.uid());
create policy "Video upload owners can create own rows"
  on public.video_uploads
  for insert to authenticated
  with check (owner_id = auth.uid());
create policy "Video upload owners can update own rows"
  on public.video_uploads
  for update to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());
create policy "Administrators can manage video upload rows"
  on public.video_uploads
  for all to authenticated
  using (private.is_forum_admin(auth.uid()))
  with check (private.is_forum_admin(auth.uid()));

create index if not exists media_assets_video_owner_status_idx
  on public.media_assets (owner_id, media_type, status, created_at desc);

create or replace function private.enforce_video_asset_limits()
returns trigger
language plpgsql
security definer
set search_path = public, private, pg_catalog
as $$
declare
  used_bytes bigint;
begin
  if new.media_type <> 'video' then
    return new;
  end if;

  if new.owner_id is null
     or new.byte_size <= 0
     or new.byte_size > 52428800
     or new.width is null
     or new.height is null
     or new.width > 1280
     or new.height > 720
     or new.duration_seconds is null
     or new.duration_seconds <= 0
     or new.duration_seconds > 300 then
    raise exception 'Video must be MP4 720p or lower, no longer than 5 minutes and no larger than 50 MB';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('video-quota:' || new.owner_id::text, 0));
  select coalesce(sum(byte_size), 0)::bigint
    into used_bytes
    from public.media_assets
   where owner_id = new.owner_id
     and media_type = 'video'
     and status in ('active', 'blocked');

  if used_bytes + new.byte_size > 524288000 then
    raise exception 'Video storage quota exceeded';
  end if;

  return new;
end;
$$;

revoke all on function private.enforce_video_asset_limits() from public, anon, authenticated;
drop trigger if exists media_assets_video_limits_trigger on public.media_assets;
create trigger media_assets_video_limits_trigger
  before insert or update on public.media_assets
  for each row execute function private.enforce_video_asset_limits();

-- A report from five different authenticated users hides content first and
-- leaves the final decision to an administrator. The lock prevents concurrent
-- fifth reports from both missing the threshold.
create table if not exists public.report_auto_actions (
  id uuid primary key default gen_random_uuid(),
  target_type text not null check (target_type in ('article', 'forum_post', 'forum_comment', 'realtime_message', 'profile')),
  target_id uuid not null,
  report_count integer not null check (report_count >= 5),
  action_type text not null check (action_type = 'auto_hide'),
  created_at timestamptz not null default now(),
  cleared_at timestamptz,
  cleared_by uuid references auth.users(id) on delete set null
);
alter table public.report_auto_actions add column if not exists cleared_at timestamptz;
alter table public.report_auto_actions add column if not exists cleared_by uuid references auth.users(id) on delete set null;
-- 允許同一目標在管理員清除舊 action 後再次進入五票審核流程。
drop index if exists public.report_auto_actions_target_idx;
create unique index if not exists report_auto_actions_target_idx
  on public.report_auto_actions (target_type, target_id)
  where cleared_at is null;
create index if not exists report_auto_actions_created_idx
  on public.report_auto_actions (created_at desc);
alter table public.report_auto_actions enable row level security;
revoke all on table public.report_auto_actions from anon, authenticated;
grant select on table public.report_auto_actions to authenticated;
create policy "Administrators can read report auto actions"
  on public.report_auto_actions
  for select to authenticated
  using (private.is_forum_admin(auth.uid()));

create or replace function private.auto_hide_report_target()
returns trigger
language plpgsql
security definer
set search_path = public, private, pg_catalog
as $$
declare
  report_count integer;
  did_hide boolean := false;
begin
  if new.reporter_id is null or new.status not in ('open', 'reviewing') then
    return new;
  end if;

  perform pg_advisory_xact_lock(hashtextextended(new.target_type || ':' || new.target_id::text, 0));
  select count(distinct reporter_id)::integer
    into report_count
    from public.reports
   where target_type = new.target_type
     and target_id = new.target_id
     and reporter_id is not null
     and status in ('open', 'reviewing');

  if report_count < 5 then
    return new;
  end if;

  if new.target_type = 'article' then
    update public.articles
       set status = 'hidden', updated_at = now()
     where id = new.target_id and status = 'published';
    did_hide := found;
  elsif new.target_type = 'forum_post' then
    update public.forum_posts
       set status = 'hidden', updated_at = now()
     where id = new.target_id and status = 'published';
    did_hide := found;
  elsif new.target_type = 'forum_comment' then
    update public.forum_comments
       set status = 'hidden', updated_at = now()
     where id = new.target_id and status = 'published';
    did_hide := found;
  elsif new.target_type = 'realtime_message' then
    update public.lobby_chat
       set is_hidden = true
     where id = new.target_id and is_hidden = false;
    did_hide := found;
  elsif new.target_type = 'profile' then
    update public.profiles
       set layout_config = jsonb_set(
         coalesce(layout_config, '{}'::jsonb),
         '{profileMeta,searchable}',
         'false'::jsonb,
         true
       )
     where id = new.target_id;
    did_hide := found;
  end if;

  if did_hide then
    insert into public.report_auto_actions (target_type, target_id, report_count, action_type)
    values (new.target_type, new.target_id, report_count, 'auto_hide')
    on conflict (target_type, target_id) do nothing;
  end if;

  return new;
end;
$$;

revoke all on function private.auto_hide_report_target() from public, anon, authenticated;
drop trigger if exists reports_auto_hide_trigger on public.reports;
create trigger reports_auto_hide_trigger
after insert on public.reports
for each row execute function private.auto_hide_report_target();

-- 專題誌影片使用獨立 bucket，避免與 quiz-images 共用 MIME／容量設定。
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('article-videos', 'article-videos', true, 52428800, array['video/mp4']::text[])
on conflict (id) do update
set name = excluded.name,
    public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public can read article video objects" on storage.objects;
create policy "Public can read article video objects"
  on storage.objects
  for select to public
  using (bucket_id = 'article-videos');

-- Anonymous visitors may post in the lobby, but only the latest 48 hours are
-- public. Administrators retain access for moderation and incident review.
drop policy if exists "任何人可讀取聊天訊息" on public.lobby_chat;
create policy "公開只能讀取 48 小時內聊天"
  on public.lobby_chat
  for select to public
  using (is_hidden = false and created_at > now() - interval '48 hours');
create policy "管理員可讀取全部聊天"
  on public.lobby_chat
  for select to authenticated
  using (private.is_forum_admin(auth.uid()));
create index if not exists lobby_chat_created_hidden_idx
  on public.lobby_chat (created_at desc, is_hidden);

comment on table public.video_uploads is 'Signed upload lifecycle for special-author videos; media bytes live in Storage.';
comment on table public.report_auto_actions is 'Automatic five-unique-reporter hide events awaiting admin review.';

commit;

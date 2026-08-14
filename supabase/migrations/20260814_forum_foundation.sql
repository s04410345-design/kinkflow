-- Forum foundation: articles, forum posts/comments, public lobby chat,
-- media metadata, verified authors, reactions, reports and moderation audit.
-- This file is a draft. Do not apply to production without review.

create table if not exists public.author_verifications (
  user_id uuid primary key references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'revoked')),
  application_text text not null default '',
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  review_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.media_assets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) on delete set null,
  storage_path text not null unique,
  media_type text not null check (media_type in ('image', 'video', 'gif')),
  byte_size bigint not null check (byte_size > 0),
  width integer,
  height integer,
  duration_seconds numeric,
  status text not null default 'active' check (status in ('active', 'blocked', 'deleted')),
  created_at timestamptz not null default now()
);

create table if not exists public.articles (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  slug text not null unique check (char_length(slug) between 1 and 240),
  excerpt text not null default '',
  body_json jsonb not null default '{}'::jsonb,
  cover_media_id uuid references public.media_assets(id) on delete set null,
  status text not null default 'draft' check (status in ('draft', 'published', 'hidden', 'deleted')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz
);

create table if not exists public.forum_categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text not null default '',
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.forum_posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references auth.users(id) on delete cascade,
  category_id uuid references public.forum_categories(id) on delete set null,
  title text not null check (char_length(title) between 1 and 160),
  body_text text not null check (char_length(body_text) between 1 and 10000),
  status text not null default 'published' check (status in ('published', 'hidden', 'deleted')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.forum_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.forum_posts(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  body_text text not null check (char_length(body_text) between 1 and 3000),
  status text not null default 'published' check (status in ('published', 'hidden', 'deleted')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.forum_post_media (
  post_id uuid not null references public.forum_posts(id) on delete cascade,
  media_id uuid not null references public.media_assets(id) on delete restrict,
  sort_order integer not null default 0 check (sort_order >= 0),
  created_at timestamptz not null default now(),
  primary key (post_id, media_id)
);

-- Lobby Chat 已存在正式表 public.lobby_chat。
-- 本 foundation migration 不建立第二套 realtime_messages；聊天 adapter 與 rate-limit
-- 將在後續 add-only migration 中直接相容既有 lobby_chat。

create table if not exists public.reactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  guest_key text,
  target_type text not null check (target_type in ('article', 'forum_post', 'forum_comment', 'node')),
  target_id uuid not null,
  reaction_type text not null check (reaction_type in ('like', 'need', 'curious', 'neutral', 'nope')),
  created_at timestamptz not null default now(),
  constraint reactions_has_actor check (user_id is not null or guest_key is not null),
  unique (user_id, target_type, target_id, reaction_type)
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references auth.users(id) on delete set null,
  guest_key text,
  target_type text not null check (target_type in ('article', 'forum_post', 'forum_comment', 'realtime_message', 'profile')),
  target_id uuid not null,
  reason text not null check (char_length(reason) between 1 and 1000),
  status text not null default 'open' check (status in ('open', 'reviewing', 'resolved', 'dismissed')),
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint reports_has_actor check (reporter_id is not null or guest_key is not null)
);

create table if not exists public.moderation_actions (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references auth.users(id) on delete restrict,
  target_type text not null,
  target_id uuid not null,
  action_type text not null check (action_type in ('hide', 'delete', 'restore', 'resolve_report', 'reject_report')),
  reason text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists articles_author_status_idx on public.articles (author_id, status, updated_at desc);
create index if not exists forum_posts_category_created_idx on public.forum_posts (category_id, created_at desc);
create index if not exists forum_comments_post_created_idx on public.forum_comments (post_id, created_at asc);
create index if not exists forum_post_media_media_idx on public.forum_post_media (media_id, post_id);
create index if not exists reports_status_created_idx on public.reports (status, created_at desc);

alter table public.author_verifications enable row level security;
alter table public.media_assets enable row level security;
alter table public.articles enable row level security;
alter table public.forum_categories enable row level security;
alter table public.forum_posts enable row level security;
alter table public.forum_comments enable row level security;
alter table public.forum_post_media enable row level security;
alter table public.reactions enable row level security;
alter table public.reports enable row level security;
alter table public.moderation_actions enable row level security;

-- Helper functions use SECURITY DEFINER to avoid recursive admin_roles policies.
create or replace function public.is_forum_admin(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admin_roles ar
    where ar.user_id = uid and ar.role_level <= 2
  );
$$;

create or replace function public.is_verified_author(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.author_verifications av
    where av.user_id = uid and av.status = 'approved'
  );
$$;

revoke all on function public.is_forum_admin(uuid) from public;
revoke all on function public.is_verified_author(uuid) from public;
grant execute on function public.is_forum_admin(uuid) to anon, authenticated;
grant execute on function public.is_verified_author(uuid) to anon, authenticated;

create policy articles_public_read on public.articles
for select to anon, authenticated using (status = 'published');
create policy articles_author_manage on public.articles
for all to authenticated using (author_id = auth.uid() and is_verified_author(auth.uid()))
with check (author_id = auth.uid() and is_verified_author(auth.uid()));
create policy articles_admin_manage on public.articles
for all to authenticated using (is_forum_admin(auth.uid()))
with check (is_forum_admin(auth.uid()));

create policy categories_public_read on public.forum_categories
for select to anon, authenticated using (is_active = true);
create policy categories_admin_manage on public.forum_categories
for all to authenticated using (is_forum_admin(auth.uid()))
with check (is_forum_admin(auth.uid()));

create policy forum_posts_public_read on public.forum_posts
for select to anon, authenticated using (status = 'published');
create policy forum_posts_member_create on public.forum_posts
for insert to authenticated with check (author_id = auth.uid());
create policy forum_posts_author_update on public.forum_posts
for update to authenticated using (author_id = auth.uid()) with check (author_id = auth.uid());
create policy forum_posts_admin_delete on public.forum_posts
for delete to authenticated using (is_forum_admin(auth.uid()));

create policy forum_comments_public_read on public.forum_comments
for select to anon, authenticated using (status = 'published');
create policy forum_comments_member_create on public.forum_comments
for insert to authenticated with check (author_id = auth.uid());
create policy forum_comments_author_update on public.forum_comments
for update to authenticated using (author_id = auth.uid()) with check (author_id = auth.uid());
create policy forum_comments_admin_delete on public.forum_comments
for delete to authenticated using (is_forum_admin(auth.uid()));

create policy forum_post_media_public_read on public.forum_post_media
for select to anon, authenticated using (
  exists (
    select 1 from public.forum_posts p
    where p.id = post_id and p.status = 'published'
  )
);
create policy forum_post_media_author_manage on public.forum_post_media
for all to authenticated using (
  exists (
    select 1 from public.forum_posts p
    where p.id = post_id and p.author_id = auth.uid()
  )
) with check (
  exists (
    select 1 from public.forum_posts p
    where p.id = post_id and p.author_id = auth.uid()
  )
);
create policy forum_post_media_admin_manage on public.forum_post_media
for all to authenticated using (is_forum_admin(auth.uid()))
with check (is_forum_admin(auth.uid()));

create policy media_public_read on public.media_assets
for select to anon, authenticated using (status = 'active');
create policy media_owner_insert on public.media_assets
for insert to authenticated with check (owner_id = auth.uid());
create policy media_owner_update on public.media_assets
for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy media_admin_manage on public.media_assets
for all to authenticated using (is_forum_admin(auth.uid()))
with check (is_forum_admin(auth.uid()));

create policy reactions_public_read on public.reactions
for select to anon, authenticated using (true);
create policy reactions_authenticated_write on public.reactions
for insert to authenticated with check (user_id = auth.uid());
create policy reactions_authenticated_delete on public.reactions
for delete to authenticated using (user_id = auth.uid());

create policy reports_authenticated_create on public.reports
for insert to authenticated with check (reporter_id = auth.uid());
create policy reports_admin_read on public.reports
for select to authenticated using (is_forum_admin(auth.uid()));
create policy reports_admin_update on public.reports
for update to authenticated using (is_forum_admin(auth.uid())) with check (is_forum_admin(auth.uid()));

create policy author_verification_self_read on public.author_verifications
for select to authenticated using (user_id = auth.uid());
create policy author_verification_self_create on public.author_verifications
for insert to authenticated with check (user_id = auth.uid() and status = 'pending');
create policy author_verification_admin_manage on public.author_verifications
for all to authenticated using (is_forum_admin(auth.uid()))
with check (is_forum_admin(auth.uid()));

create policy moderation_admin_only on public.moderation_actions
for all to authenticated using (is_forum_admin(auth.uid()))
with check (admin_id = auth.uid() and is_forum_admin(auth.uid()));

-- Realtime publication for the existing public.lobby_chat remains explicit and is not
-- changed by this migration. Enable it only after the Preview chat adapter is verified.

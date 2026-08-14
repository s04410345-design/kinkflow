-- KinkFlow 專題誌第一階段關聯 migration
-- 依賴：20260814_forum_foundation.sql
-- 本檔案只新增關聯與文章留言，不刪除或重命名既有資料。

create table if not exists public.article_node_links (
  article_id uuid not null references public.articles(id) on delete cascade,
  node_id text not null,
  relation_type text not null default 'primary' check (relation_type in ('primary', 'related', 'safety')),
  created_at timestamptz not null default now(),
  primary key (article_id, node_id)
);

create table if not exists public.forum_topics (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 160),
  excerpt text not null default '',
  status text not null default 'published' check (status in ('published', 'locked', 'hidden', 'deleted')),
  last_activity_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.topic_node_links (
  topic_id uuid not null references public.forum_topics(id) on delete cascade,
  node_id text not null,
  relation_type text not null default 'related' check (relation_type in ('primary', 'related', 'safety')),
  created_at timestamptz not null default now(),
  primary key (topic_id, node_id)
);

create table if not exists public.article_comments (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null references public.articles(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  body_text text not null check (char_length(body_text) between 1 and 3000),
  status text not null default 'published' check (status in ('published', 'hidden', 'deleted')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- forum_posts 仍保留既有 category_id；topic_id 是可選的漸進式關聯。
alter table public.forum_posts
  add column if not exists topic_id uuid references public.forum_topics(id) on delete set null;

create index if not exists article_node_links_node_idx
  on public.article_node_links (node_id, created_at desc);
create index if not exists topic_node_links_node_idx
  on public.topic_node_links (node_id, created_at desc);
create index if not exists article_comments_article_created_idx
  on public.article_comments (article_id, created_at asc);
create index if not exists forum_topics_activity_idx
  on public.forum_topics (status, last_activity_at desc);
create index if not exists forum_posts_topic_activity_idx
  on public.forum_posts (topic_id, created_at desc);

alter table public.article_node_links enable row level security;
alter table public.forum_topics enable row level security;
alter table public.topic_node_links enable row level security;
alter table public.article_comments enable row level security;

create policy article_node_links_public_read on public.article_node_links
for select to anon, authenticated using (
  exists (
    select 1 from public.articles a
    where a.id = article_id and a.status = 'published'
  )
);

create policy article_node_links_author_manage on public.article_node_links
for all to authenticated using (
  exists (
    select 1 from public.articles a
    where a.id = article_id
      and a.author_id = auth.uid()
      and public.is_verified_author(auth.uid())
  )
)
with check (
  exists (
    select 1 from public.articles a
    where a.id = article_id
      and a.author_id = auth.uid()
      and public.is_verified_author(auth.uid())
  )
);

create policy article_node_links_admin_manage on public.article_node_links
for all to authenticated using (public.is_forum_admin(auth.uid()))
with check (public.is_forum_admin(auth.uid()));

create policy forum_topics_public_read on public.forum_topics
for select to anon, authenticated using (status in ('published', 'locked'));
create policy forum_topics_member_create on public.forum_topics
for insert to authenticated with check (author_id = auth.uid());
create policy forum_topics_author_update on public.forum_topics
for update to authenticated using (author_id = auth.uid()) with check (author_id = auth.uid());
create policy forum_topics_admin_delete on public.forum_topics
for delete to authenticated using (public.is_forum_admin(auth.uid()));

create policy topic_node_links_public_read on public.topic_node_links
for select to anon, authenticated using (
  exists (
    select 1 from public.forum_topics t
    where t.id = topic_id and t.status in ('published', 'locked')
  )
);
create policy topic_node_links_author_manage on public.topic_node_links
for all to authenticated using (
  exists (
    select 1 from public.forum_topics t
    where t.id = topic_id and t.author_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.forum_topics t
    where t.id = topic_id and t.author_id = auth.uid()
  )
);
create policy topic_node_links_admin_manage on public.topic_node_links
for all to authenticated using (public.is_forum_admin(auth.uid()))
with check (public.is_forum_admin(auth.uid()));

create policy article_comments_public_read on public.article_comments
for select to anon, authenticated using (status = 'published');
create policy article_comments_member_create on public.article_comments
for insert to authenticated with check (author_id = auth.uid());
create policy article_comments_author_update on public.article_comments
for update to authenticated using (author_id = auth.uid()) with check (author_id = auth.uid());
create policy article_comments_admin_delete on public.article_comments
for delete to authenticated using (public.is_forum_admin(auth.uid()));

-- 不自動加入 Realtime publication；待文章列表與留言 API 完成後再評估。

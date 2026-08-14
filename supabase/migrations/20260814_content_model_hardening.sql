-- KinkFlow 四模組資料模型補強草稿
-- 依賴：20260814_forum_foundation.sql、20260814_article_journal_links.sql
-- 本檔案尚未套用正式 Supabase。

create table if not exists public.mindmap_nodes (
  id text primary key,
  label text not null,
  description text not null default '',
  safety_text text not null default '',
  parent_id text references public.mindmap_nodes(id) on delete set null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.node_votes (
  id uuid primary key default gen_random_uuid(),
  node_id text not null references public.mindmap_nodes(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  vote_type text not null check (vote_type in ('need', 'like', 'curious', 'neutral', 'nope')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (node_id, user_id)
);

create index if not exists node_votes_node_type_idx
  on public.node_votes (node_id, vote_type);
create index if not exists mindmap_nodes_parent_sort_idx
  on public.mindmap_nodes (parent_id, sort_order);

alter table public.mindmap_nodes enable row level security;
alter table public.node_votes enable row level security;

create policy mindmap_nodes_public_read on public.mindmap_nodes
for select to anon, authenticated using (is_active = true);
create policy mindmap_nodes_admin_manage on public.mindmap_nodes
for all to authenticated using (public.is_forum_admin(auth.uid()))
with check (public.is_forum_admin(auth.uid()));

create policy node_votes_public_aggregate_read on public.node_votes
for select to anon, authenticated using (true);
create policy node_votes_member_insert on public.node_votes
for insert to authenticated with check (user_id = auth.uid());
create policy node_votes_member_update on public.node_votes
for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy node_votes_member_delete on public.node_votes
for delete to authenticated using (user_id = auth.uid());

-- 統計查詢應使用：select vote_type, count(*) from node_votes
-- where node_id = :node_id group by vote_type。
-- 前端不可自行累加計數，也不可接受 client 傳入的 total。

-- 只建立節點索引，不覆蓋 quiz_content 中的既有完整文章內容。
-- 後續可由管理員在 mindmap_nodes 維護摘要與安全提示。
insert into public.mindmap_nodes (id, label, parent_id, sort_order)
values
  ('bdsm', 'BDSM大廳', null, 0),
  ('community_safety', '社群與安全防護', 'bdsm', 10),
  ('bondage', '繩藝與肢體束縛', 'bdsm', 20),
  ('ds_main', '支配與臣服動態', 'bdsm', 30),
  ('sm_main', '施虐與痛覺體驗', 'bdsm', 40),
  ('sensory_deprivation', '感官剝奪與剝離', 'bdsm', 50),
  ('scenario_play', '情境劇本與扮演', 'bdsm', 60),
  ('mental_control', '心理控制與催眠', 'bdsm', 70),
  ('consensus_risk', '知情同意與風險認知', 'bdsm', 80),
  ('diverse_relations', '多元關係與親密連結', 'bdsm', 90)
on conflict (id) do nothing;

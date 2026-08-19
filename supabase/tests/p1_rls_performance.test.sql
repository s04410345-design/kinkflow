begin;

select plan(20);

-- 測試資料只存在本次 transaction，最後 rollback，不會污染 production。
set local role postgres;
select set_config('search_path', 'public, private, extensions, pg_catalog', true);

insert into auth.users (id, email)
values
  ('11000000-0000-4000-8000-000000000001', 'p1-owner@example.test'),
  ('11000000-0000-4000-8000-000000000002', 'p1-stranger@example.test'),
  ('11000000-0000-4000-8000-000000000003', 'p1-admin@example.test')
on conflict (id) do nothing;

insert into public.admin_roles (id, user_id, role_level, granted_by)
values ('21000000-0000-4000-8000-000000000001', '11000000-0000-4000-8000-000000000003', 1, null)
on conflict (user_id) do update set role_level = excluded.role_level;

insert into public.profiles (id, username, bio, layout_config)
values
  ('11000000-0000-4000-8000-000000000001', 'p1-owner', 'owner', '{"profileMeta":{"searchable":true}}'::jsonb),
  ('11000000-0000-4000-8000-000000000002', 'p1-stranger', 'stranger', '{"profileMeta":{"searchable":true}}'::jsonb)
on conflict (id) do update set layout_config = excluded.layout_config;

insert into public.author_verifications (user_id, status, application_text)
values ('11000000-0000-4000-8000-000000000001', 'approved', 'P1 test author')
on conflict (user_id) do update set status = excluded.status;

insert into public.articles (id, author_id, title, slug, excerpt, body_json, status)
values ('41000000-0000-4000-8000-000000000001', '11000000-0000-4000-8000-000000000001', 'P1 article', 'p1-article', '', '{}'::jsonb, 'published')
on conflict (id) do nothing;

insert into public.forum_posts (id, author_id, title, body_text, status)
values ('42000000-0000-4000-8000-000000000001', '11000000-0000-4000-8000-000000000001', 'P1 post', 'P1 body', 'published')
on conflict (id) do nothing;

insert into public.forum_comments (id, post_id, author_id, body_text, status)
values ('43000000-0000-4000-8000-000000000001', '42000000-0000-4000-8000-000000000001', '11000000-0000-4000-8000-000000000001', 'P1 comment', 'published')
on conflict (id) do nothing;

insert into public.notifications (id, user_id, type, content)
values ('44000000-0000-4000-8000-000000000001', '11000000-0000-4000-8000-000000000001', 'system', 'P1 body')
on conflict (id) do nothing;

insert into public.lobby_chat (id, author_id, guest_key, text, created_at)
values
  ('45000000-0000-4000-8000-000000000001', null, 'p1_guest_old_00000001', 'old', now() - interval '49 hours'),
  ('45000000-0000-4000-8000-000000000002', null, 'p1_guest_new_00000002', 'new', now() - interval '1 hour')
on conflict (id) do nothing;

-- Profile owner／other member／admin read and owner update boundaries.
set local role authenticated;
set local request.jwt.claim.sub = '11000000-0000-4000-8000-000000000001';
select is((select count(*)::int from public.profiles where id = '11000000-0000-4000-8000-000000000001'::uuid), 1, '本人可以讀取自己的 profile');
select is((select count(*)::int from public.profiles where id = '11000000-0000-4000-8000-000000000002'::uuid), 0, '會員不能讀取其他會員 profile');
update public.profiles set bio = 'owner updated' where id = '11000000-0000-4000-8000-000000000001'::uuid;
select is((select bio from public.profiles where id = '11000000-0000-4000-8000-000000000001'::uuid), 'owner updated', '本人可以更新自己的 profile');

set local request.jwt.claim.sub = '11000000-0000-4000-8000-000000000003';
select is((select count(*)::int from public.profiles where id = '11000000-0000-4000-8000-000000000001'::uuid), 1, '管理員可以讀取 profile');

-- Lobby chat recent／old boundary and owner-independent guest write.
set local role anon;
reset request.jwt.claim.sub;
select is((select count(*)::int from public.lobby_chat where id = '45000000-0000-4000-8000-000000000002'::uuid), 1, '匿名可以讀取 48 小時內聊天');
select is((select count(*)::int from public.lobby_chat where id = '45000000-0000-4000-8000-000000000001'::uuid), 0, '匿名不能讀取超過 48 小時聊天');

-- Article author／other member／public／admin policy semantics.
set local role authenticated;
set local request.jwt.claim.sub = '11000000-0000-4000-8000-000000000001';
update public.articles set excerpt = 'owner updated article' where id = '41000000-0000-4000-8000-000000000001'::uuid;
select is((select excerpt from public.articles where id = '41000000-0000-4000-8000-000000000001'::uuid), 'owner updated article', '特別用戶可以更新自己的文章');

set local request.jwt.claim.sub = '11000000-0000-4000-8000-000000000002';
update public.articles set excerpt = 'stranger must not update' where id = '41000000-0000-4000-8000-000000000001'::uuid;
select is((select excerpt from public.articles where id = '41000000-0000-4000-8000-000000000001'::uuid), 'owner updated article', '其他會員不能更新別人的文章');

set local role anon;
reset request.jwt.claim.sub;
select is((select count(*)::int from public.articles where id = '41000000-0000-4000-8000-000000000001'::uuid), 1, '匿名可以讀取已發布文章');

set local role authenticated;
set local request.jwt.claim.sub = '11000000-0000-4000-8000-000000000003';
select is((select count(*)::int from public.articles where id = '41000000-0000-4000-8000-000000000001'::uuid), 1, '管理員可以讀取已發布文章');

-- Forum author／other member／admin policy semantics.
set local role authenticated;
set local request.jwt.claim.sub = '11000000-0000-4000-8000-000000000001';
update public.forum_posts set body_text = 'owner updated post' where id = '42000000-0000-4000-8000-000000000001'::uuid;
select is((select body_text from public.forum_posts where id = '42000000-0000-4000-8000-000000000001'::uuid), 'owner updated post', '貼文作者可以更新自己的貼文');
update public.forum_comments set body_text = 'owner updated comment' where id = '43000000-0000-4000-8000-000000000001'::uuid;
select is((select body_text from public.forum_comments where id = '43000000-0000-4000-8000-000000000001'::uuid), 'owner updated comment', '留言作者可以更新自己的留言');

set local request.jwt.claim.sub = '11000000-0000-4000-8000-000000000002';
update public.forum_posts set body_text = 'stranger must not update' where id = '42000000-0000-4000-8000-000000000001'::uuid;
select is((select body_text from public.forum_posts where id = '42000000-0000-4000-8000-000000000001'::uuid), 'owner updated post', '其他會員不能更新別人的貼文');

set local request.jwt.claim.sub = '11000000-0000-4000-8000-000000000001';
select is((select count(*)::int from public.notifications where user_id = '11000000-0000-4000-8000-000000000001'::uuid), 1, '會員本人可以讀取自己的通知');

set local request.jwt.claim.sub = '11000000-0000-4000-8000-000000000003';
select is((select count(*)::int from public.lobby_chat where id = '45000000-0000-4000-8000-000000000001'::uuid), 1, '管理員可以讀取超過 48 小時聊天');

-- Reports／media owner／admin boundaries.
set local request.jwt.claim.sub = '11000000-0000-4000-8000-000000000001';
insert into public.reports (reporter_id, target_type, target_id, reason)
values ('11000000-0000-4000-8000-000000000001'::uuid, 'article', '41000000-0000-4000-8000-000000000001'::uuid, 'P1 report');
select is((select count(*)::int from public.reports where reporter_id = '11000000-0000-4000-8000-000000000001'::uuid), 1, '會員仍可以建立檢舉');
select is((select count(*)::int from public.reports), 0, '一般會員不能讀取全站檢舉');

set local request.jwt.claim.sub = '11000000-0000-4000-8000-000000000003';
select is((select count(*)::int from public.reports), 1, '管理員可以讀取檢舉');

set local role anon;
reset request.jwt.claim.sub;
select is((select count(*)::int from public.media_assets where status = 'active'), 0, '匿名仍只能讀取 active media asset');

set local role authenticated;
set local request.jwt.claim.sub = '11000000-0000-4000-8000-000000000003';
select is((select count(*)::int from public.author_verifications where user_id = '11000000-0000-4000-8000-000000000001'::uuid), 1, '管理員可以讀取特別用戶認證資料');

select * from finish();
rollback;

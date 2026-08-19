begin;

select plan(28);

-- 測試資料只存在本次 transaction，最後會 rollback，不會污染任何環境。
set local role postgres;

select set_config('search_path', 'public, private, extensions, pg_catalog', true);

insert into auth.users (id, email)
values
  ('10000000-0000-4000-8000-000000000001', 'rls-owner@example.test'),
  ('10000000-0000-4000-8000-000000000002', 'rls-stranger@example.test'),
  ('10000000-0000-4000-8000-000000000003', 'rls-admin@example.test'),
  ('10000000-0000-4000-8000-000000000011', 'rls-reporter-1@example.test'),
  ('10000000-0000-4000-8000-000000000012', 'rls-reporter-2@example.test'),
  ('10000000-0000-4000-8000-000000000013', 'rls-reporter-3@example.test'),
  ('10000000-0000-4000-8000-000000000014', 'rls-reporter-4@example.test'),
  ('10000000-0000-4000-8000-000000000015', 'rls-reporter-5@example.test')
on conflict (id) do nothing;

insert into public.admin_roles (id, user_id, role_level, granted_by)
values ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000003', 1, null)
on conflict (user_id) do update set role_level = excluded.role_level;

insert into public.profiles (id, username, bio, layout_config)
values
  ('10000000-0000-4000-8000-000000000001', 'rls-owner', 'owner profile', '{"profileMeta":{"searchable":true}}'::jsonb),
  ('10000000-0000-4000-8000-000000000002', 'rls-stranger', 'stranger profile', '{"profileMeta":{"searchable":true}}'::jsonb),
  ('10000000-0000-4000-8000-000000000003', 'rls-admin', 'admin profile', '{"profileMeta":{"searchable":true}}'::jsonb),
  ('10000000-0000-4000-8000-000000000099', 'rls-target', 'report target', '{"profileMeta":{"searchable":true}}'::jsonb)
on conflict (id) do update
set layout_config = excluded.layout_config;

insert into public.lobby_chat (id, author_id, guest_key, text, created_at)
values
  ('30000000-0000-4000-8000-000000000001', null, 'rls_old_guest_00000001', 'old lobby message', now() - interval '49 hours'),
  ('30000000-0000-4000-8000-000000000002', null, 'rls_new_guest_00000002', 'new lobby message', now() - interval '1 hour');

-- 管理員可讀取 report_auto_actions，但一般會員與匿名訪客不可讀取。
insert into public.report_auto_actions (target_type, target_id, report_count, action_type)
values ('profile', '10000000-0000-4000-8000-000000000098', 5, 'auto_hide');

select is((select file_size_limit::bigint from storage.buckets where id = 'article-videos'), 52428800::bigint, '專用影片 bucket 限制為 50 MB');
select is((select allowed_mime_types[1] from storage.buckets where id = 'article-videos'), 'video/mp4'::text, '專用影片 bucket 只允許 video/mp4');

-- profiles：匿名不得直讀；本人可讀；其他會員不可讀；管理員可讀。
set local role anon;
reset request.jwt.claim.sub;
select is_empty(
  $$select id from public.profiles where id = '10000000-0000-4000-8000-000000000001'::uuid$$,
  '匿名訪客不能直接讀取 profiles'
);

set local role authenticated;
set local request.jwt.claim.sub = '10000000-0000-4000-8000-000000000001';
select is((select count(*)::int from public.profiles where id = '10000000-0000-4000-8000-000000000001'::uuid), 1, '會員本人可以讀取自己的 profile');

set local request.jwt.claim.sub = '10000000-0000-4000-8000-000000000002';
select is((select count(*)::int from public.profiles where id = '10000000-0000-4000-8000-000000000001'::uuid), 0, '一般會員不能讀取其他會員 profile');

set local request.jwt.claim.sub = '10000000-0000-4000-8000-000000000003';
select is((select count(*)::int from public.profiles where id = '10000000-0000-4000-8000-000000000001'::uuid), 1, '管理員可以讀取 profile');

-- lobby_chat：匿名只能讀取最近 48 小時；管理員可讀取舊訊息。
set local role anon;
reset request.jwt.claim.sub;
select is((select count(*)::int from public.lobby_chat where id = '30000000-0000-4000-8000-000000000002'::uuid), 1, '匿名可以讀取 48 小時內聊天');
select is((select count(*)::int from public.lobby_chat where id = '30000000-0000-4000-8000-000000000001'::uuid), 0, '匿名不能讀取超過 48 小時聊天');

set local role authenticated;
set local request.jwt.claim.sub = '10000000-0000-4000-8000-000000000003';
select is((select count(*)::int from public.lobby_chat where id = '30000000-0000-4000-8000-000000000001'::uuid), 1, '管理員可以讀取超過 48 小時聊天');

-- video_uploads：匿名無寫入權；本人只能建立與讀取自己的 lifecycle row。
set local role anon;
reset request.jwt.claim.sub;
select throws_ok(
  $$insert into public.video_uploads (owner_id, storage_path, byte_size, width, height, duration_seconds)
    values ('10000000-0000-4000-8000-000000000001'::uuid, 'articles/videos/rls-denied.mp4', 1024, 1280, 720, 10)$$,
  '42501',
  null,
  '匿名不能建立影片 upload lifecycle row'
);

set local role authenticated;
set local request.jwt.claim.sub = '10000000-0000-4000-8000-000000000001';
insert into public.video_uploads (owner_id, storage_path, byte_size, width, height, duration_seconds)
values ('10000000-0000-4000-8000-000000000001'::uuid, 'articles/videos/rls-owner.mp4', 1024, 1280, 720, 10);
select is((select count(*)::int from public.video_uploads where storage_path = 'articles/videos/rls-owner.mp4'), 1, '影片擁有者可以建立自己的 upload lifecycle row');
select is((select count(*)::int from public.video_uploads where storage_path = 'articles/videos/rls-owner.mp4'), 1, '影片擁有者可以讀取自己的 upload lifecycle row');

set local request.jwt.claim.sub = '10000000-0000-4000-8000-000000000002';
select is((select count(*)::int from public.video_uploads where storage_path = 'articles/videos/rls-owner.mp4'), 0, '其他會員不能讀取別人的 upload lifecycle row');
update public.video_uploads
set status = 'active'
where storage_path = 'articles/videos/rls-owner.mp4';
select is((select count(*)::int from public.video_uploads where storage_path = 'articles/videos/rls-owner.mp4' and status = 'active'), 0, '其他會員不能修改別人的 upload lifecycle row');

set local request.jwt.claim.sub = '10000000-0000-4000-8000-000000000001';
update public.video_uploads
set status = 'abandoned'
where storage_path = 'articles/videos/rls-owner.mp4';
select is((select count(*)::int from public.video_uploads where storage_path = 'articles/videos/rls-owner.mp4' and status = 'abandoned'), 1, '影片擁有者可以更新自己的 upload lifecycle row');

-- reports：匿名不能檢舉；會員可以建立自己的檢舉；一般會員不能讀取全站檢舉；管理員可以讀取。
set local role anon;
reset request.jwt.claim.sub;
select throws_ok(
  $$insert into public.reports (reporter_id, target_type, target_id, reason)
    values ('10000000-0000-4000-8000-000000000002'::uuid, 'profile', '10000000-0000-4000-8000-000000000099'::uuid, '匿名不應能檢舉')$$,
  '42501',
  null,
  '匿名不能建立檢舉'
);

set local role authenticated;
set local request.jwt.claim.sub = '10000000-0000-4000-8000-000000000002';
insert into public.reports (reporter_id, target_type, target_id, reason)
values ('10000000-0000-4000-8000-000000000002'::uuid, 'profile', '10000000-0000-4000-8000-000000000099'::uuid, '會員測試檢舉');
select is((select count(*)::int from public.reports where reporter_id = '10000000-0000-4000-8000-000000000002'::uuid), 1, '會員可以建立自己的檢舉');
select throws_ok(
  $$insert into public.reports (reporter_id, target_type, target_id, reason)
    values ('10000000-0000-4000-8000-000000000002'::uuid, 'profile', '10000000-0000-4000-8000-000000000099'::uuid, '重複檢舉')$$,
  '23505',
  null,
  '同一會員對同一目標只能檢舉一次'
);
select is((select count(*)::int from public.reports where reporter_id = '10000000-0000-4000-8000-000000000002'::uuid), 0, '一般會員不能讀取 reports');

set local request.jwt.claim.sub = '10000000-0000-4000-8000-000000000003';
select is((select count(*)::int from public.reports where reporter_id = '10000000-0000-4000-8000-000000000002'::uuid), 1, '管理員可以讀取 reports');

-- report_auto_actions：只有管理員可讀取，且只有 service role／trigger 能寫入。
set local role anon;
reset request.jwt.claim.sub;
select throws_ok(
  $$select id from public.report_auto_actions where target_id = '10000000-0000-4000-8000-000000000098'::uuid$$,
  '42501',
  null,
  '匿名沒有 report_auto_actions 讀取權限'
);

set local role authenticated;
set local request.jwt.claim.sub = '10000000-0000-4000-8000-000000000002';
select is((select count(*)::int from public.report_auto_actions where target_id = '10000000-0000-4000-8000-000000000098'::uuid), 0, '一般會員不能讀取 report_auto_actions');
select throws_ok(
  $$insert into public.report_auto_actions (target_type, target_id, report_count, action_type)
    values ('profile', '10000000-0000-4000-8000-000000000097'::uuid, 5, 'auto_hide')$$,
  '42501',
  null,
  '一般會員不能寫入 report_auto_actions'
);

set local request.jwt.claim.sub = '10000000-0000-4000-8000-000000000003';
select is((select count(*)::int from public.report_auto_actions where target_id = '10000000-0000-4000-8000-000000000098'::uuid), 1, '管理員可以讀取 report_auto_actions');

-- 五票自動隱藏：五位不同會員後隱藏 profile，並且清除後可再次建立新的待審核 action。
set local role postgres;
update public.profiles
set layout_config = jsonb_set(coalesce(layout_config, '{}'::jsonb), '{profileMeta,searchable}', 'true'::jsonb, true)
where id = '10000000-0000-4000-8000-000000000099'::uuid;

insert into public.reports (reporter_id, target_type, target_id, reason)
values
  ('10000000-0000-4000-8000-000000000011'::uuid, 'profile', '10000000-0000-4000-8000-000000000099'::uuid, '五票測試 1'),
  ('10000000-0000-4000-8000-000000000012'::uuid, 'profile', '10000000-0000-4000-8000-000000000099'::uuid, '五票測試 2'),
  ('10000000-0000-4000-8000-000000000013'::uuid, 'profile', '10000000-0000-4000-8000-000000000099'::uuid, '五票測試 3'),
  ('10000000-0000-4000-8000-000000000014'::uuid, 'profile', '10000000-0000-4000-8000-000000000099'::uuid, '五票測試 4'),
  ('10000000-0000-4000-8000-000000000015'::uuid, 'profile', '10000000-0000-4000-8000-000000000099'::uuid, '五票測試 5');

select is((select layout_config #>> '{profileMeta,searchable}' from public.profiles where id = '10000000-0000-4000-8000-000000000099'::uuid), 'false', '五位不同會員檢舉後 profile 自動隱藏');
select is((select count(*)::int from public.report_auto_actions where target_type = 'profile' and target_id = '10000000-0000-4000-8000-000000000099'::uuid and cleared_at is null), 1, '五票後建立一筆待審核 auto-action');

update public.report_auto_actions
set cleared_at = now(), cleared_by = '10000000-0000-4000-8000-000000000003'::uuid
where target_type = 'profile' and target_id = '10000000-0000-4000-8000-000000000099'::uuid and cleared_at is null;
update public.reports
set status = 'dismissed'
where target_type = 'profile' and target_id = '10000000-0000-4000-8000-000000000099'::uuid;
update public.profiles
set layout_config = jsonb_set(coalesce(layout_config, '{}'::jsonb), '{profileMeta,searchable}', 'true'::jsonb, true)
where id = '10000000-0000-4000-8000-000000000099'::uuid;

insert into public.reports (reporter_id, target_type, target_id, reason)
values
  ('10000000-0000-4000-8000-000000000011'::uuid, 'profile', '10000000-0000-4000-8000-000000000099'::uuid, '第二輪測試 1'),
  ('10000000-0000-4000-8000-000000000012'::uuid, 'profile', '10000000-0000-4000-8000-000000000099'::uuid, '第二輪測試 2'),
  ('10000000-0000-4000-8000-000000000013'::uuid, 'profile', '10000000-0000-4000-8000-000000000099'::uuid, '第二輪測試 3'),
  ('10000000-0000-4000-8000-000000000014'::uuid, 'profile', '10000000-0000-4000-8000-000000000099'::uuid, '第二輪測試 4'),
  ('10000000-0000-4000-8000-000000000015'::uuid, 'profile', '10000000-0000-4000-8000-000000000099'::uuid, '第二輪測試 5');

select is((select count(*)::int from public.report_auto_actions where target_type = 'profile' and target_id = '10000000-0000-4000-8000-000000000099'::uuid), 2, '清除舊 action 後同一目標可以再次建立 auto-action');
select is((select count(*)::int from public.report_auto_actions where target_type = 'profile' and target_id = '10000000-0000-4000-8000-000000000099'::uuid and cleared_at is null), 1, '再次觸發時只保留一筆 pending auto-action');

select * from finish();
rollback;

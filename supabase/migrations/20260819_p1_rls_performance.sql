-- P1：將高頻 RLS policy 的 auth.uid() 改成 init-plan 形式，並補上
-- Performance Advisor 已指出的核心 foreign-key covering indexes。
-- 本 migration 必須在 20260819_community_roles_profile_moderation.sql 之後執行。

do $$
begin
  if to_regclass('public.video_uploads') is null
     or to_regclass('public.report_auto_actions') is null then
    raise exception 'P1 RLS migration requires 20260819_community_roles_profile_moderation.sql first';
  end if;
end;
$$;

-- Foreign-key indexes：只建立 Advisor 已指出且目前查詢／管理流程會使用的欄位。
create index if not exists admin_roles_granted_by_idx
  on public.admin_roles (granted_by);
create index if not exists article_comments_author_idx
  on public.article_comments (author_id);
create index if not exists article_permissions_user_idx
  on public.article_permissions (user_id);
create index if not exists article_permissions_granted_by_idx
  on public.article_permissions (granted_by);
create index if not exists articles_cover_media_idx
  on public.articles (cover_media_id);
create index if not exists author_verifications_reviewed_by_idx
  on public.author_verifications (reviewed_by);
create index if not exists discussion_bookmarks_post_idx
  on public.discussion_bookmarks (post_id);
create index if not exists discussion_reports_reporter_idx
  on public.discussion_reports (reporter_id);
create index if not exists discussions_author_idx
  on public.discussions (author_id);
create index if not exists discussions_parent_idx
  on public.discussions (parent_id);
create index if not exists forum_articles_author_idx
  on public.forum_articles (author_id);
create index if not exists forum_comments_author_idx
  on public.forum_comments (author_id);
create index if not exists forum_posts_author_idx
  on public.forum_posts (author_id);
create index if not exists forum_topics_author_idx
  on public.forum_topics (author_id);
create index if not exists lobby_chat_parent_idx
  on public.lobby_chat (parent_id);
create index if not exists moderation_actions_admin_idx
  on public.moderation_actions (admin_id);
create index if not exists node_votes_user_idx
  on public.node_votes (user_id);
create index if not exists notifications_user_idx
  on public.notifications (user_id);
create index if not exists report_events_admin_idx
  on public.report_events (admin_id);
create index if not exists reports_reviewed_by_idx
  on public.reports (reviewed_by);
create index if not exists site_config_updated_by_idx
  on public.site_config (updated_by);
create index if not exists quiz_results_user_idx
  on public.quiz_results (user_id);

-- Existing public policies：只改寫 auth.uid() 評估方式，不改變角色與資料邊界。
drop policy if exists "Users can insert their own profile." on public.profiles;
create policy "Users can insert their own profile."
  on public.profiles
  for insert to public
  with check ((select auth.uid()) = id);

drop policy if exists "Users can update own profile." on public.profiles;
create policy "Users can update own profile."
  on public.profiles
  for update to public
  using ((select auth.uid()) = id);

drop policy if exists "Profile owner can read own profile" on public.profiles;
create policy "Profile owner can read own profile"
  on public.profiles
  for select to authenticated
  using (id = (select auth.uid()));

drop policy if exists "Administrators can read profiles" on public.profiles;
create policy "Administrators can read profiles"
  on public.profiles
  for select to authenticated
  using (private.is_forum_admin((select auth.uid())));

drop policy if exists "使用者可更新自己的資料" on public.user_profiles;
create policy "使用者可更新自己的資料"
  on public.user_profiles
  for update to public
  using ((select auth.uid()) = id);

drop policy if exists "任何人可讀取聊天訊息" on public.lobby_chat;
drop policy if exists "公開只能讀取 48 小時內聊天" on public.lobby_chat;
create policy "公開只能讀取 48 小時內聊天"
  on public.lobby_chat
  for select to public
  using (is_hidden = false and created_at >= now() - interval '48 hours');

drop policy if exists "所有訪客可發送聊天訊息" on public.lobby_chat;
create policy "所有訪客可發送聊天訊息"
  on public.lobby_chat
  for insert to public
  with check (
    ((select auth.uid()) is not null and author_id = (select auth.uid()) and guest_key is null)
    or
    ((select auth.uid()) is null and author_id is null and guest_key is not null)
  );

drop policy if exists "管理員可讀取全部聊天" on public.lobby_chat;
create policy "管理員可讀取全部聊天"
  on public.lobby_chat
  for select to authenticated
  using (private.is_forum_admin((select auth.uid())));

-- Articles and article comments.
drop policy if exists articles_admin_manage on public.articles;
create policy articles_admin_manage
  on public.articles
  for all to authenticated
  using (private.is_forum_admin((select auth.uid())))
  with check (private.is_forum_admin((select auth.uid())));

drop policy if exists articles_author_manage on public.articles;
create policy articles_author_manage
  on public.articles
  for all to authenticated
  using (
    author_id = (select auth.uid())
    and private.is_verified_author((select auth.uid()))
  )
  with check (
    author_id = (select auth.uid())
    and private.is_verified_author((select auth.uid()))
  );

drop policy if exists article_comments_admin_delete on public.article_comments;
create policy article_comments_admin_delete
  on public.article_comments
  for delete to authenticated
  using (private.is_forum_admin((select auth.uid())));

drop policy if exists article_comments_author_update on public.article_comments;
create policy article_comments_author_update
  on public.article_comments
  for update to authenticated
  using (author_id = (select auth.uid()))
  with check (author_id = (select auth.uid()));

drop policy if exists article_comments_member_create on public.article_comments;
create policy article_comments_member_create
  on public.article_comments
  for insert to authenticated
  with check (author_id = (select auth.uid()));

-- Special author verification.
drop policy if exists author_verification_admin_manage on public.author_verifications;
create policy author_verification_admin_manage
  on public.author_verifications
  for all to authenticated
  using (private.is_forum_admin((select auth.uid())))
  with check (private.is_forum_admin((select auth.uid())));

drop policy if exists author_verification_self_read on public.author_verifications;
create policy author_verification_self_read
  on public.author_verifications
  for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists author_verification_self_create on public.author_verifications;
create policy author_verification_self_create
  on public.author_verifications
  for insert to authenticated
  with check (user_id = (select auth.uid()) and status = 'pending');

drop policy if exists author_verification_self_update on public.author_verifications;
create policy author_verification_self_update
  on public.author_verifications
  for update to authenticated
  using (user_id = (select auth.uid()) and status = 'rejected')
  with check (user_id = (select auth.uid()) and status = 'pending');

-- Forum posts and comments.
drop policy if exists forum_posts_admin_delete on public.forum_posts;
create policy forum_posts_admin_delete
  on public.forum_posts
  for delete to authenticated
  using (private.is_forum_admin((select auth.uid())));

drop policy if exists forum_posts_admin_moderate on public.forum_posts;
create policy forum_posts_admin_moderate
  on public.forum_posts
  for update to authenticated
  using (private.is_forum_admin((select auth.uid())))
  with check (private.is_forum_admin((select auth.uid())));

drop policy if exists forum_posts_author_update on public.forum_posts;
create policy forum_posts_author_update
  on public.forum_posts
  for update to authenticated
  using (author_id = (select auth.uid()))
  with check (author_id = (select auth.uid()));

drop policy if exists forum_posts_member_create on public.forum_posts;
create policy forum_posts_member_create
  on public.forum_posts
  for insert to authenticated
  with check (author_id = (select auth.uid()));

drop policy if exists forum_comments_admin_delete on public.forum_comments;
create policy forum_comments_admin_delete
  on public.forum_comments
  for delete to authenticated
  using (private.is_forum_admin((select auth.uid())));

drop policy if exists forum_comments_admin_moderate on public.forum_comments;
create policy forum_comments_admin_moderate
  on public.forum_comments
  for update to authenticated
  using (private.is_forum_admin((select auth.uid())))
  with check (private.is_forum_admin((select auth.uid())));

drop policy if exists forum_comments_author_update on public.forum_comments;
create policy forum_comments_author_update
  on public.forum_comments
  for update to authenticated
  using (author_id = (select auth.uid()))
  with check (author_id = (select auth.uid()));

drop policy if exists forum_comments_member_create on public.forum_comments;
create policy forum_comments_member_create
  on public.forum_comments
  for insert to authenticated
  with check (author_id = (select auth.uid()));

-- Media, notifications and quiz results.
drop policy if exists media_admin_manage on public.media_assets;
create policy media_admin_manage
  on public.media_assets
  for all to authenticated
  using (private.is_forum_admin((select auth.uid())))
  with check (private.is_forum_admin((select auth.uid())));

drop policy if exists media_owner_insert on public.media_assets;
create policy media_owner_insert
  on public.media_assets
  for insert to authenticated
  with check (owner_id = (select auth.uid()));

drop policy if exists media_owner_update on public.media_assets;
create policy media_owner_update
  on public.media_assets
  for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

drop policy if exists "Users can view own notifications" on public.notifications;
create policy "Users can view own notifications"
  on public.notifications
  for select to public
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can update own notifications" on public.notifications;
create policy "Users can update own notifications"
  on public.notifications
  for update to public
  using ((select auth.uid()) = user_id);

drop policy if exists "使用者可讀寫自己的測驗結果" on public.quiz_results;
create policy "使用者可讀寫自己的測驗結果"
  on public.quiz_results
  for all to public
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Reports and moderation audit.
drop policy if exists reports_authenticated_create on public.reports;
create policy reports_authenticated_create
  on public.reports
  for insert to authenticated
  with check (reporter_id = (select auth.uid()));

drop policy if exists reports_admin_read on public.reports;
create policy reports_admin_read
  on public.reports
  for select to authenticated
  using (private.is_forum_admin((select auth.uid())));

drop policy if exists reports_admin_update on public.reports;
create policy reports_admin_update
  on public.reports
  for update to authenticated
  using (private.is_forum_admin((select auth.uid())))
  with check (private.is_forum_admin((select auth.uid())));

drop policy if exists report_events_admin_only on public.report_events;
create policy report_events_admin_only
  on public.report_events
  for all to authenticated
  using (private.is_forum_admin((select auth.uid())))
  with check (
    admin_id = (select auth.uid())
    and private.is_forum_admin((select auth.uid()))
  );

drop policy if exists "Administrators can read report auto actions" on public.report_auto_actions;
create policy "Administrators can read report auto actions"
  on public.report_auto_actions
  for select to authenticated
  using (private.is_forum_admin((select auth.uid())));

-- Community video lifecycle.
drop policy if exists "Video upload owners can read own rows" on public.video_uploads;
create policy "Video upload owners can read own rows"
  on public.video_uploads
  for select to authenticated
  using (owner_id = (select auth.uid()));

drop policy if exists "Video upload owners can create own rows" on public.video_uploads;
create policy "Video upload owners can create own rows"
  on public.video_uploads
  for insert to authenticated
  with check (owner_id = (select auth.uid()));

drop policy if exists "Video upload owners can update own rows" on public.video_uploads;
create policy "Video upload owners can update own rows"
  on public.video_uploads
  for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

drop policy if exists "Administrators can manage video upload rows" on public.video_uploads;
create policy "Administrators can manage video upload rows"
  on public.video_uploads
  for all to authenticated
  using (private.is_forum_admin((select auth.uid())))
  with check (private.is_forum_admin((select auth.uid())));

-- Legacy discussions and application permissions.
drop policy if exists "已登入用戶可提交申請" on public.article_permissions;
create policy "已登入用戶可提交申請"
  on public.article_permissions
  for insert to public
  with check ((select auth.uid()) is not null);

drop policy if exists "用戶可查看自己的申請" on public.article_permissions;
create policy "用戶可查看自己的申請"
  on public.article_permissions
  for select to public
  using ((select auth.uid()) = user_id);

drop policy if exists "用戶可管理自己的按讚收藏" on public.discussion_bookmarks;
create policy "用戶可管理自己的按讚收藏"
  on public.discussion_bookmarks
  for all to public
  using ((select auth.uid()) = user_id);

drop policy if exists "已登入用戶可提交檢舉" on public.discussion_reports;
create policy "已登入用戶可提交檢舉"
  on public.discussion_reports
  for insert to public
  with check ((select auth.uid()) is not null);

drop policy if exists "已登入用戶可發布討論" on public.discussions;
create policy "已登入用戶可發布討論"
  on public.discussions
  for insert to public
  with check ((select auth.uid()) is not null);

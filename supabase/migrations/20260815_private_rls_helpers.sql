-- KinkFlow: keep SECURITY DEFINER authorization helpers out of the Data API.
--
-- The helpers are used by RLS policies, not by browser code. Supabase's Data API
-- should not expose them as /rpc endpoints. Keep the functions in a non-exposed
-- schema, grant only the role needed to evaluate authenticated RLS policies, and
-- revoke the legacy public-schema functions.

begin;

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create or replace function private.is_forum_admin(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.admin_roles ar
    where ar.user_id = uid
      and ar.role_level <= 2
  );
$$;

create or replace function private.is_verified_author(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.author_verifications av
    where av.user_id = uid
      and av.status = 'approved'
  );
$$;

revoke all on function private.is_forum_admin(uuid) from public, anon, authenticated;
revoke all on function private.is_verified_author(uuid) from public, anon, authenticated;
grant execute on function private.is_forum_admin(uuid) to authenticated;
grant execute on function private.is_verified_author(uuid) to authenticated;

-- RLS policies must call the private, schema-qualified helpers.
alter policy articles_author_manage on public.articles
  using (author_id = auth.uid() and private.is_verified_author(auth.uid()))
  with check (author_id = auth.uid() and private.is_verified_author(auth.uid()));
alter policy articles_admin_manage on public.articles
  using (private.is_forum_admin(auth.uid()))
  with check (private.is_forum_admin(auth.uid()));
alter policy categories_admin_manage on public.forum_categories
  using (private.is_forum_admin(auth.uid()))
  with check (private.is_forum_admin(auth.uid()));
alter policy forum_posts_admin_delete on public.forum_posts
  using (private.is_forum_admin(auth.uid()));
alter policy forum_comments_admin_delete on public.forum_comments
  using (private.is_forum_admin(auth.uid()));
alter policy forum_post_media_admin_manage on public.forum_post_media
  using (private.is_forum_admin(auth.uid()))
  with check (private.is_forum_admin(auth.uid()));
alter policy media_admin_manage on public.media_assets
  using (private.is_forum_admin(auth.uid()))
  with check (private.is_forum_admin(auth.uid()));
alter policy reports_admin_read on public.reports
  using (private.is_forum_admin(auth.uid()));
alter policy reports_admin_update on public.reports
  using (private.is_forum_admin(auth.uid()))
  with check (private.is_forum_admin(auth.uid()));
alter policy author_verification_admin_manage on public.author_verifications
  using (private.is_forum_admin(auth.uid()))
  with check (private.is_forum_admin(auth.uid()));
alter policy moderation_admin_only on public.moderation_actions
  using (private.is_forum_admin(auth.uid()))
  with check (admin_id = auth.uid() and private.is_forum_admin(auth.uid()));
alter policy article_node_links_author_manage on public.article_node_links
  using (
    exists (
      select 1
      from public.articles a
      where a.id = article_id
        and a.author_id = auth.uid()
        and private.is_verified_author(auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.articles a
      where a.id = article_id
        and a.author_id = auth.uid()
        and private.is_verified_author(auth.uid())
    )
  );
alter policy article_node_links_admin_manage on public.article_node_links
  using (private.is_forum_admin(auth.uid()))
  with check (private.is_forum_admin(auth.uid()));
alter policy forum_topics_admin_delete on public.forum_topics
  using (private.is_forum_admin(auth.uid()));
alter policy topic_node_links_admin_manage on public.topic_node_links
  using (private.is_forum_admin(auth.uid()))
  with check (private.is_forum_admin(auth.uid()));
alter policy article_comments_admin_delete on public.article_comments
  using (private.is_forum_admin(auth.uid()));
alter policy mindmap_nodes_admin_manage on public.mindmap_nodes
  using (private.is_forum_admin(auth.uid()))
  with check (private.is_forum_admin(auth.uid()));

-- No browser/API code calls these legacy public helpers directly. Once every
-- production RLS policy points to private.*, remove their public RPC surface.
revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.is_forum_admin(uuid) from public, anon, authenticated;
revoke all on function public.is_verified_author(uuid) from public, anon, authenticated;

drop function if exists public.is_forum_admin(uuid);
drop function if exists public.is_verified_author(uuid);

commit;

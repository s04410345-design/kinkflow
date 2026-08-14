-- KinkFlow security hardening
-- Apply this migration in a Supabase branch first, then production after verification.

begin;

-- Do not expose raw visitor behavior logs to anonymous users.
drop policy if exists "任何人可讀取彙總統計" on public.visitor_logs;
create policy "Admins can read visitor logs"
  on public.visitor_logs
  for select
  to authenticated
  using (exists (
    select 1 from public.admin_roles
    where admin_roles.user_id = (select auth.uid())
      and admin_roles.role_level <= 2
  ));

-- Notifications should be emitted by trusted server-side code only.
drop policy if exists "Anyone can insert notifications" on public.notifications;

-- Only administrators may mutate CMS content.
drop policy if exists "Allow auth users to modify quiz_content" on public.quiz_content;
create policy "Admins can manage quiz_content"
  on public.quiz_content
  for all
  to authenticated
  using (exists (
    select 1 from public.admin_roles
    where admin_roles.user_id = (select auth.uid())
      and admin_roles.role_level <= 2
  ))
  with check (exists (
    select 1 from public.admin_roles
    where admin_roles.user_id = (select auth.uid())
      and admin_roles.role_level <= 2
  ));

-- SECURITY DEFINER functions must not be callable as public RPC endpoints.
revoke execute on function public.handle_new_user() from anon, authenticated;
alter function public.handle_new_user() set search_path = public, pg_temp;

commit;

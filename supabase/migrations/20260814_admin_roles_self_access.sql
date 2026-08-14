-- Allow a signed-in user to read only their own admin role.
-- The previous policy queried admin_roles from its own USING clause,
-- which can recurse and make the frontend see an empty result.

begin;

drop policy if exists "管理員可讀取角色資料" on public.admin_roles;
drop policy if exists "Users can read own admin role" on public.admin_roles;
create policy "Users can read own admin role"
  on public.admin_roles
  for select
  to authenticated
  using (user_id = (select auth.uid()));

commit;

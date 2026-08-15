-- 降低管理員稽核查詢的 foreign-key 與 RLS init-plan 警告。
create index if not exists admin_audit_logs_admin_idx
  on public.admin_audit_logs (admin_id, created_at desc);

drop policy if exists "管理員可讀取日誌" on public.admin_audit_logs;
create policy "管理員可讀取日誌"
on public.admin_audit_logs
for select
to authenticated
using (
  (select exists (
    select 1
    from public.admin_roles
    where admin_roles.user_id = (select auth.uid())
  ))
);

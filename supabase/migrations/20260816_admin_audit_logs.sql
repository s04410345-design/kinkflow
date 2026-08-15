-- 管理員操作稽核紀錄；只保存操作與目標識別，不保存留言全文或敏感內容。
create table if not exists public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references auth.users(id) on delete restrict,
  action text not null,
  target_id text,
  target_type text,
  detail_json jsonb,
  created_at timestamptz not null default now()
);

alter table public.admin_audit_logs enable row level security;

create index if not exists admin_audit_logs_created_idx
  on public.admin_audit_logs (created_at desc);

create index if not exists admin_audit_logs_target_idx
  on public.admin_audit_logs (target_type, target_id, created_at desc);

-- service role 由 server route 寫入；管理員前端只讀取自己的管理範圍。
drop policy if exists "管理員可讀取日誌" on public.admin_audit_logs;
create policy "管理員可讀取日誌"
on public.admin_audit_logs
for select
to authenticated
using (
  exists (
    select 1
    from public.admin_roles
    where admin_roles.user_id = auth.uid()
  )
);

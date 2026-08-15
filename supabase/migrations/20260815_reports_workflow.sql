-- KinkFlow report workflow hardening.
-- Preview-first: prepare and review this migration before production apply.

alter table public.reports
  add column if not exists category text not null default 'other',
  add column if not exists details text not null default '',
  add column if not exists resolved_action text,
  add column if not exists admin_note text not null default '',
  add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'reports_category_check'
      and conrelid = 'public.reports'::regclass
  ) then
    alter table public.reports
      add constraint reports_category_check
      check (category in ('spam', 'harassment', 'safety', 'privacy', 'illegal', 'hate', 'self_harm', 'misinformation', 'other'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'reports_details_length_check'
      and conrelid = 'public.reports'::regclass
  ) then
    alter table public.reports
      add constraint reports_details_length_check
      check (char_length(details) between 0 and 2000);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'reports_admin_note_length_check'
      and conrelid = 'public.reports'::regclass
  ) then
    alter table public.reports
      add constraint reports_admin_note_length_check
      check (char_length(admin_note) between 0 and 2000);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'reports_resolved_action_check'
      and conrelid = 'public.reports'::regclass
  ) then
    alter table public.reports
      add constraint reports_resolved_action_check
      check (resolved_action is null or resolved_action in ('none', 'warn', 'hide_content', 'delete_content', 'restore_content'));
  end if;
end $$;

create table if not exists public.report_events (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.reports(id) on delete cascade,
  admin_id uuid not null references auth.users(id) on delete restrict,
  from_status text not null check (from_status in ('open', 'reviewing', 'resolved', 'dismissed')),
  to_status text not null check (to_status in ('open', 'reviewing', 'resolved', 'dismissed')),
  action_type text not null check (action_type in ('start_review', 'resolve', 'dismiss', 'reopen')),
  resolved_action text check (resolved_action is null or resolved_action in ('none', 'warn', 'hide_content', 'delete_content', 'restore_content')),
  admin_note text not null default '' check (char_length(admin_note) between 0 and 2000),
  created_at timestamptz not null default now()
);

create index if not exists reports_target_status_idx
  on public.reports (target_type, target_id, status, created_at desc);
create index if not exists report_events_report_created_idx
  on public.report_events (report_id, created_at desc);
create unique index if not exists reports_active_reporter_target_idx
  on public.reports (reporter_id, target_type, target_id)
  where reporter_id is not null and status in ('open', 'reviewing');

alter table public.report_events enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'forum_posts' and policyname = 'forum_posts_admin_moderate') then
    create policy forum_posts_admin_moderate on public.forum_posts
    for update to authenticated
    using (is_forum_admin(auth.uid()))
    with check (is_forum_admin(auth.uid()));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'forum_comments' and policyname = 'forum_comments_admin_moderate') then
    create policy forum_comments_admin_moderate on public.forum_comments
    for update to authenticated
    using (is_forum_admin(auth.uid()))
    with check (is_forum_admin(auth.uid()));
  end if;
end $$;

create policy report_events_admin_only on public.report_events
for all to authenticated
using (is_forum_admin(auth.uid()))
with check (admin_id = auth.uid() and is_forum_admin(auth.uid()));

comment on table public.report_events is 'Admin-only audit trail for report status and moderation decisions.';
comment on column public.reports.category is 'Structured report reason category selected by the reporter.';
comment on column public.reports.details is 'Optional reporter context, limited to 2,000 characters.';
comment on column public.reports.resolved_action is 'Moderation action selected when the report is resolved or dismissed.';
comment on column public.reports.admin_note is 'Admin-only processing note, limited to 2,000 characters.';
comment on column public.reports.updated_at is 'Last report workflow update timestamp.';

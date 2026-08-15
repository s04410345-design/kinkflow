-- KinkFlow P1 content hardening.
-- Apply to production only after explicit user confirmation.

-- Enforce length limits at the database boundary without blocking existing rows.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'forum_posts_title_length_check') then
    alter table public.forum_posts add constraint forum_posts_title_length_check
      check (char_length(btrim(title)) between 1 and 180) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'forum_posts_body_length_check') then
    alter table public.forum_posts add constraint forum_posts_body_length_check
      check (char_length(btrim(body_text)) between 1 and 10000) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'forum_comments_body_length_check') then
    alter table public.forum_comments add constraint forum_comments_body_length_check
      check (char_length(btrim(body_text)) between 1 and 2000) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'author_verifications_application_length_check') then
    alter table public.author_verifications add constraint author_verifications_application_length_check
      check (char_length(btrim(application_text)) between 30 and 5000) not valid;
  end if;
end;
$$;

-- Let a rejected applicant submit a fresh application, but never edit the review fields.
create or replace function private.protect_author_verification_reapply()
returns trigger
language plpgsql
security definer
set search_path = public, private
as $$
begin
  if private.is_forum_admin(auth.uid()) then
    return new;
  end if;

  if old.user_id <> auth.uid() or old.status <> 'rejected' or new.status <> 'pending' then
    raise exception 'Only a rejected applicant can resubmit an author application';
  end if;

  new.user_id := old.user_id;
  new.reviewed_by := null;
  new.reviewed_at := null;
  new.review_note := null;
  new.created_at := old.created_at;
  return new;
end;
$$;

drop trigger if exists protect_author_verification_reapply_trigger on public.author_verifications;
create trigger protect_author_verification_reapply_trigger
before update on public.author_verifications
for each row execute function private.protect_author_verification_reapply();

drop policy if exists "author_verification_self_update" on public.author_verifications;
create policy "author_verification_self_update"
on public.author_verifications
for update
to authenticated
using (user_id = auth.uid() and status = 'rejected')
with check (user_id = auth.uid() and status = 'pending');

create index if not exists reports_target_idx
  on public.reports (target_type, target_id, status);

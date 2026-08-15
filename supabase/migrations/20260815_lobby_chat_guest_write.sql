-- KinkFlow P1: allow public lobby chat with a per-device guest key.
-- Apply to production only after explicit user confirmation.

alter table public.lobby_chat
  add column if not exists guest_key text;

alter table public.lobby_chat
  drop constraint if exists lobby_chat_guest_key_length_check;

alter table public.lobby_chat
  add constraint lobby_chat_guest_key_length_check
  check (guest_key is null or char_length(guest_key) between 16 and 128);

create or replace function public.enforce_lobby_chat_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  recent_count integer;
begin
  if char_length(btrim(new.text)) < 1 or char_length(new.text) > 240 then
    raise exception 'Lobby message must be between 1 and 240 characters';
  end if;

  if new.author_id is null and (new.guest_key is null or char_length(new.guest_key) < 16) then
    raise exception 'Guest key is required for anonymous lobby messages';
  end if;

  if new.author_id is not null then
    select count(*)::integer into recent_count
    from public.lobby_chat
    where author_id = new.author_id
      and is_hidden = false
      and created_at > now() - interval '1 minute';
  else
    select count(*)::integer into recent_count
    from public.lobby_chat
    where guest_key = new.guest_key
      and is_hidden = false
      and created_at > now() - interval '1 minute';
  end if;

  if recent_count >= 10 then
    raise exception 'Lobby rate limit exceeded';
  end if;

  return new;
end;
$$;

revoke all on function public.enforce_lobby_chat_rate_limit() from public;
grant execute on function public.enforce_lobby_chat_rate_limit() to anon, authenticated;

drop policy if exists "已登入用戶可發送訊息" on public.lobby_chat;
drop policy if exists "所有訪客可發送聊天訊息" on public.lobby_chat;

create policy "所有訪客可發送聊天訊息"
on public.lobby_chat
for insert
to public
with check (
  (auth.uid() is not null and author_id = auth.uid() and guest_key is null)
  or
  (auth.uid() is null and author_id is null and guest_key is not null)
);

create index if not exists lobby_chat_guest_created_idx
  on public.lobby_chat (guest_key, created_at desc);

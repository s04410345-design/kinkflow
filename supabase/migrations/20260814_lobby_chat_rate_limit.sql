-- Add-only hardening for the existing public.lobby_chat table.
-- Guests remain readable and writable according to the existing policy; authenticated
-- authors are limited to 10 messages per minute at the database boundary.

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

  if new.author_id is not null then
    select count(*)::integer into recent_count
    from public.lobby_chat
    where author_id = new.author_id
      and is_hidden = false
      and created_at > now() - interval '1 minute';

    if recent_count >= 10 then
      raise exception 'Lobby rate limit exceeded';
    end if;
  end if;

  return new;
end;
$$;

revoke all on function public.enforce_lobby_chat_rate_limit() from public;
grant execute on function public.enforce_lobby_chat_rate_limit() to anon, authenticated;

do $$
begin
  if not exists (
    select 1 from pg_trigger
    where tgname = 'lobby_chat_rate_limit_trigger'
      and tgrelid = 'public.lobby_chat'::regclass
  ) then
    create trigger lobby_chat_rate_limit_trigger
      before insert on public.lobby_chat
      for each row execute function public.enforce_lobby_chat_rate_limit();
  end if;
end;
$$;

create index if not exists lobby_chat_author_created_idx
  on public.lobby_chat (author_id, created_at desc);

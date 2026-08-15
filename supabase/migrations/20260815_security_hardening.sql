-- KinkFlow security hardening.
-- Preview-first: review and apply this migration only after the Vercel Preview
-- and the Supabase migration checklist have passed.

-- The rate-limit function is a SECURITY DEFINER trigger function. Direct
-- execution is not part of the public client contract; the trigger invokes it
-- as the function owner during INSERT.
revoke execute on function public.enforce_lobby_chat_rate_limit() from public;
revoke execute on function public.enforce_lobby_chat_rate_limit() from anon, authenticated;
alter function public.enforce_lobby_chat_rate_limit()
  set search_path = public;

-- This policy is fully covered by the existing public SELECT policy whose
-- condition is true. Removing only the redundant policy preserves current
-- read behavior while eliminating the duplicate permissive policy warning.
drop policy if exists "使用者可讀取自己的資料" on public.user_profiles;

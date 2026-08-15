-- KinkFlow security follow-up hardening.
-- Applied to production as security_hardening_acl_policy_followup on 2026-08-15.
-- The original 20260814_security_hardening migration already exists in production;
-- this follow-up closes the remaining function ACL and duplicate policy findings.

begin;

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

commit;

begin;

-- private bucket 需要透過 server-side signed URL 發放影片讀取權限。
-- 不直接 revoke storage.objects 全表權限，避免影響其他 bucket。
create table if not exists public.article_media_assets (
  article_id uuid not null references public.articles(id) on delete cascade,
  media_asset_id uuid not null references public.media_assets(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (article_id, media_asset_id)
);

create index if not exists article_media_assets_media_idx
  on public.article_media_assets (media_asset_id, article_id);

create unique index if not exists article_media_assets_one_article_per_media_idx
  on public.article_media_assets (media_asset_id);

alter table public.article_media_assets enable row level security;
revoke all on table public.article_media_assets from anon, authenticated;

-- 目前文章資料的影片若沒有 article_media_assets 關聯，private 化後無法安全判斷
-- 哪一篇文章可以取得影片。遇到遺留資料時中止 migration，避免靜默把影片弄壞。
do $$
declare
  unbound_video_count bigint;
begin
  select count(*)
    into unbound_video_count
    from public.media_assets ma
   where ma.media_type = 'video'
     and exists (
       select 1
         from public.articles a
        where a.body_json::text like '%' || ma.storage_path || '%'
     )
     and not exists (
       select 1
         from public.article_media_assets ama
        where ama.media_asset_id = ma.id
     );

  if unbound_video_count > 0 then
    raise exception 'Cannot make article-videos private: % existing video asset(s) are not bound to an article', unbound_video_count;
  end if;
end;
$$;

update storage.buckets
   set public = false
 where id = 'article-videos';

drop policy if exists "Public can read article video objects" on storage.objects;

comment on table public.article_media_assets is 'Explicit article-to-video ownership mapping used before issuing private Storage signed URLs.';
commit;

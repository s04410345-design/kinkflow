select plan(6);

set local role postgres;
select set_config('search_path', 'public, private, extensions, pg_catalog', true);

select is(
  (select public from storage.buckets where id = 'article-videos'),
  false,
  'article-videos bucket is private'
);

select is(
  (select file_size_limit::bigint from storage.buckets where id = 'article-videos'),
  52428800::bigint,
  'article-videos keeps the 50 MB limit'
);

select is(
  (select allowed_mime_types[1] from storage.buckets where id = 'article-videos'),
  'video/mp4'::text,
  'article-videos keeps the video/mp4 restriction'
);

select ok(
  not exists (
    select 1
      from pg_policies
     where schemaname = 'storage'
       and tablename = 'objects'
       and policyname = 'Public can read article video objects'
  ),
  'article-videos has no public read policy'
);

select is(
  has_table_privilege('anon', 'public.article_media_assets', 'select'),
  false,
  'anonymous role cannot read article-media bindings directly'
);

select is(
  has_table_privilege('authenticated', 'public.article_media_assets', 'select'),
  false,
  'authenticated role cannot read article-media bindings directly'
);

select * from finish();

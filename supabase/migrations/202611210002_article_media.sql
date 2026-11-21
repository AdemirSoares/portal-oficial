insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('article-media', 'article-media', false, 8388608,
  array['image/jpeg', 'image/png', 'image/webp']);

-- Each image belongs to one story. Only attached images can become public.
create table public.article_media (
  article_id uuid not null references public.articles on delete cascade,
  object_path text primary key,
  kind text not null check (kind in ('cover', 'inline')),
  alt_text text not null check (char_length(btrim(alt_text)) between 1 and 300),
  caption text,
  check (object_path ~ ('^' || article_id::text || '/[0-9a-f-]{36}\.(jpg|jpeg|png|webp)$'))
);

create index article_media_article_idx on public.article_media (article_id);
create unique index article_media_cover_idx on public.article_media (article_id) where kind = 'cover';

create function cms_private.can_edit_article_media(article uuid)
returns boolean language sql stable set search_path = ''
as $$
  select exists (
    select 1 from public.articles a
    where a.id = article and (
      (select cms_private.has_cms_permission('publish'))
      or (not a.featured and a.status in ('draft', 'in_review') and (select cms_private.has_cms_permission('editor')))
      or (not a.featured and a.status = 'draft' and a.owner_id = (select auth.uid())
        and (select cms_private.has_cms_permission('staff')))
    )
  )
$$;
revoke all on function cms_private.can_edit_article_media(uuid) from public;
grant execute on function cms_private.can_edit_article_media(uuid) to authenticated;

alter table public.article_media enable row level security;
revoke all on public.article_media from public, anon, authenticated;
grant select on public.article_media to anon, authenticated;
grant insert, delete on public.article_media to authenticated;
grant update (alt_text, caption) on public.article_media to authenticated;

create policy media_public on public.article_media for select to anon, authenticated
using (exists (select 1 from public.published_articles a where a.id = article_id));
create policy media_staff on public.article_media for select to authenticated
using (exists (select 1 from public.articles a where a.id = article_id
  and ((select cms_private.has_cms_permission('editor'))
    or (a.owner_id = (select auth.uid()) and (select cms_private.has_cms_permission('staff'))))));
create policy media_attach on public.article_media for insert to authenticated
with check (cms_private.can_edit_article_media(article_id)
  and exists (select 1 from storage.objects o where o.bucket_id = 'article-media' and o.name = object_path));
create policy media_edit on public.article_media for update to authenticated
using (cms_private.can_edit_article_media(article_id))
with check (cms_private.can_edit_article_media(article_id));
create policy media_detach on public.article_media for delete to authenticated
using (cms_private.can_edit_article_media(article_id));

-- Keep the visibility lookup out of the policy rewrite: attaching an image
-- also reads storage.objects, which would otherwise recurse into article_media.
create function cms_private.is_public_article_image(path text)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.article_media m join public.published_articles a on a.id = m.article_id
    where m.object_path = path
  )
$$;
revoke all on function cms_private.is_public_article_image(text) from public;
grant execute on function cms_private.is_public_article_image(text) to anon, authenticated;

create policy media_download_public on storage.objects for select to anon, authenticated
using (bucket_id = 'article-media' and cms_private.is_public_article_image(name));

create policy media_download_staff on storage.objects for select to authenticated
using (bucket_id = 'article-media' and (
  (select cms_private.has_cms_permission('editor'))
  or exists (select 1 from public.articles a
    where a.id::text = split_part(name, '/', 1) and a.owner_id = (select auth.uid())
      and (select cms_private.has_cms_permission('staff')))
));

create policy media_upload on storage.objects for insert to authenticated
with check (
  bucket_id = 'article-media'
  and case when name ~ '^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}/[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}\.(jpg|jpeg|png|webp)$'
    then cms_private.can_edit_article_media(split_part(name, '/', 1)::uuid)
    else false end
);

create policy media_delete_object on storage.objects for delete to authenticated
using (bucket_id = 'article-media' and (select cms_private.has_cms_permission('admin'))
  and not exists (select 1 from public.article_media m where m.object_path = name));

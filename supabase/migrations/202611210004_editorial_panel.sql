create function public.cms_dashboard()
returns jsonb language sql stable security invoker set search_path = ''
as $$
  select jsonb_build_object(
    'published', count(*) filter (where a.visible_at <= now()),
    'draft', count(*) filter (where a.status = 'draft'),
    'review', count(*) filter (where a.status = 'in_review'),
    'scheduled', count(*) filter (where a.status = 'scheduled' and a.visible_at > now()),
    'today', count(*) filter (where a.visible_at <= now()
      and (a.visible_at at time zone 'America/Sao_Paulo')::date = (now() at time zone 'America/Sao_Paulo')::date),
    'categories', coalesce((
      select jsonb_agg(category order by category.name)
      from (
        select c.id, c.name, count(n.id) as total
        from public.categories c left join public.articles n on n.category_id = c.id
        group by c.id, c.name
      ) category
    ), '[]'::jsonb),
    'latest', coalesce((
      select jsonb_agg(latest order by latest.created_at desc, latest.id)
      from (
        select id, title, slug, status, visible_at, created_at
        from public.articles order by created_at desc, id limit 6
      ) latest
    ), '[]'::jsonb)
  )
  from public.articles a
  where (select cms_private.has_cms_permission('staff'));
$$;

-- Update the story and publish its image references in the same transaction.
-- RLS still checks every operation, including the old and new article status.
create function public.cms_save_article(
  article_id uuid,
  expected_updated_at timestamptz,
  article_data jsonb,
  images jsonb
)
returns public.articles language plpgsql security invoker set search_path = ''
as $$
declare
  changes public.articles := jsonb_populate_record(null::public.articles, article_data);
  saved public.articles;
begin
  -- Lock and check the revision before touching references. Attach while draft
  -- permissions still apply, then update the status as the final operation.
  perform 1 from public.articles a
  where a.id = cms_save_article.article_id and a.updated_at = expected_updated_at
  for update;
  if not found then
    raise exception using errcode = '40001', message = 'Article unavailable or changed';
  end if;

  delete from public.article_media m
  where m.article_id = cms_save_article.article_id;

  insert into public.article_media (article_id, object_path, kind, alt_text, caption)
  select cms_save_article.article_id, i.object_path, i.kind, i.alt_text, i.caption
  from jsonb_to_recordset(images) i(object_path text, kind text, alt_text text, caption text);

  update public.articles a set
    title = changes.title, subtitle = changes.subtitle, slug = changes.slug,
    summary = changes.summary, content = changes.content, category_id = changes.category_id,
    author_name = changes.author_name, cover_external_url = changes.cover_external_url,
    cover_alt = changes.cover_alt, featured = changes.featured, seo_title = changes.seo_title,
    seo_description = changes.seo_description, status = changes.status,
    published_at = case when changes.status = 'published' then
      case when a.visible_at <= now() then a.visible_at else now() end end,
    scheduled_at = changes.scheduled_at
  where a.id = cms_save_article.article_id
  returning a.* into saved;

  if not found then
    raise exception using errcode = '42501', message = 'Article update not authorized';
  end if;
  return saved;
end;
$$;

revoke all on function public.cms_dashboard() from public, anon, authenticated;
revoke all on function public.cms_save_article(uuid, timestamptz, jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.cms_dashboard() to authenticated;
grant execute on function public.cms_save_article(uuid, timestamptz, jsonb, jsonb) to authenticated;

create index articles_created_idx on public.articles (created_at desc, id);

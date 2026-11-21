-- The projection is also used by the sitemap and by article lookups.
create view public.public_article_cards with (security_invoker = true) as
select a.id, a.slug, a.title, a.subtitle, a.summary, a.category_id,
  c.name as category_name, c.slug as category_slug,
  a.cover_external_url, coalesce(m.alt_text, a.cover_alt) as cover_alt,
  m.object_path as cover_path, a.featured, a.published_at, a.updated_at
from public.published_articles a
left join public.categories c on c.id = a.category_id and c.active
left join public.article_media m on m.article_id = a.id and m.kind = 'cover';

revoke all on public.public_article_cards from public, anon, authenticated;
grant select on public.public_article_cards to anon, authenticated;

create function public.cms_public_articles(
  category uuid default null,
  terms text default null,
  featured_only boolean default false,
  start_at integer default 0,
  page_size integer default 12
)
returns setof public.public_article_cards
language sql stable security invoker set search_path = ''
as $$
  select card.*
  from public.public_article_cards card
  where (category is null or (card.category_id = category and card.category_slug is not null))
    and (not featured_only or card.featured)
    and (
      nullif(btrim(terms), '') is null
      or to_tsvector('portuguese'::regconfig, card.title || ' ' || coalesce(card.summary, ''))
        @@ websearch_to_tsquery('portuguese'::regconfig, left(terms, 120))
      or to_tsvector('portuguese'::regconfig, coalesce(card.category_name, ''))
        @@ websearch_to_tsquery('portuguese'::regconfig, left(terms, 120))
    )
  order by card.published_at desc, card.id
  offset greatest(start_at, 0)
  limit least(greatest(page_size, 1), 51)
$$;

revoke all on function public.cms_public_articles(uuid, text, boolean, integer, integer) from public, anon, authenticated;
grant execute on function public.cms_public_articles(uuid, text, boolean, integer, integer) to anon, authenticated;

create function public.cms_public_article(article_slug text)
returns jsonb language sql stable security invoker set search_path = ''
as $$
  select to_jsonb(card) || jsonb_build_object(
    'content', article.content,
    'author_name', article.author_name,
    'seo_title', article.seo_title,
    'seo_description', article.seo_description,
    'images', coalesce((
      select jsonb_agg(jsonb_build_object(
        'object_path', media.object_path, 'kind', media.kind,
        'alt_text', media.alt_text, 'caption', media.caption
      ))
      from public.article_media media where media.article_id = card.id
    ), '[]'::jsonb)
  )
  from public.published_articles article
  join public.public_article_cards card on card.id = article.id
  where article.slug = article_slug
$$;

revoke all on function public.cms_public_article(text) from public, anon, authenticated;
grant execute on function public.cms_public_article(text) to anon, authenticated;

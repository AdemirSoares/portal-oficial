create schema cms_private;
revoke all on schema cms_private from public;
grant usage on schema cms_private to authenticated;

create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  role text not null check (role in ('admin', 'editor', 'journalist')),
  can_publish boolean not null default false,
  check (not can_publish or role = 'editor')
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 120),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  active boolean not null default true,
  show_in_menu boolean not null default true,
  menu_order integer not null default 0 check (menu_order >= 0)
);

create table public.articles (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(btrim(title)) between 1 and 240),
  subtitle text,
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  summary text,
  content jsonb not null default '{"type":"doc","content":[]}',
  category_id uuid not null references public.categories on delete restrict,
  owner_id uuid default auth.uid() references auth.users on delete set null,
  author_name text not null check (char_length(btrim(author_name)) between 1 and 120),
  cover_external_url text check (cover_external_url ~ '^https://[^[:space:]]+$'),
  cover_alt text,
  featured boolean not null default false,
  seo_title text,
  seo_description text,
  status text not null default 'draft'
    check (status in ('draft', 'in_review', 'published', 'scheduled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz,
  scheduled_at timestamptz,
  visible_at timestamptz generated always as (coalesce(scheduled_at, published_at)) stored,
  check (jsonb_typeof(content) = 'object'
    and content ->> 'type' is not distinct from 'doc'
    and jsonb_typeof(content -> 'content') is not distinct from 'array'),
  check (
    (status in ('draft', 'in_review') and published_at is null and scheduled_at is null)
    or (status = 'published' and published_at is not null and scheduled_at is null)
    or (status = 'scheduled' and scheduled_at is not null and published_at is null)
  )
);

create index articles_live_idx on public.articles (visible_at desc, id)
  where status in ('published', 'scheduled');
create index articles_category_live_idx on public.articles (category_id, visible_at desc, id)
  where status in ('published', 'scheduled');
create index articles_featured_idx on public.articles (visible_at desc, id)
  where featured and status in ('published', 'scheduled');
create index articles_owner_idx on public.articles (owner_id);
create index articles_search_idx on public.articles using gin (
  to_tsvector('portuguese'::regconfig, title || ' ' || coalesce(summary, ''))
);

create function cms_private.set_updated_at()
returns trigger language plpgsql set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
revoke all on function cms_private.set_updated_at() from public;

create trigger articles_updated_at before update on public.articles
for each row execute function cms_private.set_updated_at();

create function cms_private.has_cms_permission(permission text)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and case permission
      when 'admin' then role = 'admin'
      when 'editor' then role in ('admin', 'editor')
      when 'publish' then role = 'admin' or (role = 'editor' and can_publish)
      when 'staff' then true
      else false
    end
  )
$$;
revoke all on function cms_private.has_cms_permission(text) from public;
grant execute on function cms_private.has_cms_permission(text) to authenticated;

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.articles enable row level security;
revoke all on public.profiles, public.categories, public.articles from public, anon, authenticated;

grant select, insert, delete on public.profiles to authenticated;
grant update (role, can_publish) on public.profiles to authenticated;
grant select on public.categories, public.articles to anon, authenticated;
grant insert on public.categories to authenticated;
grant update (name, slug, active, show_in_menu, menu_order) on public.categories to authenticated;
grant insert (title, subtitle, slug, summary, content, category_id, author_name,
  cover_external_url, cover_alt, featured, seo_title, seo_description, status,
  published_at, scheduled_at) on public.articles to authenticated;
grant update (title, subtitle, slug, summary, content, category_id, author_name,
  cover_external_url, cover_alt, featured, seo_title, seo_description, status,
  published_at, scheduled_at) on public.articles to authenticated;
grant delete on public.articles to authenticated;

create policy profiles_read on public.profiles
for select to authenticated using (id = (select auth.uid()) or (select cms_private.has_cms_permission('admin')));
create policy profiles_create on public.profiles
for insert to authenticated with check ((select cms_private.has_cms_permission('admin')));
create policy profiles_change on public.profiles
for update to authenticated
using (id <> (select auth.uid()) and (select cms_private.has_cms_permission('admin')))
with check ((select cms_private.has_cms_permission('admin')));
create policy profiles_remove on public.profiles
for delete to authenticated
using (id <> (select auth.uid()) and (select cms_private.has_cms_permission('admin')));

create policy categories_public on public.categories for select to anon, authenticated using (active);
create policy categories_staff on public.categories for select to authenticated
using ((select cms_private.has_cms_permission('staff')));
create policy categories_create on public.categories for insert to authenticated
with check ((select cms_private.has_cms_permission('admin')));
create policy categories_change on public.categories for update to authenticated
using ((select cms_private.has_cms_permission('admin')))
with check ((select cms_private.has_cms_permission('admin')));

create policy articles_public on public.articles for select to anon, authenticated
using (status in ('published', 'scheduled') and visible_at <= now());
create policy articles_staff on public.articles for select to authenticated
using ((select cms_private.has_cms_permission('editor'))
  or (owner_id = (select auth.uid()) and (select cms_private.has_cms_permission('staff'))));
create policy articles_create on public.articles for insert to authenticated
with check (owner_id = (select auth.uid()) and (select cms_private.has_cms_permission('staff'))
  and (status in ('draft', 'in_review') or (select cms_private.has_cms_permission('publish')))
  and (not featured or (select cms_private.has_cms_permission('publish'))));
create policy articles_change on public.articles for update to authenticated
using (
  (select cms_private.has_cms_permission('publish'))
  or (not featured and status in ('draft', 'in_review') and (select cms_private.has_cms_permission('editor')))
  or (not featured and status = 'draft' and owner_id = (select auth.uid())
    and (select cms_private.has_cms_permission('staff')))
)
with check (
  (select cms_private.has_cms_permission('publish'))
  or (not featured and status in ('draft', 'in_review')
    and ((select cms_private.has_cms_permission('editor'))
      or (owner_id = (select auth.uid()) and (select cms_private.has_cms_permission('staff')))))
);
create policy articles_remove on public.articles for delete to authenticated
using ((select cms_private.has_cms_permission('admin')));

-- Public queries should use this view even when the visitor has a staff session.
create view public.published_articles with (security_invoker = true) as
select id, title, subtitle, slug, summary, content, category_id, author_name,
  cover_external_url, cover_alt, featured, seo_title, seo_description,
  updated_at, visible_at as published_at
from public.articles
where status in ('published', 'scheduled') and visible_at <= now();

revoke all on public.published_articles from public, anon, authenticated;
grant select on public.published_articles to anon, authenticated;

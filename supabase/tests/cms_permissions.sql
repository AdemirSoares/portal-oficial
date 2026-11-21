-- Run against a disposable database with all CMS migrations applied.
begin;

insert into auth.users (id, email) values
  ('11111111-1111-4111-8111-111111111111', 'journalist@example.test'),
  ('22222222-2222-4222-8222-222222222222', 'editor@example.test'),
  ('33333333-3333-4333-8333-333333333333', 'publisher@example.test'),
  ('44444444-4444-4444-8444-444444444444', 'administrator@example.test'),
  ('55555555-5555-4555-8555-555555555555', 'unassigned@example.test');

insert into public.profiles (id, role, can_publish) values
  ('11111111-1111-4111-8111-111111111111', 'journalist', false),
  ('22222222-2222-4222-8222-222222222222', 'editor', false),
  ('33333333-3333-4333-8333-333333333333', 'editor', true),
  ('44444444-4444-4444-8444-444444444444', 'admin', false);

set local role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', true);

insert into public.articles (title, slug, category_id, author_name)
select 'Rascunho', 'cms-teste-rascunho', id, 'Teste' from public.categories where slug = 'brasil';

insert into storage.objects (bucket_id, name)
select 'article-media', id || '/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa.webp'
from public.articles where slug = 'cms-teste-rascunho';

insert into public.article_media (article_id, object_path, kind, alt_text)
select id, id || '/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa.webp', 'cover', 'Imagem de teste'
from public.articles where slug = 'cms-teste-rascunho';

do $$
declare
  article public.articles;
  images jsonb;
begin
  select * into strict article from public.articles where slug = 'cms-teste-rascunho';
  select jsonb_agg(to_jsonb(m)) into images from public.article_media m where m.article_id = article.id;
  perform public.cms_save_article(article.id, article.updated_at, to_jsonb(article) || '{"summary":"Rascunho salvo pelo painel"}', images);
  if not exists (select 1 from public.articles where id = article.id and summary = 'Rascunho salvo pelo painel') then
    raise exception 'O painel não salvou o rascunho';
  end if;
  begin
    perform public.cms_save_article(article.id, article.updated_at - interval '1 hour', to_jsonb(article), images);
    raise exception 'O painel sobrescreveu uma edição desatualizada';
  exception when serialization_failure then null;
  end;
  begin
    perform public.cms_save_article(article.id, article.updated_at, to_jsonb(article) || '{"status":"published"}', '[]');
    raise exception 'O painel permitiu publicação de jornalista';
  exception when insufficient_privilege then null;
  end;
  if not exists (select 1 from public.article_media m where m.article_id = article.id) then
    raise exception 'O salvamento rejeitado removeu referências de imagem';
  end if;
  begin
    update public.articles set status = 'published', published_at = now()
    where slug = 'cms-teste-rascunho';
    raise exception 'Jornalista publicou uma notícia';
  exception when insufficient_privilege then null;
  end;
  update public.profiles set role = 'admin' where id = auth.uid();
  if found then raise exception 'Jornalista alterou o próprio perfil'; end if;
  if exists (select 1 from public.cms_staff_accounts()) then
    raise exception 'Jornalista teve acesso a e-mails da equipe';
  end if;
  begin
    perform public.cms_assign_staff('unassigned@example.test', 'admin', false);
    raise exception 'Jornalista concedeu acesso administrativo';
  exception when insufficient_privilege then null;
  end;
end;
$$;

update public.articles set status = 'in_review' where slug = 'cms-teste-rascunho';

do $$
begin
  update public.articles set title = 'Alteração após revisão' where slug = 'cms-teste-rascunho';
  if found then raise exception 'Jornalista alterou uma notícia em revisão'; end if;
end;
$$;

select set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222222', true);
do $$
begin
  update public.articles set title = 'Notícia revisada' where slug = 'cms-teste-rascunho';
  if not found then raise exception 'Editor não conseguiu revisar a notícia'; end if;
  begin
    update public.articles set status = 'published', published_at = now()
    where slug = 'cms-teste-rascunho';
    raise exception 'Editor publicou sem autorização';
  exception when insufficient_privilege then null;
  end;
end;
$$;

select set_config('request.jwt.claim.sub', '33333333-3333-4333-8333-333333333333', true);
update public.articles set status = 'scheduled', scheduled_at = now() + interval '1 hour'
where slug = 'cms-teste-rascunho';

do $$
begin
  if exists (select 1 from public.published_articles where slug = 'cms-teste-rascunho') then
    raise exception 'A consulta pública vazou notícia agendada para uma sessão editorial';
  end if;
end;
$$;

set local role anon;
do $$
begin
  begin
    perform owner_id from public.articles;
    raise exception 'Visitante acessou a tabela editorial';
  exception when insufficient_privilege then null;
  end;
  if exists (select 1 from storage.objects where bucket_id = 'article-media')
    or exists (select 1 from public.article_media)
    or public.cms_public_article('cms-teste-rascunho') is not null
    or exists (select 1 from public.cms_public_articles() where slug = 'cms-teste-rascunho') then
    raise exception 'Agendamento futuro ou imagem visível sem autenticação';
  end if;
end;
$$;

set local role authenticated;
update public.articles set scheduled_at = now() - interval '1 second' where slug = 'cms-teste-rascunho';
set local role anon;
do $$
begin
  if not exists (select 1 from public.published_articles where slug = 'cms-teste-rascunho')
    or not exists (select 1 from storage.objects where bucket_id = 'article-media') then
    raise exception 'Notícia e imagem não ficaram disponíveis após o agendamento';
  end if;
  if public.cms_public_article('cms-teste-rascunho') ->> 'cover_path' is null
    or not exists (
      select 1 from public.cms_public_articles(terms => 'revisada')
      where slug = 'cms-teste-rascunho'
    ) then
    raise exception 'Detalhe, imagem principal ou busca pública indisponível após o agendamento';
  end if;
  if (select count(*) from public.cms_public_articles(start_at => 0, page_size => 1)) <> 1
    or (select id from public.cms_public_articles(start_at => 0, page_size => 1))
      = (select id from public.cms_public_articles(start_at => 1, page_size => 1)) then
    raise exception 'A paginação pública não avançou';
  end if;
end;
$$;

set local role authenticated;
update public.articles set status = 'draft', scheduled_at = null where slug = 'cms-teste-rascunho';
delete from public.articles where slug = 'cms-teste-rascunho';
select set_config('request.jwt.claim.sub', '44444444-4444-4444-8444-444444444444', true);
do $$
declare
  article public.articles;
  images jsonb;
  saved public.articles;
begin
  select * into strict article from public.articles where slug = 'cms-teste-rascunho';
  if public.cms_assign_staff('UNASSIGNED@example.test', 'editor', true)
    <> '55555555-5555-4555-8555-555555555555'::uuid then
    raise exception 'Administrador não conseguiu provisionar o perfil';
  end if;
  if not exists (select 1 from public.cms_staff_accounts()
    where email = 'unassigned@example.test' and role = 'editor' and can_publish) then
    raise exception 'Perfil concedido não aparece na equipe';
  end if;
  begin
    perform public.cms_assign_staff('administrator@example.test', 'editor', true);
    raise exception 'Administrador alterou o próprio perfil';
  exception when insufficient_privilege then null;
  end;
  delete from public.profiles where id = '55555555-5555-4555-8555-555555555555';
  if not found then raise exception 'Administrador não conseguiu revogar o acesso editorial'; end if;
  select jsonb_agg(to_jsonb(m)) into images from public.article_media m where m.article_id = article.id;
  saved := public.cms_save_article(article.id, article.updated_at, to_jsonb(article) || '{"status":"published"}', images);
  if saved.published_at is null or (public.cms_dashboard() ->> 'today')::int < 1 then
    raise exception 'Publicação imediata ou indicador do dia falhou';
  end if;
  update public.categories set active = false where slug = 'brasil';
  if not found then raise exception 'Administrador não conseguiu editar categoria'; end if;
  if not exists (select 1 from public.cms_public_articles()
    where slug = 'cms-teste-rascunho' and category_slug is null)
    or exists (select 1 from public.cms_public_articles(category => article.category_id)) then
    raise exception 'Desativar uma editoria deve ocultar sua listagem e manter as matérias publicadas';
  end if;
  delete from public.articles where slug = 'cms-teste-rascunho';
  if not found then raise exception 'Administrador não conseguiu excluir a notícia'; end if;
  if exists (select 1 from public.article_media where article_id = article.id) then
    raise exception 'A exclusão deixou referências de mídia';
  end if;
  -- Delete actual objects through the Storage API in the browser integration test.
end;
$$;

select set_config('request.jwt.claim.sub', '55555555-5555-4555-8555-555555555555', true);
do $$
begin
  if exists (select 1 from public.articles) then raise exception 'Conta sem perfil leu a tabela editorial'; end if;
  if not exists (select 1 from public.cms_public_articles()) then
    raise exception 'Conta sem perfil perdeu acesso à listagem pública';
  end if;
end;
$$;

rollback;

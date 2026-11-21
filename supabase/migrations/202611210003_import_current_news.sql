-- Initial import of the existing portal. The original cards have no full article text.
insert into public.categories (name, slug, show_in_menu, menu_order) values
  ('Brasil', 'brasil', true, 1),
  ('DF', 'df', true, 2),
  ('GO', 'go', true, 3),
  ('SP', 'sp', true, 4),
  ('MG', 'mg', true, 5),
  ('Mundo', 'mundo', true, 6),
  ('Entretenimento', 'entretenimento', true, 7),
  ('Vida & Estilo', 'vida-e-estilo', true, 8),
  ('Saúde', 'sau-de', true, 9),
  ('Esportes', 'esportes', true, 10),
  ('Economia', 'economia', false, 11),
  ('Tecnologia', 'tecnologia', false, 12);

insert into public.articles (title, slug, category_id, author_name, summary,
  cover_external_url, cover_alt, featured, status, published_at)
select item.title, item.slug, c.id, 'Portal Oficial', item.summary,
  item.image, item.alt, item.featured, 'published', now() - item.display_order * interval '1 second'
from (values
  ('brasil', 'Prefeituras anunciam plano para modernizar serviços públicos', 'prefeituras-anunciam-plano-para-modernizar-servic-os-pu-blicos', 'Gestores apresentam iniciativas que prometem mais eficiência, transparência e rapidez no atendimento à população.', 'https://images.unsplash.com/photo-1521295121783-8a321d551ad2?auto=format&fit=crop&w=1400&q=88', 'Cidades e mobilidade urbana', true, 0),
  ('brasil', 'Governo anuncia novo pacote de medidas para cidades e estados', 'governo-anuncia-novo-pacote-de-medidas-para-cidades-e-estados', null, 'https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?auto=format&fit=crop&w=900&q=85', null, false, 1),
  ('economia', 'Mercado reage à divulgação dos novos indicadores econômicos', 'mercado-reage-a-divulgac-a-o-dos-novos-indicadores-econo-micos', null, 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=900&q=85', null, false, 2),
  ('esportes', 'Clubes se preparam para decisões decisivas no campeonato', 'clubes-se-preparam-para-deciso-es-decisivas-no-campeonato', null, 'https://images.unsplash.com/photo-1522778119026-d647f0596c20?auto=format&fit=crop&w=900&q=85', null, false, 3),
  ('tecnologia', 'Nova geração de soluções digitais transforma o atendimento', 'nova-gerac-a-o-de-soluc-o-es-digitais-transforma-o-atendimento', null, 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=900&q=85', null, false, 4)
) as item(category_slug, title, slug, summary, image, alt, featured, display_order)
join public.categories c on c.slug = item.category_slug;

import { demo } from './demo.js';

export const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const imagePathPattern = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}\/[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}\.(?:jpg|jpeg|png|webp)$/;
export const latest = { slug: 'ultimas-noticias', name: 'Últimas notícias' };

function textForSearch(value) {
  return value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLocaleLowerCase('pt-BR');
}

export function publicSource(url, key) {
  url = url?.trim();
  key = key?.trim();
  const useDemo = !url && !key;
  const configured = Boolean(url && key?.startsWith('sb_publishable_'));
  const base = url?.replace(/\/$/, '');
  const headers = { apikey: key };

  async function rest(resource, params, options) {
    if (!configured) throw new Error('Public news configuration incomplete');
    const query = new URLSearchParams(params);
    const response = await fetch(`${base}/rest/v1/${resource}?${query}`, {
      ...options,
      headers: { ...headers, ...options?.headers },
      cache: 'no-store',
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) throw new Error('Public news request failed');
    return response.json();
  }

  async function categories() {
    if (useDemo) return demo.categories;
    return rest('categories', {
      select: 'id,name,slug,show_in_menu', active: 'eq.true', order: 'menu_order,name,id',
    });
  }

  async function list({ category, terms, featured = false, offset = 0, limit = 12 } = {}) {
    if (useDemo) {
      const normalized = textForSearch(terms ?? '');
      return demo.articles.filter((article) => (
        (!category || article.category_id === category)
        && (!featured || article.featured)
        && textForSearch(`${article.title} ${article.category_name} ${article.summary ?? ''}`).includes(normalized)
      )).slice(offset, offset + limit);
    }

    return rest('rpc/cms_public_articles', {}, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        category: category ?? null, terms: terms ?? null, featured_only: featured, start_at: offset, page_size: limit,
      }),
    });
  }

  async function article(slug) {
    if (!slugPattern.test(slug) || slug.length > 240) return null;
    if (useDemo) {
      const item = demo.articles.find((entry) => entry.slug === slug);
      return item ? { ...item, images: [] } : null;
    }

    return rest('rpc/cms_public_article', { article_slug: slug });
  }

  async function media(path) {
    if (useDemo || !imagePathPattern.test(path)) return null;
    // Confirm live visibility via the Data API on every request before contacting Storage.
    const [attachment] = await rest('article_media', {
      select: 'object_path', object_path: `eq.${path}`, limit: '1',
    });
    if (!attachment) return null;
    const response = await fetch(`${base}/storage/v1/object/authenticated/article-media/${path}`, {
      headers: { ...headers, Authorization: `Bearer ${key}` },
      cache: 'no-store',
      signal: AbortSignal.timeout(8000),
    });
    if ([400, 404].includes(response.status)) return null;
    if (!response.ok) throw new Error('Public image request failed');
    return response;
  }

  async function sitemapArticles(offset, limit) {
    if (useDemo) return demo.articles.slice(offset, offset + limit);
    return rest('public_article_cards', { select: 'slug,updated_at', order: 'id', limit, offset });
  }

  return { categories, list, article, media, sitemapArticles };
}

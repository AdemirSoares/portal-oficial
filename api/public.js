import { readFile } from 'node:fs/promises';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';
import { imagePathPattern, latest, publicSource } from '../src/public/data.js';
import { articleMarkup, articleMetadata, articlePath, categoryPath, escapeHtml, jsonForHtml, metaMarkup } from '../src/public/markup.js';

const routes = new Set(['article', 'media', 'sitemap', 'robots']);
const defaultOrigin = 'https://portaloficial.vercel.app';
const imageTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);

export function publicRoute(requestUrl, rewrite = {}) {
  const url = new URL(requestUrl, 'http://localhost');
  const pathname = url.pathname.replace(/\/$/, '');
  if (pathname.startsWith('/noticia/')) return { route: 'article', slug: pathname.slice('/noticia/'.length) };
  if (pathname.startsWith('/midia/')) return { route: 'media', path: pathname.slice('/midia/'.length) };
  if (pathname === '/sitemap.xml') return { route: 'sitemap' };
  if (pathname === '/robots.txt') return { route: 'robots' };

  const route = rewrite.route ?? url.searchParams.get('route');
  if (pathname === '/api/public' && routes.has(route)) {
    return { route, slug: rewrite.slug ?? url.searchParams.get('slug'), path: rewrite.path ?? url.searchParams.get('path') };
  }
  return null;
}

function send(req, res, status, type, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', type);
  res.end(req.method === 'HEAD' ? undefined : body);
}

async function articleDocument(template, story, origin, missing = false) {
  const metadata = story && articleMetadata(story, origin);
  const title = metadata ? `${metadata.title} | Portal Oficial`
    : `${missing ? 'Página não encontrada' : 'Notícia temporariamente indisponível'} | Portal Oficial`;
  const body = story ? articleMarkup(story)
    : `<h1>${escapeHtml(title.split(' | ')[0])}</h1><p><a href="/">Página inicial</a></p>`;
  return (await template())
    .replace(/<title>[\s\S]*?<\/title>/i, () => `<title>${escapeHtml(title)}</title>`)
    .replace('</head>', () => `${metadata ? metaMarkup(metadata) : '<meta name="robots" content="noindex">'}\n</head>`)
    .replace('<div id="app"></div>', () => `<div id="app"><main>${body}</main></div>${story
      ? `<script id="public-story-data" type="application/json">${jsonForHtml(story)}</script>` : ''}`);
}

async function sitemap(source, origin) {
  const categories = await source.categories();
  const entries = [
    { path: '/' },
    { path: categoryPath(latest.slug) },
    ...categories.filter((item) => item.slug !== latest.slug).map((item) => ({ path: categoryPath(item.slug) })),
  ];
  const batch = 1000;
  for (let offset = 0; entries.length < 50000; offset += batch) {
    const articles = await source.sitemapArticles(offset, batch);
    entries.push(...articles.map((item) => ({ path: articlePath(item.slug), updated: item.updated_at })));
    if (articles.length < batch) break;
  }
  return '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'
    + entries.slice(0, 50000).map(({ path, updated }) => `<url><loc>${escapeHtml(new URL(path, origin).href)}</loc>${updated
      ? `<lastmod>${escapeHtml(updated)}</lastmod>` : ''}</url>`).join('\n')
    + '</urlset>';
}

export function publicHandler(env, template, localOrigin = defaultOrigin) {
  const source = publicSource(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_PUBLISHABLE_KEY);
  const origin = new URL(env.VITE_SITE_URL || localOrigin).origin;
  return async function handle(req, res, request) {
    const { route, slug, path } = request;
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.setHeader('Allow', 'GET, HEAD');
      return send(req, res, 405, 'text/plain; charset=utf-8', 'Método não permitido');
    }
    try {
      if (route === 'article') {
        const story = await source.article(typeof slug === 'string' ? slug : '');
        const html = await articleDocument(template, story, origin, !story);
        return send(req, res, story ? 200 : 404, 'text/html; charset=utf-8', html);
      }
      if (route === 'sitemap') {
        return send(req, res, 200, 'application/xml; charset=utf-8', await sitemap(source, origin));
      }
      if (route === 'robots') {
        const body = `User-agent: *\nDisallow: /admin\nDisallow: /busca\nSitemap: ${origin}/sitemap.xml\n`;
        return send(req, res, 200, 'text/plain; charset=utf-8', body);
      }
      const image = typeof path === 'string' && imagePathPattern.test(path) ? await source.media(path) : null;
      const type = image?.headers.get('Content-Type')?.split(';')[0];
      if (!image || !imageTypes.has(type)) {
        await image?.body?.cancel();
        return send(req, res, 404, 'text/plain; charset=utf-8', 'Imagem não encontrada');
      }
      res.statusCode = 200;
      res.setHeader('Content-Type', type);
      if (req.method === 'HEAD') {
        await image.body.cancel();
        return res.end();
      }
      return await pipeline(Readable.fromWeb(image.body), res);
    } catch {
      if (res.headersSent || res.destroyed) return;
      if (route === 'article') {
        try {
          return send(req, res, 503, 'text/html; charset=utf-8', await articleDocument(template, null, origin));
        } catch {
          return send(req, res, 503, 'text/plain; charset=utf-8', 'Notícia temporariamente indisponível');
        }
      }
      return send(req, res, 503, 'text/plain; charset=utf-8', 'Serviço temporariamente indisponível');
    }
  };
}

export default function handler(req, res) {
  const route = publicRoute(req.url, req.query);
  if (!route) return send(req, res, 404, 'text/plain; charset=utf-8', 'Página não encontrada');
  return publicHandler(process.env, () => readFile('dist/index.html', 'utf8'))(req, res, route);
}

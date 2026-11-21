import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createServer } from 'node:http';
import { test } from 'node:test';
import { publicHandler, publicRoute } from '../api/public.js';

async function serve(t, handle) {
  const server = createServer(handle);
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise((resolve) => server.close(resolve)));
  return `http://127.0.0.1:${server.address().port}`;
}

const key = 'sb_publishable_fixture';
const path = '22222222-2222-4222-8222-222222222222/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa.png';
const story = {
  slug: 'noticia-de-teste',
  title: 'Notícia de teste',
  summary: 'Resumo de teste',
  author_name: 'Portal Oficial',
  seo_title: 'Título para compartilhar',
  cover_path: path,
  content: {
    type: 'doc',
    content: [{
      type: 'paragraph',
      content: [{
        type: 'text',
        text: 'Texto <script>indesejado</script>',
        marks: [{ type: 'link', attrs: { href: 'javascript:void(0)' } }],
      }],
    }],
  },
};

test('entrega matéria, metadados e mídia pública e respeita despublicação e falhas', async (t) => {
  let published = true;
  let available = true;
  let mediaDownloads = 0;
  const backend = await serve(t, (req, res) => {
    assert.equal(req.headers.apikey, key);
    if (!available) {
      res.writeHead(503).end();
      return;
    }

    const request = new URL(req.url, 'http://localhost');
    if (request.pathname.includes('/storage/')) {
      mediaDownloads++;
      res.writeHead(200, { 'Content-Type': 'image/png' }).end(Buffer.from([137, 80, 78, 71]));
      return;
    }
    let value;
    switch (request.pathname.split('/').at(-1)) {
      case 'cms_public_article':
        value = published && request.searchParams.get('article_slug') === story.slug ? story : null;
        break;
      case 'public_article_cards':
        value = published ? [story] : [];
        break;
      case 'article_media':
        value = published ? [{ object_path: path }] : [];
        break;
      default:
        value = [];
    }
    res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify(value));
  });

  const template = async () => '<html><head><title>Portal Oficial</title></head><body><div id="app"></div></body></html>';
  const handle = publicHandler({ VITE_SUPABASE_URL: backend, VITE_SUPABASE_PUBLISHABLE_KEY: key }, template);
  const portal = await serve(t, (req, res) => handle(req, res, publicRoute(req.url)));
  const article = await fetch(`${portal}/noticia/${story.slug}`);
  assert.equal(article.status, 200);
  assert.equal(article.headers.get('Cache-Control'), 'no-store');
  const html = await article.text();
  assert.match(html, /<h1>Notícia de teste<\/h1>/);
  assert.match(html, /property="og:title" content="Título para compartilhar"/);
  assert.match(html, /"@type":"NewsArticle"/);
  assert.match(html, /&lt;script&gt;indesejado&lt;\/script&gt;/);
  assert.doesNotMatch(html, /href="javascript:/);
  assert.match(await (await fetch(`${portal}/sitemap.xml`)).text(), /\/noticia\/noticia-de-teste/);
  assert.match(await (await fetch(`${portal}/robots.txt`)).text(), /Disallow: \/admin/);
  const image = await fetch(`${portal}/midia/${path}`);
  assert.equal(image.status, 200);
  assert.equal(image.headers.get('Content-Type'), 'image/png');
  assert.equal((await image.arrayBuffer()).byteLength, 4);
  assert.equal(mediaDownloads, 1);

  published = false;
  assert.equal((await fetch(`${portal}/noticia/${story.slug}`)).status, 404);
  assert.equal((await fetch(`${portal}/midia/${path}`)).status, 404);
  assert.equal(mediaDownloads, 1);
  assert.doesNotMatch(await (await fetch(`${portal}/sitemap.xml`)).text(), /noticia-de-teste/);
  available = false;
  assert.equal((await fetch(`${portal}/noticia/${story.slug}`)).status, 503);
  assert.equal((await fetch(`${portal}/sitemap.xml`)).status, 503);
});

test('rotas externas e reescritas chegam ao mesmo manipulador', () => {
  assert.deepEqual(publicRoute('/noticia/noticia-de-teste'), { route: 'article', slug: 'noticia-de-teste' });
  assert.deepEqual(publicRoute('/api/public?route=article&slug=noticia-de-teste'), {
    route: 'article', slug: 'noticia-de-teste', path: null,
  });
  assert.equal(publicRoute('/admin'), null);
});

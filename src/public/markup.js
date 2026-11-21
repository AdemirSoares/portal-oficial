import { imagePathPattern, latest, slugPattern } from './data.js';

const entities = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => entities[char]);
}

export function safeHttps(value) {
  try {
    const url = new URL(value);
    if (url.protocol === 'https:') return url.href;
  } catch {
    return null;
  }
  return null;
}

function safeLink(value) {
  try {
    const url = new URL(value);
    if (url.protocol === 'http:' || url.protocol === 'https:') return url.href;
  } catch {
    return null;
  }
  return null;
}

export const articlePath = (slug) => `/noticia/${encodeURIComponent(slug)}`;
export const categoryPath = (slug) => slug === latest.slug ? '/ultimas-noticias' : `/editoria/${encodeURIComponent(slug)}`;
export const mediaPath = (path) => imagePathPattern.test(path) ? `/midia/${path}` : '';
export const coverUrl = (item) => mediaPath(item.cover_path) || safeHttps(item.cover_external_url);

export function coverMarkup(item, { eager = false } = {}) {
  const url = coverUrl(item);
  return url ? `<img src="${escapeHtml(url)}" alt="${escapeHtml(item.cover_alt)}" decoding="async"${eager ? ' fetchpriority="high"' : ' loading="lazy"'}>` : '';
}

const bodyTags = new Map([
  ['paragraph', 'p'], ['bulletList', 'ul'], ['orderedList', 'ol'],
  ['listItem', 'li'], ['blockquote', 'blockquote'],
]);

function contentHtml(node, attachments, depth = 0) {
  if (!node || typeof node !== 'object' || depth > 40) return '';
  if (node.type === 'articleImage') {
    const image = attachments.get(node.attrs?.path);
    if (!image) return '';
    const url = mediaPath(image.object_path);
    if (!url) return '';
    const caption = image.caption ? `<figcaption>${escapeHtml(image.caption)}</figcaption>` : '';
    return `<figure><img src="${url}" alt="${escapeHtml(image.alt_text)}" loading="lazy" decoding="async">${caption}</figure>`;
  }
  if (node.type === 'text') {
    let text = escapeHtml(node.text);
    for (const mark of Array.isArray(node.marks) ? node.marks : []) {
      if (mark?.type === 'bold') text = `<strong>${text}</strong>`;
      if (mark?.type === 'italic') text = `<em>${text}</em>`;
      if (mark?.type === 'link') {
        const href = safeLink(mark.attrs?.href);
        if (href) text = `<a href="${escapeHtml(href)}" rel="noopener noreferrer">${text}</a>`;
      }
    }
    return text;
  }
  if (node.type === 'hardBreak') return '<br>';

  const children = Array.isArray(node.content)
    ? node.content.map((child) => contentHtml(child, attachments, depth + 1)).join('') : '';
  const tag = node.type === 'heading' ? (node.attrs?.level === 3 ? 'h3' : 'h2') : bodyTags.get(node.type);
  const start = node.type === 'orderedList' && Number.isSafeInteger(node.attrs?.start) ? ` start="${node.attrs.start}"` : '';
  return tag ? `<${tag}${start}>${children}</${tag}>` : children;
}

const dateFormat = new Intl.DateTimeFormat('pt-BR', {
  timeZone: 'America/Sao_Paulo', dateStyle: 'long', timeStyle: 'short',
});

export function articleMarkup(article) {
  const category = article.category_slug && slugPattern.test(article.category_slug)
    ? `<a href="${categoryPath(article.category_slug)}">${escapeHtml(article.category_name)}</a><span aria-hidden="true">›</span>` : '';
  const date = Date.parse(article.published_at);
  const time = Number.isFinite(date)
    ? `<time datetime="${escapeHtml(article.published_at)}">${dateFormat.format(date)} (horário de Brasília)</time>` : '';
  const attachments = new Map((article.images ?? []).filter((image) => image.kind === 'inline')
    .map((image) => [image.object_path, image]));
  const body = contentHtml(article.content, attachments);
  const subtitle = article.subtitle || article.summary;
  const cover = coverMarkup(article, { eager: true });
  return `
    <nav class="breadcrumbs" aria-label="Trilha de navegação">
      <a href="/">Página inicial</a><span aria-hidden="true">›</span>${category}<span>Notícia</span>
    </nav>
    <article class="story">
      ${article.category_name ? `<p class="eyebrow">${escapeHtml(article.category_name)}</p>` : ''}
      <h1>${escapeHtml(article.title)}</h1>
      ${subtitle ? `<p class="story-deck">${escapeHtml(subtitle)}</p>` : ''}
      <div class="story-byline"><span>${escapeHtml(article.author_name)}</span>${time}</div>
      ${cover ? `<figure class="story-cover">${cover}</figure>` : ''}
      <div class="story-body">
        ${article.subtitle && article.summary && article.summary !== article.subtitle ? `<p>${escapeHtml(article.summary)}</p>` : ''}
        ${body}
      </div>
    </article>
  `;
}

export function articleMetadata(article, origin) {
  const canonical = new URL(articlePath(article.slug), origin).href;
  const title = article.seo_title || article.title;
  const description = article.seo_description || article.summary || article.subtitle || article.title;
  const cover = coverUrl(article);
  const image = cover ? new URL(cover, origin).href : null;
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    mainEntityOfPage: canonical,
    headline: article.title,
    description,
    author: { '@type': article.author_name === 'Portal Oficial' ? 'Organization' : 'Person', name: article.author_name },
    publisher: { '@type': 'Organization', name: 'Portal Oficial', url: origin },
    ...(article.published_at && { datePublished: article.published_at }),
    ...(article.updated_at && { dateModified: article.updated_at }),
    ...(image && { image }),
  };
  return { canonical, title, description, image, schema };
}

export function jsonForHtml(value) {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}

export function metaMarkup(metadata) {
  const meta = (key, name, value) => `<meta ${key}="${name}" content="${escapeHtml(value)}" data-story-meta>`;
  return [
    `<link rel="canonical" href="${escapeHtml(metadata.canonical)}" data-story-meta>`,
    meta('name', 'description', metadata.description),
    meta('property', 'og:site_name', 'Portal Oficial'),
    meta('property', 'og:locale', 'pt_BR'),
    meta('property', 'og:type', 'article'),
    meta('property', 'og:title', metadata.title),
    meta('property', 'og:description', metadata.description),
    meta('property', 'og:url', metadata.canonical),
    metadata.image ? meta('property', 'og:image', metadata.image) : '',
    `<script type="application/ld+json" data-story-meta>${jsonForHtml(metadata.schema)}</script>`,
  ].join('\n');
}

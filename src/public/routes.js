import { latest, publicSource, slugPattern } from './data.js';
import { articleMarkup, articleMetadata, articlePath, categoryPath, coverMarkup, escapeHtml, metaMarkup } from './markup.js';
import './news.css';

const source = publicSource(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY);
const pageSize = 12;
const get = (selector) => document.querySelector(selector);

function storyLink(item) {
  return `<a class="story-link" href="${articlePath(item.slug)}">${escapeHtml(item.title)}</a>`;
}

function newsCard(item) {
  const image = coverMarkup(item);
  return `
    <article class="news-card${image ? '' : ' no-cover'}">
      ${image}
      <div class="news-card-copy">
        <span>${escapeHtml(item.category_name)}</span>
        <h3>${storyLink(item)}</h3>
      </div>
    </article>`;
}

function renderHome(items, featured) {
  const lead = featured?.id ? featured : items[0];
  const secondary = items.filter((item) => item.id !== lead?.id);
  const featuredSection = get('#featuredSection');
  featuredSection.hidden = !lead;
  if (lead) {
    const cover = coverMarkup(lead, { eager: true });
    const first = secondary[0];
    const firstImage = first && coverMarkup(first);
    featuredSection.innerHTML = `
      <article class="featured-card${cover ? '' : ' no-cover'}">
        ${cover ? `<div class="featured-image">${cover}</div>` : ''}
        <div class="featured-copy">
          <span class="eyebrow">${escapeHtml(lead.category_name)}</span>
          <h1>${storyLink(lead)}</h1>
          ${lead.summary || lead.subtitle ? `<p>${escapeHtml(lead.summary || lead.subtitle)}</p>` : ''}
        </div>
      </article>
      ${first ? `<div class="headline-list">
        <article class="${firstImage ? '' : 'no-cover'}">
          ${firstImage}
          <div><span>${escapeHtml(first.category_name)}</span><h2>${storyLink(first)}</h2></div>
        </article>
        <ul class="related-headlines">${secondary.slice(1, 3).map((item) => `<li>${storyLink(item)}</li>`).join('')}</ul>
      </div>` : ''}
    `;
  }
  get('#newsGrid').innerHTML = secondary.length
    ? secondary.slice(0, 4).map(newsCard).join('')
    : '<p class="empty-state">Nenhuma outra notícia publicada.</p>';
  get('#homePage').hidden = false;
}

function listingLink(route, page) {
  const path = route.kind === 'search' ? '/busca' : categoryPath(route.slug);
  const query = new URLSearchParams();
  if (route.terms) query.set('q', route.terms);
  if (page > 1) query.set('pagina', page);
  return query.size ? `${path}?${query}` : path;
}

function renderListing(route, category, items) {
  const title = category?.name ?? 'Resultados da busca';
  const search = route.kind === 'search';
  const shownItems = items.slice(0, pageSize);
  const lead = !search && route.page === 1 ? shownItems.shift() : null;
  const feature = get('#categoryFeature');
  feature.hidden = !lead;
  if (lead) {
    const cover = coverMarkup(lead, { eager: true });
    feature.classList.toggle('no-cover', !cover);
    feature.innerHTML = `${cover}<div class="category-feature-copy">
      <span>${escapeHtml(lead.category_name)}</span>
      <h2>${storyLink(lead)}</h2>
      ${lead.summary || lead.subtitle ? `<p>${escapeHtml(lead.summary || lead.subtitle)}</p>` : ''}
    </div>`;
  }

  get('#categoryTitle').textContent = title.toLocaleUpperCase('pt-BR');
  get('#categoryBreadcrumb').textContent = title;
  get('#categoryNewsGrid').innerHTML = shownItems.map(newsCard).join('');
  const empty = get('#categoryEmpty');
  empty.hidden = Boolean(items.length);
  empty.textContent = search ? 'Nenhuma notícia encontrada para esta busca.' : 'Nenhuma notícia publicada nesta página.';
  const pagination = get('#newsPagination');
  pagination.hidden = route.page === 1 && items.length <= pageSize;
  pagination.innerHTML = `
    ${route.page > 1 ? `<a href="${escapeHtml(listingLink(route, route.page - 1))}" rel="prev">Anterior</a>` : ''}
    <span>Página ${route.page}</span>
    ${items.length > pageSize ? `<a href="${escapeHtml(listingLink(route, route.page + 1))}" rel="next">Próxima</a>` : ''}`;
  get('#categoryPage').hidden = false;
}

function readRoute() {
  const { pathname, hash, search } = window.location;
  const path = pathname.replace(/\/$/, '');
  const query = new URLSearchParams(search);
  const rawPage = Number(query.get('pagina'));
  const page = Number.isSafeInteger(rawPage) && rawPage > 0 ? Math.min(rawPage, 100000) : 1;
  if (path === '/busca') return { kind: 'search', terms: (query.get('q') ?? '').trim().slice(0, 120), page };
  if (path === '/ultimas-noticias') return { kind: 'category', slug: latest.slug, page };
  const [, prefix, slug] = path.split('/');
  if (slug && slugPattern.test(slug) && path === `/${prefix}/${slug}`) {
    if (prefix === 'noticia') return { kind: 'article', slug };
    if (prefix === 'editoria') return { kind: 'category', slug, page };
  }
  if (!path) {
    const legacy = /^#\/?([a-z0-9-]+)\/?$/.exec(hash);
    if (legacy) return { kind: 'category', slug: legacy[1], page };
    return { kind: 'home' };
  }
  return { kind: 'missing' };
}

function readPreloadedStory() {
  const element = get('#public-story-data');
  if (!element) return null;
  try {
    return JSON.parse(element.textContent);
  } catch {
    return null;
  } finally {
    element.remove();
  }
}

export function mountPublicNews(closePanels) {
  const status = get('#publicStatus');
  const searchInput = get('#searchInput');
  let revision = 0;
  let preloaded = readPreloadedStory();

  function setStatus(text, { retry = false, home = false } = {}) {
    status.textContent = text;
    status.hidden = !text;
    if (!retry && !home) return;
    const control = document.createElement(home ? 'a' : 'button');
    if (home) {
      control.href = '/';
      control.textContent = 'Página inicial';
    } else {
      control.type = 'button';
      control.textContent = 'Tentar novamente';
      control.addEventListener('click', renderRoute);
    }
    status.append(' ', control);
  }

  function renderNavigation(categories, route) {
    const markup = [latest, ...categories.filter((category) => category.show_in_menu && category.slug !== latest.slug)]
      .filter((category) => slugPattern.test(category.slug))
      .map((category) => `<a href="${categoryPath(category.slug)}"${route.kind === 'category' && category.slug === route.slug ? ' aria-current="page"' : ''}>${escapeHtml(category.name)}</a>`)
      .join('');
    for (const nav of document.querySelectorAll('#categoryNav, #mobilePanel nav')) nav.innerHTML = markup;
  }

  function clearStoryMeta() {
    for (const meta of document.head.querySelectorAll('[data-story-meta]')) meta.remove();
  }

  function renderMissing() {
    document.title = 'Página não encontrada | Portal Oficial';
    setStatus('Página não encontrada. Esta notícia ou editoria pode ter sido removida ou ainda não estar publicada.', { home: true });
  }

  async function renderRoute() {
    const current = ++revision;
    const route = readRoute();
    const snapshot = preloaded?.slug === route.slug && route.kind === 'article' ? preloaded : null;
    preloaded = null;
    const isCurrent = () => revision === current;
    for (const id of ['#homePage', '#categoryPage', '#articlePage']) get(id).hidden = true;
    clearStoryMeta();
    searchInput.value = route.terms ?? '';
    document.title = 'Portal Oficial | Notícias';
    setStatus('Carregando notícias…');

    const categories = source.categories().then((items) => {
      if (isCurrent()) renderNavigation(items, route);
      return items;
    }).catch(() => {
      if (isCurrent() && !get('#categoryNav').children.length) renderNavigation([], route);
      return null;
    });

    try {
      if (route.kind === 'home') {
        const [items, [featured]] = await Promise.all([source.list({ limit: 6 }), source.list({ limit: 1, featured: true })]);
        if (!isCurrent()) return;
        renderHome(items, featured);
      } else if (route.kind === 'article') {
        const story = snapshot ?? await source.article(route.slug);
        if (!isCurrent()) return;
        if (!story) return renderMissing();
        const articlePage = get('#articlePage');
        articlePage.innerHTML = articleMarkup(story);
        articlePage.hidden = false;
        const metadata = articleMetadata(story, import.meta.env.VITE_SITE_URL || window.location.origin);
        document.title = `${metadata.title} | Portal Oficial`;
        document.head.insertAdjacentHTML('beforeend', metaMarkup(metadata));
      } else if (route.kind === 'search' || route.kind === 'category') {
        let category = route.slug === latest.slug ? latest : null;
        if (route.kind === 'category' && !category) {
          const items = await categories;
          if (!isCurrent()) return;
          if (!items) throw new Error('Categories unavailable');
          category = items.find((item) => item.slug === route.slug);
          if (!category) return renderMissing();
        }
        const items = route.kind === 'search' && !route.terms ? [] : await source.list({
          category: category?.id, terms: route.terms, limit: pageSize + 1, offset: (route.page - 1) * pageSize,
        });
        if (!isCurrent()) return;
        document.title = `${category?.name ?? 'Resultados da busca'} | Portal Oficial`;
        renderListing(route, category, items);
      } else {
        return renderMissing();
      }
      setStatus('');
    } catch {
      if (isCurrent()) setStatus('Não foi possível carregar as notícias. Tente novamente.', { retry: true });
    }
  }

  function navigate(url) {
    if (url.href !== window.location.href) window.history.pushState(null, '', url);
    closePanels();
    window.scrollTo(0, 0);
    renderRoute();
  }

  get('#searchForm').addEventListener('submit', (event) => {
    event.preventDefault();
    const terms = searchInput.value.trim().slice(0, 120);
    if (!terms) {
      searchInput.focus();
      return;
    }
    const url = new URL('/busca', window.location.origin);
    url.searchParams.set('q', terms);
    navigate(url);
  });
  document.addEventListener('click', (event) => {
    if (event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    const link = event.target.closest('a[href]');
    if (!link || link.target || link.hasAttribute('download')) return;
    const url = new URL(link.href);
    if (url.origin !== window.location.origin || url.pathname.startsWith('/admin')) return;
    if (!/^\/(?:$|noticia\/|editoria\/|ultimas-noticias\/?$|busca\/?$)/.test(url.pathname)) return;
    event.preventDefault();
    navigate(url);
  });
  window.addEventListener('popstate', () => {
    closePanels();
    renderRoute();
  });
  renderRoute();
}

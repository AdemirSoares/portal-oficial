import './style.css';

const categories = [
  'Últimas notícias',
  'Brasil',
  'DF',
  'GO',
  'SP',
  'MG',
  'Mundo',
  'Entretenimento',
  'Vida & Estilo',
  'Saúde',
  'Esportes',
];

const youtubeUrl = 'https://www.youtube.com/@portaloficial-n1j';
const instagramUrl = 'https://www.instagram.com/portal__oficial?avpt=OTJidXdxNDh2b2R0';
const youtubeMark = '<span class="youtube-mark" aria-hidden="true"><svg viewBox="0 0 24 24"><path fill="currentColor" d="M9 5v14l11-7z"/></svg></span>';
const instagramMark = '<span class="instagram-mark" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/></svg></span>';
const wordmark = '<span class="brand-wordmark"><span>PORTAL</span><b>OFICIAL</b></span>';

const news = [
  {
    category: 'Brasil',
    title: 'Governo anuncia novo pacote de medidas para cidades e estados',
    image: 'https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?auto=format&fit=crop&w=900&q=85',
  },
  {
    category: 'Economia',
    title: 'Mercado reage à divulgação dos novos indicadores econômicos',
    image: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=900&q=85',
  },
  {
    category: 'Esportes',
    title: 'Clubes se preparam para decisões decisivas no campeonato',
    image: 'https://images.unsplash.com/photo-1522778119026-d647f0596c20?auto=format&fit=crop&w=900&q=85',
  },
  {
    category: 'Tecnologia',
    title: 'Nova geração de soluções digitais transforma o atendimento',
    image: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=900&q=85',
  },
];

function categorySlug(category) {
  return category
    .toLowerCase()
    .replace(/&/g, ' e ')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

document.querySelector('#app').innerHTML = `
  <header class="site-header">
    <div class="header-inner">
      <div class="utility-bar">
        <button class="menu-button" id="menuButton" aria-label="Abrir menu" aria-controls="mobilePanel" aria-expanded="false">
          <span></span><span></span><span></span>
          <b>Menu</b>
        </button>
        <button class="notification-button" id="notificationButton" type="button" aria-pressed="false" aria-label="Ativar notificações">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M13.7 21h-3.4" /></svg>
          <span>Ative nossas notificações</span>
        </button>
      </div>

      <a class="brand" href="/" aria-label="Portal Oficial">
        ${wordmark}
      </a>

      <div class="header-actions">
        <a class="video-link" href="${youtubeUrl}" target="_blank" rel="noopener noreferrer" aria-label="Assistir ao canal do Portal Oficial no YouTube">
          <span>Portal Oficial</span>
          ${youtubeMark}
        </a>
        <a class="instagram-link" href="${instagramUrl}" target="_blank" rel="noopener noreferrer" aria-label="Instagram do Portal Oficial">
          <span>Instagram</span>
          ${instagramMark}
        </a>
        <button class="search-button" id="searchButton" aria-label="Buscar" aria-controls="searchPanel" aria-expanded="false">
          <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg>
          <b>Busca</b>
        </button>
      </div>

      <nav class="category-nav" id="categoryNav" aria-label="Categorias">
        ${categories.map((category) => `<a href="#/${categorySlug(category)}" data-category="${category}">${category}</a>`).join('')}
      </nav>
    </div>
  </header>
  <div class="mobile-channel">
    <a href="${youtubeUrl}" target="_blank" rel="noopener noreferrer">Acompanhe o Portal Oficial no <strong>YouTube</strong></a>
  </div>

  <main>
    <div class="home-page" id="homePage">
      <div class="ad-slot" aria-label="Espaço publicitário"></div>
      <section class="featured-section">
        <article class="featured-card">
          <div class="featured-image">
            <img src="https://images.unsplash.com/photo-1521295121783-8a321d551ad2?auto=format&fit=crop&w=1400&q=88" alt="Cidades e mobilidade urbana" />
          </div>
          <div class="featured-copy">
            <span class="eyebrow">Brasil</span>
            <h1>Prefeituras anunciam plano para modernizar serviços públicos</h1>
            <p>Gestores apresentam iniciativas que prometem mais eficiência, transparência e rapidez no atendimento à população.</p>
          </div>
        </article>

        <div class="headline-list">
          ${news.slice(0, 1).map((item) => `
            <article>
              <img src="${item.image}" alt="" />
              <div>
                <span>${item.category}</span>
                <h2>${item.title}</h2>
              </div>
            </article>
          `).join('')}
          <ul class="related-headlines">
            ${news.slice(1, 3).map((item) => `<li>${item.title}</li>`).join('')}
          </ul>
        </div>
      </section>

      <section class="latest-section" id="ultimas">
        <div class="section-heading">
          <h2>Últimas notícias</h2>
          <a href="#/${categorySlug('Últimas notícias')}" data-category="Últimas notícias">Ver tudo</a>
        </div>
        <div class="news-grid" id="newsGrid"></div>
        <p class="empty-state" id="emptyState" hidden>Nenhuma notícia encontrada para esta busca.</p>
      </section>
    </div>

    <section class="category-page" id="categoryPage" hidden>
      <div class="ad-slot" aria-label="Espaço publicitário"></div>
      <nav class="breadcrumbs" aria-label="Trilha de navegação">
        <a href="/">Página inicial</a><span>›</span><span id="categoryBreadcrumb"></span>
      </nav>
      <div class="category-layout">
        <div class="category-stories">
          <h1 class="category-banner" id="categoryTitle"></h1>
          <article class="category-feature" id="categoryFeature"></article>
          <div class="category-news-grid" id="categoryNewsGrid"></div>
          <p class="empty-state category-empty" id="categoryEmpty" hidden>Ainda não há notícias publicadas nesta editoria.</p>
        </div>
        <aside class="category-ads" aria-label="Espaços publicitários">
          <div class="ad-rectangle"></div>
          <div class="ad-rectangle"></div>
        </aside>
      </div>
    </section>
  </main>

  <div class="mobile-panel" id="mobilePanel" role="dialog" aria-modal="true" aria-label="Menu" aria-hidden="true" inert>
    <div class="panel-head">
      ${wordmark}
      <button id="closeMenu" aria-label="Fechar menu">×</button>
    </div>
    <div class="panel-socials">
      <a href="${youtubeUrl}" target="_blank" rel="noopener noreferrer">${youtubeMark} YouTube</a>
      <a href="${instagramUrl}" target="_blank" rel="noopener noreferrer">${instagramMark} Instagram</a>
    </div>
    <nav aria-label="Editorias">
      ${categories.map((category) => `<a href="#/${categorySlug(category)}" data-category="${category}">${category}</a>`).join('')}
    </nav>
  </div>
  <div class="overlay" id="overlay"></div>
  <section class="search-panel" id="searchPanel" role="dialog" aria-modal="true" aria-label="Buscar notícias" aria-hidden="true" inert>
    <div class="search-brand">${wordmark}</div>
    <form id="searchForm" role="search">
      <label for="searchInput">Buscar notícias</label>
      <div class="search-field">
        <input id="searchInput" type="search" placeholder="Digite um assunto ou palavra-chave" />
        <button type="submit">Buscar</button>
      </div>
    </form>
    <button class="search-close" id="closeSearch" aria-label="Fechar busca">×</button>
  </section>
  <div class="toast" id="toast" role="status" aria-live="polite"></div>
`;

const menuButton = document.querySelector('#menuButton');
const mobilePanel = document.querySelector('#mobilePanel');
const overlay = document.querySelector('#overlay');
const closeMenu = document.querySelector('#closeMenu');
const searchButton = document.querySelector('#searchButton');
const searchPanel = document.querySelector('#searchPanel');
const searchInput = document.querySelector('#searchInput');
const searchForm = document.querySelector('#searchForm');
const newsGrid = document.querySelector('#newsGrid');
const emptyState = document.querySelector('#emptyState');
const homePage = document.querySelector('#homePage');
const categoryPage = document.querySelector('#categoryPage');
const categoryTitle = document.querySelector('#categoryTitle');
const categoryBreadcrumb = document.querySelector('#categoryBreadcrumb');
const categoryFeature = document.querySelector('#categoryFeature');
const categoryNewsGrid = document.querySelector('#categoryNewsGrid');
const categoryEmpty = document.querySelector('#categoryEmpty');
const notificationButton = document.querySelector('#notificationButton');
const toast = document.querySelector('#toast');
let searchTerm = '';
let notificationsEnabled = false;
let toastTimeout;

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('visible');
  window.clearTimeout(toastTimeout);
  toastTimeout = window.setTimeout(() => toast.classList.remove('visible'), 4000);
}

function updateNotificationButton() {
  notificationButton.setAttribute('aria-pressed', String(notificationsEnabled));
  notificationButton.setAttribute('aria-label', notificationsEnabled ? 'Desativar notificações' : 'Ativar notificações');
  notificationButton.querySelector('span').textContent = notificationsEnabled
    ? 'Notificações ativadas'
    : 'Ative nossas notificações';
}

async function toggleNotifications() {
  if (!('Notification' in window)) {
    showToast('Este navegador não oferece suporte a notificações.');
    return;
  }

  if (notificationsEnabled) {
    notificationsEnabled = false;
    updateNotificationButton();
    showToast('Notificações desativadas neste site.');
    return;
  }

  if (Notification.permission === 'denied') {
    showToast('Notificações bloqueadas. Altere a permissão nas configurações do navegador.');
    return;
  }

  notificationButton.disabled = true;
  try {
    const permission = Notification.permission === 'granted'
      ? 'granted'
      : await Notification.requestPermission();

    if (permission !== 'granted') {
      showToast('A permissão para notificações não foi concedida.');
      return;
    }

    notificationsEnabled = true;
    updateNotificationButton();
    showToast('Permissão para notificações ativada neste navegador.');
    new Notification('Portal Oficial', { body: 'Notificações ativadas neste navegador.' });
  } catch (error) {
    showToast('Não foi possível ativar as notificações. Tente novamente.');
    console.error('Falha ao solicitar permissão para notificações:', error);
  } finally {
    notificationButton.disabled = false;
  }
}

function renderNews() {
  const visibleNews = news.filter((item) => {
    const searchableText = `${item.category} ${item.title}`.toLocaleLowerCase('pt-BR');
    return searchableText.includes(searchTerm.toLocaleLowerCase('pt-BR'));
  });

  newsGrid.innerHTML = visibleNews.map((item) => `
    <article class="news-card">
      <img src="${item.image}" alt="" />
      <div class="news-card-copy">
        <span>${item.category}</span>
        <h3>${item.title}</h3>
      </div>
    </article>
  `).join('');
  emptyState.hidden = visibleNews.length > 0;
}

function renderCategory(category) {
  const stories = category === 'Últimas notícias'
    ? news
    : news.filter((item) => item.category.toLocaleLowerCase('pt-BR') === category.toLocaleLowerCase('pt-BR'));

  categoryTitle.textContent = category.toLocaleUpperCase('pt-BR');
  categoryBreadcrumb.textContent = category;
  categoryFeature.hidden = stories.length === 0;
  categoryFeature.innerHTML = stories.length
    ? `
      <img src="${stories[0].image}" alt="" />
      <div class="category-feature-copy">
        <span>${stories[0].category}</span>
        <h2>${stories[0].title}</h2>
        <p>Leia as últimas informações e acompanhe os principais acontecimentos desta editoria.</p>
      </div>
    `
    : '';
  categoryNewsGrid.innerHTML = stories.slice(1).map((item) => `
    <article class="news-card">
      <img src="${item.image}" alt="" />
      <div class="news-card-copy">
        <span>${item.category}</span>
        <h3>${item.title}</h3>
      </div>
    </article>
  `).join('');
  categoryEmpty.hidden = stories.length > 0;
}

function renderRoute() {
  const slug = window.location.hash.replace(/^#\/?/, '').split('/')[0];
  const category = categories.find((item) => categorySlug(item) === slug);

  homePage.hidden = Boolean(category);
  categoryPage.hidden = !category;
  if (category) {
    renderCategory(category);
    document.title = `${category} | Portal Oficial`;
  } else {
    document.title = 'Portal Oficial | Notícias';
  }
}

function openCategory(category) {
  const nextHash = `#/${categorySlug(category)}`;
  if (window.location.hash !== nextHash) {
    window.history.pushState({ category }, '', nextHash);
  }
  searchTerm = '';
  searchInput.value = '';
  renderRoute();
  renderNews();
  closePanels();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

const panels = [
  { element: mobilePanel, trigger: menuButton, initialFocus: closeMenu },
  { element: searchPanel, trigger: searchButton, initialFocus: searchInput },
];
const pageContent = document.querySelectorAll('.site-header, .mobile-channel, main');
let activePanel = null;

function showPanel(nextPanel = null) {
  const previousPanel = activePanel;
  if (previousPanel === nextPanel) return;

  activePanel = nextPanel;
  pageContent.forEach((element) => { element.inert = Boolean(nextPanel); });
  overlay.classList.toggle('open', Boolean(nextPanel));
  document.body.classList.toggle('panel-open', Boolean(nextPanel));

  if (nextPanel) {
    nextPanel.element.inert = false;
    nextPanel.element.removeAttribute('aria-hidden');
    nextPanel.element.classList.add('open');
    nextPanel.trigger.setAttribute('aria-expanded', 'true');
    nextPanel.initialFocus.focus({ preventScroll: true });
  } else {
    previousPanel.trigger.focus({ preventScroll: true });
  }

  if (previousPanel) {
    previousPanel.element.inert = true;
    previousPanel.element.setAttribute('aria-hidden', 'true');
    previousPanel.element.classList.remove('open');
    previousPanel.trigger.setAttribute('aria-expanded', 'false');
  }
}

function closePanels() {
  showPanel();
}

panels.forEach((panel) => panel.trigger.addEventListener('click', () => showPanel(panel)));
notificationButton.addEventListener('click', toggleNotifications);
closeMenu.addEventListener('click', closePanels);
overlay.addEventListener('click', closePanels);
document.querySelector('#closeSearch').addEventListener('click', closePanels);
searchForm.addEventListener('submit', (event) => {
  event.preventDefault();
  searchTerm = searchInput.value.trim();
  homePage.hidden = false;
  categoryPage.hidden = true;
  window.history.pushState(null, '', `${window.location.pathname}${window.location.search}`);
  document.title = 'Resultados da busca | Portal Oficial';
  renderNews();
  closePanels();
  document.querySelector('#ultimas').scrollIntoView({ behavior: 'smooth' });
});
searchInput.addEventListener('input', () => {
  searchTerm = searchInput.value.trim();
  if (!homePage.hidden) renderNews();
});
document.querySelectorAll('[data-category]').forEach((link) => {
  link.addEventListener('click', (event) => {
    event.preventDefault();
    openCategory(link.dataset.category);
  });
});

window.addEventListener('popstate', renderRoute);
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') closePanels();
});

renderNews();
renderRoute();

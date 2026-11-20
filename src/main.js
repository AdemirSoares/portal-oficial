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
        <button class="menu-button" id="menuButton" aria-label="Abrir menu">
          <span></span><span></span><span></span>
          <b>Menu</b>
        </button>
        <button class="notification-button" id="notificationButton" type="button" aria-pressed="false">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M13.7 21h-3.4" /></svg>
          <span>Ative nossas notificações</span>
        </button>
      </div>

      <a class="brand" href="/" aria-label="Portal Oficial">
        <span class="brand-wordmark"><span>PORTAL</span><b>OFICIAL</b></span>
      </a>

      <div class="header-actions">
        <a class="video-link" href="https://www.youtube.com/@portaloficial-n1j" target="_blank" rel="noopener noreferrer" aria-label="Assistir ao canal do Portal Oficial no YouTube">
          <span>Portal Oficial</span>
          <span class="play">▶</span>
        </a>
        <a class="instagram-link" href="https://www.instagram.com/portal__oficial?avpt=OTJidXdxNDh2b2R0" target="_blank" rel="noopener noreferrer" aria-label="Instagram do Portal Oficial">
          <span>Instagram</span>
          <span class="instagram-mark"><img src="https://cdn.simpleicons.org/instagram/FFFFFF" alt="" /></span>
        </a>
        <button class="search-button" id="searchButton" aria-label="Buscar">
          <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg>
          <b>Busca</b>
        </button>
      </div>

      <nav class="category-nav" id="categoryNav" aria-label="Categorias">
        ${categories.map((category) => `<a href="#/${categorySlug(category)}" data-category="${category}">${category}</a>`).join('')}
      </nav>
    </div>
  </header>

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

  <div class="mobile-panel" id="mobilePanel" aria-hidden="true" inert>
    <div class="panel-head">
      <strong>Portal Oficial</strong>
      <button id="closeMenu" aria-label="Fechar menu">×</button>
    </div>
    <nav>
      ${categories.map((category) => `<a href="#/${categorySlug(category)}" data-category="${category}">${category}</a>`).join('')}
    </nav>
    <div class="panel-socials">
      <a href="https://www.youtube.com/@portaloficial-n1j" target="_blank" rel="noopener noreferrer">YouTube</a>
      <a href="https://www.instagram.com/portal__oficial?avpt=OTJidXdxNDh2b2R0" target="_blank" rel="noopener noreferrer">Instagram</a>
    </div>
  </div>
  <div class="overlay" id="overlay"></div>
  <section class="search-panel" id="searchPanel" aria-hidden="true" inert>
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
  <div class="ad-prompt-overlay" id="adPrompt" aria-hidden="true" hidden>
    <section class="ad-prompt" role="dialog" aria-modal="true" aria-labelledby="adPromptTitle">
      <button class="ad-prompt-close" id="closeAdPrompt" aria-label="Fechar aviso">×</button>
      <p>Bem-vindo ao Portal Oficial</p>
      <h2 id="adPromptTitle">Permita anúncios no nosso site</h2>
      <p>Se você usa um bloqueador de anúncios, considere adicionar o Portal Oficial à lista de permissões. A publicidade ajuda a manter o nosso jornalismo no ar.</p>
      <button class="ad-prompt-action" id="allowAds">Entendi, continuar</button>
    </section>
  </div>
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
const adPrompt = document.querySelector('#adPrompt');
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

function closePanels() {
  setMenu(false);
  setSearch(false);
}

function setMenu(open) {
  mobilePanel.classList.toggle('open', open);
  overlay.classList.toggle('open', open);
  mobilePanel.setAttribute('aria-hidden', String(!open));
  mobilePanel.inert = !open;
}

function setSearch(open) {
  searchPanel.classList.toggle('open', open);
  overlay.classList.toggle('open', open);
  searchPanel.setAttribute('aria-hidden', String(!open));
  searchPanel.inert = !open;
  if (open) searchInput.focus();
}

function dismissAdPrompt() {
  adPrompt.classList.remove('open');
  adPrompt.setAttribute('aria-hidden', 'true');
  adPrompt.hidden = true;
  document.body.classList.remove('ad-prompt-open');
  try {
    window.sessionStorage.setItem('portalOficialAdsPromptDismissed', 'true');
  } catch (error) {
    console.error('Não foi possível salvar a escolha do aviso de anúncios:', error);
  }
}

function showAdPrompt() {
  let dismissed = false;
  try {
    dismissed = window.sessionStorage.getItem('portalOficialAdsPromptDismissed') === 'true';
  } catch (error) {
    console.error('Não foi possível consultar a escolha do aviso de anúncios:', error);
  }
  if (dismissed) return;

  adPrompt.hidden = false;
  adPrompt.classList.add('open');
  adPrompt.setAttribute('aria-hidden', 'false');
  document.body.classList.add('ad-prompt-open');
}

menuButton.addEventListener('click', () => {
  setSearch(false);
  setMenu(true);
});
notificationButton.addEventListener('click', toggleNotifications);
closeMenu.addEventListener('click', () => setMenu(false));
overlay.addEventListener('click', closePanels);
searchButton.addEventListener('click', () => {
  setMenu(false);
  setSearch(true);
});
document.querySelector('#closeSearch').addEventListener('click', () => setSearch(false));
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
document.querySelector('#closeAdPrompt').addEventListener('click', dismissAdPrompt);
document.querySelector('#allowAds').addEventListener('click', dismissAdPrompt);
adPrompt.addEventListener('click', (event) => {
  if (event.target === adPrompt) dismissAdPrompt();
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && !adPrompt.hidden) dismissAdPrompt();
});

renderNews();
renderRoute();
window.setTimeout(showAdPrompt, 900);

import './style.css';
import { mountPublicNews } from './public/routes.js';

const youtubeUrl = 'https://www.youtube.com/@portaloficial-n1j';
const instagramUrl = 'https://www.instagram.com/portal__oficial?avpt=OTJidXdxNDh2b2R0';
const youtubeMark = '<span class="youtube-mark" aria-hidden="true"><svg viewBox="0 0 24 24"><path fill="currentColor" d="M9 5v14l11-7z"/></svg></span>';
const instagramMark = '<span class="instagram-mark" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/></svg></span>';
const wordmark = '<span class="brand-wordmark"><span>PORTAL</span><b>OFICIAL</b></span>';

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
      </nav>
    </div>
  </header>
  <div class="mobile-channel">
    <a href="${youtubeUrl}" target="_blank" rel="noopener noreferrer">Acompanhe o Portal Oficial no <strong>YouTube</strong></a>
  </div>

  <main>
    <p class="empty-state public-status" id="publicStatus" role="status" hidden></p>
    <div class="home-page" id="homePage" hidden>
      <div class="ad-slot" aria-label="Espaço publicitário"></div>
      <section class="featured-section" id="featuredSection" hidden></section>

      <section class="latest-section" id="ultimas">
        <div class="section-heading">
          <h2>Últimas notícias</h2>
          <a href="/ultimas-noticias">Ver tudo</a>
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
          <nav class="news-pagination" id="newsPagination" aria-label="Páginas de notícias" hidden></nav>
        </div>
        <aside class="category-ads" aria-label="Espaços publicitários">
          <div class="ad-rectangle"></div>
          <div class="ad-rectangle"></div>
        </aside>
      </div>
    </section>
    <div id="articlePage" hidden></div>
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
    </nav>
  </div>
  <div class="overlay" id="overlay"></div>
  <section class="search-panel" id="searchPanel" role="dialog" aria-modal="true" aria-label="Buscar notícias" aria-hidden="true" inert>
    <div class="search-brand">${wordmark}</div>
    <form id="searchForm" role="search">
      <label for="searchInput">Buscar notícias</label>
      <div class="search-field">
        <input id="searchInput" type="search" maxlength="120" placeholder="Digite um assunto ou palavra-chave" />
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
const notificationButton = document.querySelector('#notificationButton');
const toast = document.querySelector('#toast');
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
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') closePanels();
});

mountPublicNews(closePanels);

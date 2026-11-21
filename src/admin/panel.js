import { supabase } from '../supabase.js';
import './panel.css';

const pageSize = 20;
const dateFormat = new Intl.DateTimeFormat('pt-BR', {
  timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'short',
});

export function statusLabel(article) {
  if (article.visible_at && Date.parse(article.visible_at) <= Date.now()) return 'Publicada';
  return { draft: 'Rascunho', in_review: 'Em revisão', scheduled: 'Agendada', published: 'Publicada' }[article.status];
}

function append(parent, tag, text) {
  const element = document.createElement(tag);
  if (text !== undefined) element.textContent = text;
  parent.append(element);
  return element;
}

function button(parent, label, onClick) {
  const element = append(parent, 'button', label);
  element.type = 'button';
  element.addEventListener('click', onClick);
  return element;
}

async function loadCategories() {
  const { data, error } = await supabase.from('categories')
    .select('id, name, slug, active, show_in_menu, menu_order').order('menu_order').order('name');
  if (error) throw error;
  return data;
}

export function mountEditorialPanel(root, { user, profile }) {
  root.innerHTML = `
    <nav class="cms-nav" aria-label="Área editorial"></nav>
    <p class="cms-message" role="status"></p>
    <div class="cms-screen"></div>
  `;

  const navigation = root.querySelector('nav');
  const message = root.querySelector('.cms-message');
  const screen = root.querySelector('.cms-screen');
  const admin = profile.role === 'admin';
  let page = 0;
  let revision = 0;
  let cleanup;
  let busy = false;

  function changeScreen(load, { confirmDiscard = true } = {}) {
    if (busy || (confirmDiscard && cleanup?.dirty() && !window.confirm('Descartar alterações sem salvar?'))) return;
    cleanup?.destroy();
    cleanup = null;
    const current = ++revision;
    screen.replaceChildren();
    message.textContent = 'Carregando…';
    const active = () => current === revision;
    load(active).catch(() => {
      if (active()) message.textContent = 'Não foi possível carregar esta área. Tente novamente.';
    });
  }

  function ArticleList(items, detail) {
    const list = append(screen, 'ul');
    list.className = 'cms-list';
    for (const article of items) {
      const row = append(list, 'li');
      const label = append(row, 'div');
      button(label, article.title, () => openArticle(article.id)).className = 'cms-text-button';
      const date = article.visible_at || article.created_at;
      append(label, 'small', `${statusLabel(article)} · ${dateFormat.format(new Date(date))}`);
      if (detail && article.featured) append(row, 'span', 'Destaque');
    }
  }

  function dashboard() {
    changeScreen(async (active) => {
      const { data, error } = await supabase.rpc('cms_dashboard');
      if (!active()) return;
      if (error) throw error;
      message.textContent = '';
      append(screen, 'h2', 'Visão geral');
      const cards = append(screen, 'dl');
      cards.className = 'cms-stats';
      for (const [label, value] of [
        ['Publicadas', data.published], ['Rascunhos', data.draft], ['Em revisão', data.review],
        ['Agendadas', data.scheduled], ['Publicadas hoje', data.today],
      ]) {
        const card = append(cards, 'div');
        append(card, 'dt', label);
        append(card, 'dd', String(value));
      }
      append(screen, 'h2', 'Notícias por categoria');
      const categories = append(screen, 'ul');
      categories.className = 'cms-list';
      for (const category of data.categories) {
        const row = append(categories, 'li');
        append(row, 'span', category.name);
        append(row, 'strong', String(category.total));
      }
      if (!data.categories.length) append(categories, 'li', 'Nenhuma categoria cadastrada.');
      append(screen, 'h2', 'Últimas notícias cadastradas');
      if (data.latest.length) ArticleList(data.latest, false);
      else append(screen, 'p', 'Nenhuma notícia cadastrada.');
    });
  }

  function articles(nextPage = 0, notice = '', confirmDiscard = true) {
    changeScreen(async (active) => {
      const { data, count, error } = await supabase.from('articles')
        .select('id, title, status, featured, visible_at, created_at', { count: 'exact' })
        .order('created_at', { ascending: false }).order('id')
        .range(nextPage * pageSize, (nextPage + 1) * pageSize - 1);
      if (!active()) return;
      if (error) throw error;
      page = nextPage;
      message.textContent = notice;
      append(screen, 'h2', 'Notícias');
      button(screen, 'Nova notícia', () => openArticle());
      if (data.length) ArticleList(data, true);
      else append(screen, 'p', 'Nenhuma notícia nesta página.');
      const controls = append(screen, 'div');
      controls.className = 'cms-actions';
      if (page) button(controls, 'Anterior', () => articles(page - 1));
      if ((page + 1) * pageSize < count) button(controls, 'Próxima', () => articles(page + 1));
    }, { confirmDiscard });
  }

  function openArticle(id) {
    changeScreen(async (active) => {
      const { mountArticleForm } = await import('./article-form.js');
      const mounted = await mountArticleForm(screen, {
        id, user, profile, active, loadCategories,
        setBusy: (value) => { busy = value; },
        notify: (text) => { if (active()) message.textContent = text; },
        back: (notice) => articles(page, notice, !notice),
      });
      if (active()) cleanup = mounted;
      else mounted?.destroy();
    });
  }

  function categories(notice = '') {
    changeScreen(async (active) => {
      const items = await loadCategories();
      if (!active()) return;
      message.textContent = notice;
      append(screen, 'h2', 'Categorias');
      const form = append(screen, 'form');
      form.className = 'cms-form';
      form.innerHTML = `
        <fieldset class="cms-fields">
          <legend>Nova categoria</legend>
          <label>Nome <input name="name" required maxlength="120"></label>
          <label>Slug <input name="slug" required maxlength="120" pattern="[a-z0-9]+(-[a-z0-9]+)*"></label>
          <label>Ordem no menu <input name="menu_order" type="number" value="0" min="0" max="2147483647" required></label>
          <label class="cms-check"><input name="active" type="checkbox" checked> Ativa</label>
          <label class="cms-check"><input name="show_in_menu" type="checkbox" checked> Mostrar no menu</label>
          <div class="cms-actions"><button type="submit">Salvar categoria</button><button type="button" data-new>Nova categoria</button></div>
        </fieldset>
      `;
      const fields = form.querySelector('fieldset');
      let selected;
      let dirty = false;
      form.addEventListener('input', () => { dirty = true; });
      cleanup = { dirty: () => dirty, destroy() {} };
      const loadForm = (item) => {
        if (dirty && !window.confirm('Descartar alterações sem salvar?')) return;
        selected = item?.id;
        form.reset();
        fields.querySelector('legend').textContent = item ? 'Editar categoria' : 'Nova categoria';
        if (item) {
          for (const key of ['name', 'slug', 'menu_order']) form.elements[key].value = item[key];
          for (const key of ['active', 'show_in_menu']) form.elements[key].checked = item[key];
        }
        dirty = false;
        form.elements.name.focus();
      };
      form.querySelector('[data-new]').addEventListener('click', () => loadForm());
      form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const values = new FormData(form);
        const data = {
          name: values.get('name').trim(), slug: values.get('slug'),
          menu_order: Number(values.get('menu_order')),
          active: values.has('active'), show_in_menu: values.has('show_in_menu'),
        };
        fields.disabled = busy = true;
        try {
          const query = supabase.from('categories');
          const { data: saved, error } = await (selected ? query.update(data).eq('id', selected) : query.insert(data))
            .select('id').single();
          if (error || !saved) throw error;
          if (!active()) return;
          busy = dirty = false;
          categories('Categoria salva.');
        } catch {
          if (active()) message.textContent = 'Não foi possível salvar. Confira os dados e se o slug já existe.';
        } finally {
          fields.disabled = busy = false;
        }
      });
      const list = append(screen, 'ul');
      list.className = 'cms-list';
      for (const item of items) {
        const row = append(list, 'li');
        const info = append(row, 'div');
        append(info, 'strong', item.name);
        append(info, 'small', `${item.slug} · ${item.active ? 'Ativa' : 'Inativa'}`);
        button(row, 'Editar', () => loadForm(item));
      }
    });
  }

  function staff(notice = '') {
    changeScreen(async (active) => {
      const { mountStaff } = await import('./staff.js');
      const mounted = await mountStaff(screen, {
        user, active,
        notify: (text) => { if (active()) message.textContent = text; },
        setBusy: (value) => { busy = value; },
        reload: staff,
      });
      if (active()) {
        cleanup = mounted;
        if (notice) message.textContent = notice;
      }
    }, { confirmDiscard: !notice });
  }

  button(navigation, 'Visão geral', dashboard);
  button(navigation, 'Notícias', () => articles());
  if (admin) {
    button(navigation, 'Categorias', () => categories());
    button(navigation, 'Equipe', () => staff());
  }
  dashboard();

  return {
    destroy() {
      revision++;
      cleanup?.destroy();
      root.replaceChildren();
    },
  };
}

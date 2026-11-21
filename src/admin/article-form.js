import { supabase } from '../supabase.js';
import { createEditor, renderContent, safeUrl, visitImages } from './editor.js';
import { prepareImage, removeImages, signedPreviews, uploadImage } from './media.js';

const brasilia = new Intl.DateTimeFormat('sv-SE', {
  timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'short',
});

function brasiliaInput(date) {
  return brasilia.format(date).replace(' ', 'T');
}

function utcSchedule(value) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return null;
  const wallTime = Date.parse(`${value}:00Z`);
  if (!Number.isFinite(wallTime)) return null;
  let utc = wallTime;
  for (let pass = 0; pass < 3; pass++) {
    const local = brasiliaInput(new Date(utc));
    if (local === value) return new Date(utc).toISOString();
    utc += wallTime - Date.parse(`${local}:00Z`);
  }
  return null;
}

function slugify(title) {
  return title.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function element(tag, text) {
  const node = document.createElement(tag);
  node.textContent = text;
  return node;
}

function action(parent, label, run, type = 'button') {
  const button = element('button', label);
  button.type = type;
  if (run) button.addEventListener('click', run);
  parent.append(button);
  return button;
}

export async function mountArticleForm(root, context) {
  const { id, user, profile, active, loadCategories, notify, setBusy, back } = context;
  const record = id ? supabase.from('articles').select('*').eq('id', id).single() : null;
  const attachments = id ? supabase.from('article_media').select('*').eq('article_id', id) : null;
  const [categories, { data: article, error: articleError }, { data: images, error: mediaError }] = await Promise.all([
    loadCategories(), record ?? { data: null }, attachments ?? { data: [] },
  ]);
  if (!active()) return;
  if (articleError || mediaError) throw articleError ?? mediaError;

  const admin = profile.role === 'admin';
  const canPublish = admin || (profile.role === 'editor' && profile.can_publish);
  const editable = !article || canPublish || (!article.featured
    && ((profile.role === 'editor' && ['draft', 'in_review'].includes(article.status))
      || (article.status === 'draft' && article.owner_id === user.id)));
  const mediaUrls = await signedPreviews(images);
  if (!active()) return;
  const pending = new Map();
  const blobUrls = new Set();
  let saved = article;
  let dirty = false;
  let coverPath = images.find((image) => image.kind === 'cover')?.object_path;

  root.innerHTML = `
    <h2></h2>
    <form class="cms-form">
      <fieldset class="cms-fields" data-details>
        <legend>Dados da notícia</legend>
        <label>Título <input name="title" required maxlength="240"></label>
        <label>Slug <input name="slug" required maxlength="240" pattern="[a-z0-9]+(-[a-z0-9]+)*"></label>
        <label>Subtítulo <input name="subtitle" maxlength="500"></label>
        <label>Autor <input name="author_name" required maxlength="120"></label>
        <label>Categoria <select name="category_id" required><option value="">Selecione</option></select></label>
        <label>Resumo <textarea name="summary" rows="3" maxlength="1000"></textarea></label>
      </fieldset>
      <fieldset class="cms-fields" data-media>
        <legend>Imagem principal</legend>
        <label>Arquivo <input name="cover_file" type="file" accept="image/jpeg,image/png,image/webp"></label>
        <label>Texto alternativo <input name="cover_alt" maxlength="300"></label>
        <input name="cover_external_url" type="hidden">
        <figure class="cms-cover" hidden><img alt=""></figure>
        <button type="button" data-remove-cover>Remover imagem principal</button>
      </fieldset>
      <fieldset class="cms-fields cms-content" data-content>
        <legend>Conteúdo</legend>
        <div class="cms-toolbar" role="group" aria-label="Formatação"></div>
        <div class="cms-editor"></div>
        <div class="cms-inline">
          <label>Imagem no texto <input name="inline_file" type="file" accept="image/jpeg,image/png,image/webp"></label>
          <label>Texto alternativo da imagem no texto <input name="inline_alt" maxlength="300"></label>
          <label>Legenda <input name="inline_caption" maxlength="500"></label>
          <button type="button" data-inline>Inserir imagem</button>
        </div>
      </fieldset>
      <fieldset class="cms-fields">
        <legend>SEO</legend>
        <label>Título SEO <input name="seo_title" maxlength="120"></label>
        <label>Descrição SEO <textarea name="seo_description" rows="2" maxlength="320"></textarea></label>
      </fieldset>
      <fieldset class="cms-fields" data-publishing>
        <legend>Publicação</legend>
        <p data-status></p>
        <label class="cms-check"><input name="featured" type="checkbox"> Destacar na capa</label>
        <label>Agendar para (horário de Brasília) <input name="scheduled_at" type="datetime-local"></label>
      </fieldset>
      <div class="cms-actions" data-actions></div>
    </form>
    <dialog class="cms-preview"><div></div><form method="dialog"><button>Fechar prévia</button></form></dialog>
  `;

  const form = root.querySelector('form');
  const fields = form.elements;
  const toolbar = form.querySelector('.cms-toolbar');
  const actions = form.querySelector('[data-actions]');
  const dialog = root.querySelector('dialog');
  const cover = form.querySelector('.cms-cover');
  const coverImage = cover.querySelector('img');
  root.querySelector('h2').textContent = article ? (editable ? 'Editar notícia' : 'Visualizar notícia') : 'Nova notícia';

  for (const category of categories) {
    if (!category.active && category.id !== article?.category_id) continue;
    const option = element('option', category.active ? category.name : `${category.name} (inativa)`);
    option.value = category.id;
    fields.category_id.append(option);
  }

  const textFields = [
    'title', 'slug', 'subtitle', 'author_name', 'category_id', 'summary',
    'cover_external_url', 'cover_alt', 'seo_title', 'seo_description',
  ];
  for (const field of textFields) fields[field].value = article?.[field] ?? '';
  if (!article) fields.author_name.value = 'Portal Oficial';
  fields.featured.checked = article?.featured ?? false;
  fields.scheduled_at.value = article?.scheduled_at ? brasiliaInput(new Date(article.scheduled_at)) : '';
  form.querySelector('[data-status]').textContent = article?.status === 'scheduled'
    ? (Date.parse(article.visible_at) <= Date.now() ? 'Publicada no horário agendado' : 'Agendada')
    : ({ published: 'Publicada', in_review: 'Em revisão', draft: 'Rascunho' }[article?.status] ?? 'Nova notícia');
  fields.featured.disabled = fields.scheduled_at.disabled = !canPublish;
  if (!editable) {
    for (const fieldset of form.querySelectorAll('fieldset')) fieldset.disabled = true;
    form.querySelector('.cms-inline').hidden = true;
  }

  function coverUrl() {
    return coverPath ? mediaUrls.get(coverPath) : safeUrl(fields.cover_external_url.value, { httpsOnly: true });
  }

  function showCover() {
    const url = coverUrl();
    cover.hidden = !url;
    if (url) coverImage.src = url;
    else coverImage.removeAttribute('src');
    coverImage.alt = fields.cover_alt.value;
  }

  showCover();
  const editor = createEditor(form.querySelector('.cms-editor'), article?.content, mediaUrls, editable);
  editor.on('update', () => { dirty = true; });
  form.addEventListener('input', () => { dirty = true; });
  let autoSlug = !article;
  fields.slug.addEventListener('input', () => { autoSlug = !fields.slug.value; });
  fields.title.addEventListener('input', () => {
    if (autoSlug) fields.slug.value = slugify(fields.title.value);
  });
  fields.cover_alt.addEventListener('input', showCover);

  if (editable) {
    for (const [label, command] of [
      ['Parágrafo', (chain) => chain.setParagraph()],
      ['Título', (chain) => chain.toggleHeading({ level: 2 })],
      ['Subtítulo', (chain) => chain.toggleHeading({ level: 3 })],
      ['Negrito', (chain) => chain.toggleBold()],
      ['Itálico', (chain) => chain.toggleItalic()],
      ['Lista', (chain) => chain.toggleBulletList()],
      ['Lista numerada', (chain) => chain.toggleOrderedList()],
    ]) action(toolbar, label, () => command(editor.chain().focus()).run());
    action(toolbar, 'Inserir link', () => {
      if (editor.state.selection.empty) return notify('Selecione o texto que receberá o link.');
      const entry = window.prompt('Endereço do link', editor.getAttributes('link').href ?? 'https://');
      if (entry === null) return;
      const href = safeUrl(entry.trim());
      if (!href) return notify('Informe um endereço começando com https:// ou http://.');
      editor.chain().focus().extendMarkRange('link').setLink({ href }).run();
      notify('');
    });
    action(toolbar, 'Remover link', () => editor.chain().focus().extendMarkRange('link').unsetLink().run());
  }

  let working = false;
  async function run(task, failure) {
    if (working) return;
    working = true;
    setBusy(true);
    const enabled = [...form.querySelectorAll('button, input, select, textarea')].filter((item) => !item.disabled);
    for (const item of enabled) item.disabled = true;
    editor.setEditable(false, false);
    try {
      await task();
    } catch (error) {
      if (active()) notify(typeof failure === 'function' ? failure(error) : failure);
    } finally {
      working = false;
      setBusy(false);
      if (active()) {
        for (const item of enabled) item.disabled = false;
        editor.setEditable(editable, false);
      }
    }
  }

  function leave(notice) {
    if (!active()) return;
    dirty = false;
    setBusy(false);
    back(notice);
  }

  function stageImage(file) {
    const ref = crypto.randomUUID();
    const url = URL.createObjectURL(file);
    blobUrls.add(url);
    pending.set(ref, { file });
    mediaUrls.set(ref, url);
    return ref;
  }

  fields.cover_file.addEventListener('change', () => {
    const file = fields.cover_file.files[0];
    if (!file) return;
    run(async () => {
      const image = await prepareImage(file);
      if (!active()) return;
      coverPath = stageImage(image);
      fields.cover_external_url.value = '';
      fields.cover_file.value = '';
      showCover();
      dirty = true;
      notify('');
    }, (error) => {
      fields.cover_file.value = '';
      return error.message;
    });
  });

  form.querySelector('[data-remove-cover]').addEventListener('click', () => {
    coverPath = undefined;
    fields.cover_external_url.value = '';
    fields.cover_file.value = '';
    fields.cover_alt.value = '';
    dirty = true;
    showCover();
  });

  form.querySelector('[data-inline]').addEventListener('click', () => {
    const alt = fields.inline_alt.value.trim();
    const file = fields.inline_file.files[0];
    if (!alt) return notify('Preencha o texto alternativo da imagem no texto.');
    const caption = fields.inline_caption.value.trim();
    const position = editor.state.selection.to;
    run(async () => {
      const image = await prepareImage(file);
      if (!active()) return;
      editor.commands.insertContentAt(position, {
        type: 'articleImage', attrs: { path: stageImage(image), alt, caption },
      });
      fields.inline_file.value = fields.inline_alt.value = fields.inline_caption.value = '';
      notify('');
    }, (error) => error.message);
  });

  action(actions, 'Pré-visualizar', () => {
    const body = dialog.querySelector('div');
    body.replaceChildren(element('h2', fields.title.value || 'Notícia sem título'));
    for (const field of ['subtitle', 'author_name', 'summary']) {
      if (fields[field].value.trim()) body.append(element('p', fields[field].value));
    }
    if (coverUrl()) {
      const image = document.createElement('img');
      image.src = coverUrl();
      image.alt = fields.cover_alt.value;
      body.append(image);
    }
    body.append(renderContent(editor.getJSON(), mediaUrls));
    dialog.showModal();
  });
  action(actions, 'Voltar', () => back());

  if (editable) {
    const save = (status) => {
      const current = status ?? article?.status ?? 'draft';
      if (!form.reportValidity()) return;
      const values = Object.fromEntries(textFields.map((field) => [field, fields[field].value.trim() || null]));
      if (!values.title || !values.author_name) return notify('Preencha o título e o autor.');
      if (coverPath && !values.cover_alt) return notify('Preencha o texto alternativo da imagem principal.');
      const reusingSchedule = !status && current === 'scheduled' && article?.scheduled_at
        && fields.scheduled_at.value === brasiliaInput(new Date(article.scheduled_at));
      const scheduled = current === 'scheduled'
        ? (reusingSchedule ? article.scheduled_at : utcSchedule(fields.scheduled_at.value)) : null;
      if (current === 'scheduled' && (!scheduled || (!reusingSchedule && Date.parse(scheduled) <= Date.now()))) {
        return notify('Informe uma data futura de agendamento no horário de Brasília.');
      }
      if (status && ['published', 'scheduled'].includes(status) && editor.isEmpty) {
        return notify('Escreva o conteúdo da notícia antes de publicar ou agendar.');
      }
      if (status && ['published', 'scheduled'].includes(status)
        && ((!coverPath && !values.cover_external_url) || !values.cover_alt)) {
        return notify('Adicione uma imagem principal com texto alternativo antes de publicar ou agendar.');
      }
      const content = structuredClone(editor.getJSON());
      const inline = [];
      visitImages(content, (attrs) => inline.push(attrs));
      run(async () => {
        notify('Salvando notícia…');
        if (!saved) {
          const { data, error } = await supabase.from('articles').insert({
            title: values.title, slug: values.slug, category_id: values.category_id, author_name: values.author_name,
          }).select('id, updated_at').single();
          if (error) throw error;
          saved = data;
        }
        const references = new Map();
        async function resolveImage(ref, kind, alt, caption = null) {
          const staged = pending.get(ref);
          if (staged && !staged.path) staged.path = await uploadImage(saved.id, staged.file);
          const path = staged?.path ?? ref;
          references.set(path, { object_path: path, kind, alt_text: alt, caption });
          return path;
        }
        if (coverPath) await resolveImage(coverPath, 'cover', values.cover_alt);
        for (const attrs of inline) attrs.path = await resolveImage(attrs.path, 'inline', attrs.alt, attrs.caption);

        const { error } = await supabase.rpc('cms_save_article', {
          article_id: saved.id,
          expected_updated_at: saved.updated_at,
          article_data: { ...values, content, status: current, scheduled_at: scheduled, featured: fields.featured.checked },
          images: [...references.values()],
        });
        if (error) throw error;
        let notice = 'Notícia salva.';
        if (admin) {
          try {
            await removeImages(images.filter((image) => !references.has(image.object_path)).map((image) => image.object_path));
          } catch {
            notice += ' A limpeza dos arquivos antigos ficou pendente.';
          }
        }
        leave(notice);
      }, (error) => {
        if (error.code === '40001') return 'A notícia foi alterada em outra sessão. Reabra a notícia antes de salvar.';
        if (error.code === '23505') return 'Esse slug já pertence a outra notícia.';
        return saved && !article
          ? 'A notícia foi criada como rascunho, mas esta edição não foi concluída. Corrija os dados e tente salvar novamente.'
          : 'Não foi possível salvar. Confira os campos e suas permissões.';
      });
    };

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      save();
    });
    action(actions, article ? 'Salvar alterações' : 'Salvar rascunho', null, 'submit');
    if (!article || article.status === 'draft') action(actions, 'Enviar para revisão', () => save('in_review'));
    if (canPublish) {
      action(actions, 'Publicar agora', () => save('published'));
      action(actions, 'Agendar', () => save('scheduled'));
    }
    if (article && article.status !== 'draft' && (canPublish || profile.role === 'editor')) {
      action(actions, article.status === 'in_review' ? 'Voltar para rascunho' : 'Despublicar', () => save('draft'));
    }
  }

  if (admin && article) {
    const remove = action(actions, 'Excluir notícia', () => {
      if (!window.confirm('Excluir esta notícia permanentemente?')) return;
      run(async () => {
        const { data, error } = await supabase.from('articles').delete()
          .eq('id', article.id).eq('updated_at', article.updated_at).select('id').maybeSingle();
        if (error || !data) throw error;
        let notice = 'Notícia excluída.';
        try {
          await removeImages(images.map((item) => item.object_path));
        } catch {
          notice += ' A limpeza dos arquivos ficou pendente.';
        }
        leave(notice);
      }, 'Não foi possível excluir a notícia. Reabra a notícia e tente novamente.');
    });
    remove.classList.add('cms-danger');
  }

  notify('');
  return {
    dirty: () => dirty,
    destroy() {
      editor.destroy();
      for (const url of blobUrls) URL.revokeObjectURL(url);
    },
  };
}

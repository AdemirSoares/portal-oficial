import { Editor, Node } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';

export function safeUrl(value, { httpsOnly = false } = {}) {
  try {
    const url = new URL(value);
    if (url.protocol === 'https:' || (!httpsOnly && url.protocol === 'http:')) return url.href;
  } catch {
    return null;
  }
  return null;
}

function imageElement(image, url) {
  const figure = document.createElement('figure');
  if (url) {
    const picture = document.createElement('img');
    picture.src = url;
    picture.alt = image.alt ?? '';
    picture.loading = 'lazy';
    figure.append(picture);
  } else {
    figure.textContent = 'Imagem indisponível';
  }
  if (image.caption) {
    const caption = document.createElement('figcaption');
    caption.textContent = image.caption;
    figure.append(caption);
  }
  return figure;
}

export function visitImages(node, visit) {
  if (node.type === 'articleImage') visit(node.attrs);
  for (const child of node.content ?? []) visitImages(child, visit);
}

export function createEditor(element, content, mediaUrls, editable) {
  const image = Node.create({
    name: 'articleImage',
    group: 'block',
    atom: true,
    selectable: true,
    addAttributes() {
      return { path: { default: '' }, alt: { default: '' }, caption: { default: '' } };
    },
    renderHTML: () => ['figure', {}],
    addNodeView: () => ({ node }) => ({
      dom: imageElement(node.attrs, mediaUrls.get(node.attrs.path)),
    }),
  });

  return new Editor({
    element,
    editable,
    content,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        code: false, codeBlock: false, horizontalRule: false, underline: false, strike: false,
        link: { openOnClick: false, isAllowedUri: (url) => Boolean(safeUrl(url)) },
      }),
      image,
    ],
    editorProps: { attributes: { 'aria-label': 'Conteúdo da notícia', role: 'textbox', 'aria-multiline': 'true' } },
  });
}

const blocks = {
  paragraph: 'p', bulletList: 'ul', orderedList: 'ol', listItem: 'li',
  blockquote: 'blockquote', hardBreak: 'br',
};

// Build the preview from allowlisted nodes and marks. Never interpret stored HTML.
export function renderContent(node, mediaUrls) {
  if (node.type === 'articleImage') return imageElement(node.attrs, mediaUrls.get(node.attrs.path));
  if (node.type === 'text') {
    let result = document.createTextNode(node.text ?? '');
    for (const mark of node.marks ?? []) {
      const href = mark.type === 'link' ? safeUrl(mark.attrs?.href) : null;
      const tag = mark.type === 'bold' ? 'strong' : mark.type === 'italic' ? 'em' : href ? 'a' : null;
      if (!tag) continue;
      const wrapper = document.createElement(tag);
      if (href) {
        wrapper.href = href;
        wrapper.target = '_blank';
        wrapper.rel = 'noopener noreferrer';
      }
      wrapper.append(result);
      result = wrapper;
    }
    return result;
  }

  const tag = node.type === 'heading' ? (node.attrs?.level === 3 ? 'h3' : 'h2') : blocks[node.type];
  const wrapper = typeof tag === 'string' ? document.createElement(tag) : document.createDocumentFragment();
  if (node.type === 'orderedList' && Number.isSafeInteger(node.attrs?.start)) wrapper.start = node.attrs.start;
  for (const child of node.content ?? []) wrapper.append(renderContent(child, mediaUrls));
  return wrapper;
}

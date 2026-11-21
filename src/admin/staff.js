import { supabase } from '../supabase.js';

const roles = { admin: 'Administrador', editor: 'Editor', journalist: 'Jornalista' };

function action(text, listener) {
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = text;
  button.addEventListener('click', listener);
  return button;
}

export async function mountStaff(root, { user, active, notify, setBusy, reload }) {
  const { data, error } = await supabase.rpc('cms_staff_accounts');
  if (!active()) return;
  if (error) throw error;
  root.innerHTML = `
    <h2>Equipe editorial</h2>
    <p>Para conceder acesso ao painel, use o e-mail de uma conta já criada no Supabase Auth.</p>
    <form class="cms-form">
      <fieldset class="cms-fields">
        <legend>Conceder ou atualizar acesso</legend>
        <label>E-mail <input type="email" name="email" required maxlength="320"></label>
        <label>Perfil <select name="role">
          <option value="journalist">Jornalista</option>
          <option value="editor">Editor</option>
          <option value="admin">Administrador</option>
        </select></label>
        <label class="cms-check"><input type="checkbox" name="can_publish" disabled> Autorizar editor a publicar</label>
        <div class="cms-actions"><button type="submit">Salvar acesso</button></div>
      </fieldset>
    </form>
    <ul class="cms-list"></ul>
  `;

  const form = root.querySelector('form');
  const controls = form.elements;
  const fieldset = form.querySelector('fieldset');
  const list = root.querySelector('ul');
  let dirty = false;
  let pending = false;

  function setRole(role, canPublish = false) {
    controls.role.value = role;
    controls.can_publish.disabled = role !== 'editor';
    controls.can_publish.checked = role === 'editor' && canPublish;
  }

  async function save(operation, message) {
    if (pending) return;
    fieldset.disabled = pending = true;
    setBusy(true);
    try {
      const { data: saved, error: failure } = await operation();
      if (failure) throw failure;
      if (!saved) throw new Error('Staff operation affected no user');
      if (!active()) return;
      dirty = false;
      setBusy(false);
      reload(message);
    } catch (failure) {
      if (active()) notify(failure.code === 'P0002'
        ? 'Não foi possível localizar uma conta única com esse e-mail no Supabase Auth.'
        : 'Não foi possível atualizar o acesso. Confira os dados e suas permissões.');
    } finally {
      fieldset.disabled = pending = false;
      setBusy(false);
    }
  }

  form.addEventListener('input', () => { dirty = true; });
  controls.role.addEventListener('change', () => setRole(controls.role.value));
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const values = new FormData(form);
    save(() => supabase.rpc('cms_assign_staff', {
      account_email: values.get('email').trim(),
      staff_role: values.get('role'),
      publish_allowed: values.has('can_publish'),
    }), 'Acesso salvo.');
  });

  for (const account of data) {
    const item = document.createElement('li');
    const name = document.createElement('div');
    const email = document.createElement('strong');
    const role = document.createElement('small');
    email.textContent = account.email || 'Conta sem e-mail';
    role.textContent = `${roles[account.role]}${account.can_publish ? ' · Pode publicar' : ''}${account.id === user.id ? ' · Sua conta' : ''}`;
    name.append(email, role);
    item.append(name);
    if (account.id !== user.id) {
      const actions = document.createElement('div');
      actions.className = 'cms-actions';
      if (account.email) actions.append(action('Editar acesso', () => {
        if (pending || (dirty && !window.confirm('Descartar alterações sem salvar?'))) return;
        controls.email.value = account.email;
        setRole(account.role, account.can_publish);
        dirty = false;
        controls.email.focus();
      }));
      actions.append(action('Revogar acesso', () => {
        if (pending || !window.confirm(`Revogar o acesso editorial de ${account.email || 'esta conta'}?`)) return;
        save(() => supabase.from('profiles').delete().eq('id', account.id).select('id').maybeSingle(), 'Acesso revogado.');
      }));
      item.append(actions);
    }
    list.append(item);
  }

  notify('');
  return { dirty: () => dirty, destroy() {} };
}

import { supabase } from '../supabase.js';

const recoveryPath = '/admin/redefinir-senha';
const recoveryRoute = window.location.pathname.replace(/\/$/, '') === recoveryPath;
const recoveryKey = 'portal-oficial-password-recovery';
const callbackError = ['error', 'error_code'].some((key) =>
  new URLSearchParams(window.location.hash.slice(1)).has(key)
  || new URLSearchParams(window.location.search).has(key));
const roles = new Map([
  ['admin', 'Administrador'],
  ['editor', 'Editor'],
  ['journalist', 'Jornalista'],
]);

if (recoveryRoute && callbackError) history.replaceState(null, '', recoveryPath);

document.title = 'Administração | Portal Oficial';
document.querySelector('#app').innerHTML = `
  <header class="admin-header">
    <a href="/" aria-label="Portal Oficial, página inicial">PORTAL <strong>OFICIAL</strong></a>
  </header>
  <main class="auth-card" aria-labelledby="auth-title">
    <h1 id="auth-title" tabindex="-1">Administração</h1>
    <p id="auth-message" role="status"></p>
    <form id="login-form" hidden>
      <label>E-mail <input name="email" type="email" autocomplete="username" required /></label>
      <label>Senha <input name="password" type="password" autocomplete="current-password" required /></label>
      <button type="submit">Entrar</button>
      <button class="auth-link" type="button" id="forgot-password">Esqueci minha senha</button>
    </form>
    <form id="request-form" hidden>
      <label>E-mail <input name="email" type="email" autocomplete="email" required /></label>
      <button type="submit">Enviar link de recuperação</button>
      <a class="auth-link" href="/admin">Voltar ao login</a>
    </form>
    <form id="reset-form" hidden>
      <label>Nova senha <input name="password" type="password" autocomplete="new-password" minlength="8" required /></label>
      <label>Confirmar nova senha <input name="confirmation" type="password" autocomplete="new-password" minlength="8" required /></label>
      <button type="submit">Salvar nova senha</button>
    </form>
    <section id="signed-in" hidden>
      <p id="auth-profile"></p>
      <div id="editorial-panel"></div>
    </section>
    <a class="auth-link" id="return-link" href="/admin" hidden>Voltar ao login</a>
    <button class="auth-link" type="button" id="sign-out" hidden>Sair</button>
  </main>
`;

const title = document.querySelector('#auth-title');
const message = document.querySelector('#auth-message');
const login = document.querySelector('#login-form');
const request = document.querySelector('#request-form');
const reset = document.querySelector('#reset-form');
const signedIn = document.querySelector('#signed-in');
const signOut = document.querySelector('#sign-out');
const returnLink = document.querySelector('#return-link');
let revision = 0;
let recoveryUser = null;
let editorialPanel;
let editorialIdentity;

function view(heading, description, { panel, allowSignOut = false, allowReturn = false, focus = false } = {}) {
  const editorial = panel === signedIn;
  document.body.classList.toggle('editorial-active', editorial);
  if (!editorial && editorialPanel) {
    editorialPanel.destroy();
    editorialPanel = null;
    editorialIdentity = null;
  }
  title.textContent = heading;
  message.textContent = description;
  for (const region of [login, request, reset, signedIn]) {
    region.hidden = region !== panel;
  }
  signOut.hidden = !allowSignOut;
  returnLink.hidden = !allowReturn;
  if (focus) title.focus();
}

function showLogin(description = 'Entre com a conta da equipe editorial.') {
  view('Entrar no painel', description, { panel: login });
}

function rememberRecovery(userId) {
  recoveryUser = userId;
  try {
    if (userId) sessionStorage.setItem(recoveryKey, userId);
    else sessionStorage.removeItem(recoveryKey);
  } catch {
    // Recovery still works in this tab until it is reloaded.
  }
}

function hasRecovery(userId) {
  if (recoveryUser === userId) return true;
  try {
    return sessionStorage.getItem(recoveryKey) === userId;
  } catch {
    return false;
  }
}

async function resolveAccess(session, currentRevision) {
  if (!session) {
    if (recoveryRoute) {
      view('Link indisponível', 'Solicite um novo link de recuperação.', { allowReturn: true });
    } else {
      const passwordChanged = new URLSearchParams(window.location.search).get('senha') === 'atualizada';
      showLogin(passwordChanged ? 'Senha atualizada. Entre com a nova senha.' : undefined);
    }
    return;
  }

  if (recoveryRoute && (callbackError || !hasRecovery(session.user.id))) {
    view('Link indisponível', 'Solicite um novo link de recuperação.', { allowReturn: true, allowSignOut: true });
    return;
  }

  const { data: { user }, error: userError } = await supabase.auth.getUser(session.access_token);
  if (currentRevision !== revision) return;
  if (userError || !user || user.id !== session.user.id) {
    view('Sessão indisponível', 'Encerre a sessão e tente entrar novamente.', { allowSignOut: true });
    return;
  }

  if (recoveryRoute) {
    view('Crie uma nova senha', 'Use pelo menos 8 caracteres.', { panel: reset, allowSignOut: true });
    return;
  }

  // A recovery session should finish the password change before entering the CMS.
  if (hasRecovery(user.id)) {
    window.location.replace(recoveryPath);
    return;
  }

  const { data: profile, error } = await supabase.from('profiles')
    .select('role, can_publish')
    .eq('id', user.id)
    .maybeSingle();
  if (currentRevision !== revision) return;
  if (error || !roles.has(profile?.role)) {
    const description = error
      ? 'Não foi possível verificar seu perfil. Tente entrar novamente.'
      : 'Sua conta não tem um perfil editorial autorizado. Fale com um administrador.';
    view('Acesso indisponível', description, { allowSignOut: true });
    return;
  }

  const identity = `${user.id}:${profile.role}:${profile.can_publish}`;
  if (editorialPanel && editorialIdentity === identity) return;

  const { mountEditorialPanel } = await import('./panel.js');
  if (currentRevision !== revision) return;
  editorialPanel?.destroy();
  editorialIdentity = identity;
  document.querySelector('#auth-profile').textContent = roles.get(profile.role);
  view('Painel administrativo', '', { panel: signedIn, allowSignOut: true });
  editorialPanel = mountEditorialPanel(document.querySelector('#editorial-panel'), { user, profile });
}

function submit(form, action) {
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const button = form.querySelector('button[type="submit"]');
    button.disabled = true;
    const values = new FormData(form);
    try {
      await action(values);
    } catch {
      message.textContent = 'Não foi possível concluir a solicitação. Tente novamente.';
    } finally {
      button.disabled = false;
    }
  });
}

function startAuth() {
  view('Administração', 'Verificando sessão…');
  supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'PASSWORD_RECOVERY' && recoveryRoute && session && !callbackError) {
      rememberRecovery(session.user.id);
    }
    if (event === 'SIGNED_OUT') rememberRecovery(null);
    if (event === 'USER_UPDATED') return;

    const currentRevision = ++revision;
    setTimeout(() => {
      if (currentRevision !== revision) return;
      resolveAccess(session, currentRevision).catch(() => {
        if (currentRevision === revision) {
          view('Sessão indisponível', 'Não foi possível verificar sua sessão.', { allowSignOut: Boolean(session) });
        }
      });
    }, 0);
  });

  document.querySelector('#forgot-password').addEventListener('click', () => {
    request.elements.email.value = login.elements.email.value;
    view('Recuperar senha', 'Informe o e-mail da sua conta editorial.', { panel: request, focus: true });
  });

  submit(login, async (values) => {
    const { error } = await supabase.auth.signInWithPassword({
      email: values.get('email').trim(),
      password: values.get('password'),
    });
    login.elements.password.value = '';
    if (error) message.textContent = 'Não foi possível entrar. Confira o e-mail e a senha e tente novamente.';
  });

  submit(request, async (values) => {
    const { error } = await supabase.auth.resetPasswordForEmail(values.get('email').trim(), {
      redirectTo: new URL(recoveryPath, window.location.origin).href,
    });
    message.textContent = error?.status === 429
      ? 'Foram feitas muitas tentativas. Aguarde e tente novamente.'
      : 'Se o endereço estiver cadastrado, você receberá um link para redefinir a senha.';
  });

  submit(reset, async (values) => {
    if (values.get('password') !== values.get('confirmation')) {
      message.textContent = 'As senhas precisam ser iguais.';
      return;
    }
    const { error } = await supabase.auth.updateUser({ password: values.get('password') });
    reset.reset();
    if (error) {
      message.textContent = 'Não foi possível salvar a senha. Tente uma senha diferente ou solicite um novo link.';
      return;
    }
    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) {
      view('Senha atualizada', 'Encerre a sessão para entrar com a nova senha.', { allowSignOut: true, focus: true });
      return;
    }
    rememberRecovery(null);
    window.location.replace('/admin?senha=atualizada');
  });

  signOut.addEventListener('click', async () => {
    signOut.disabled = true;
    try {
      const { error } = await supabase.auth.signOut({ scope: 'local' });
      if (error) throw error;
      if (recoveryRoute) window.location.replace('/admin');
    } catch {
      message.textContent = 'Não foi possível sair agora. Tente novamente.';
    } finally {
      signOut.disabled = false;
    }
  });
}

if (supabase) {
  startAuth();
} else {
  view('Painel indisponível', 'A autenticação ainda não foi configurada neste ambiente.');
}

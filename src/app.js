const path = window.location.pathname.replace(/\/$/, '');

if (path === '/admin' || path === '/admin/redefinir-senha') {
  import('./admin/auth.js');
} else {
  import('./main.js');
}

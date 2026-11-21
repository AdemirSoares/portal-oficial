import './admin/auth.css';

const path = window.location.pathname.replace(/\/$/, '');

if (path === '/admin' || path === '/admin/redefinir-senha') {
  document.documentElement.classList.add('admin-page');
  import('./admin/auth.js');
} else {
  import('./main.js');
}

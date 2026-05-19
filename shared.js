(function() {
  const saved = localStorage.getItem('nz_theme');
  if (saved === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
})();

function toggleTheme() {
  const dark = document.body.getAttribute('data-theme') === 'dark';
  if (dark) {
    document.body.removeAttribute('data-theme');
    document.documentElement.removeAttribute('data-theme');
    localStorage.setItem('nz_theme', 'light');
    const icon = document.getElementById('theme-icon');
    if (icon) icon.textContent = '🌙';
  } else {
    document.body.setAttribute('data-theme', 'dark');
    document.documentElement.setAttribute('data-theme', 'dark');
    localStorage.setItem('nz_theme', 'dark');
    const icon = document.getElementById('theme-icon');
    if (icon) icon.textContent = '☀️';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const saved = localStorage.getItem('nz_theme');
  if (saved === 'dark') {
    document.body.setAttribute('data-theme', 'dark');
    const icon = document.getElementById('theme-icon');
    if (icon) icon.textContent = '☀️';
  }
  const path = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-link').forEach(link => {
    const href = link.getAttribute('href');
    if (href === path || (path === '' && href === 'index.html')) link.classList.add('active');
  });
});

let toastTimer;
function showToast(msg) {
  let t = document.getElementById('toast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'toast'; t.className = 'toast';
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 3500);
}

const Auth = {
  isLoggedIn() { return !!localStorage.getItem('nz_user'); },
  getUser() {
    const data = localStorage.getItem('nz_user');
    return data ? JSON.parse(data) : null;
  },
  login(name, email) {
    const user = {
      name: name, email: email,
      joinedAt: new Date().toISOString(),
      plan: 'free',
      trialEndsAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
    };
    localStorage.setItem('nz_user', JSON.stringify(user));
    return user;
  },
  logout() {
    localStorage.removeItem('nz_user');
    window.location.href = 'index.html';
  },
  requireAuth() {
    if (!this.isLoggedIn()) { window.location.href = 'login.html'; return false; }
    return true;
  },
  upgrade() {
    const user = this.getUser();
    if (user) {
      user.plan = 'premium';
      localStorage.setItem('nz_user', JSON.stringify(user));
    }
  }
};

function navTo(page) { window.location.href = page; }

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function getTrialDaysLeft() {
  const user = Auth.getUser();
  if (!user || !user.trialEndsAt) return 0;
  const end = new Date(user.trialEndsAt);
  const now = new Date();
  const diff = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
  return Math.max(0, diff);
}

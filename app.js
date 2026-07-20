/* ============================================================
   PROJECT PILLARS BY LEGENDS — app.js
   SPA Router · Theme Engine · Auth + Phone Gate Integration
   ============================================================ */

import { AuthManager }       from './js/auth.js';
import { PhoneVerification } from './js/phoneVerification.js';

/* ─── Expose globals for inline onclick handlers ────────────── */
window.__AuthManager       = AuthManager;
window.__PhoneVerification = PhoneVerification;

/* ─── THEME ENGINE ─────────────────────────────────────────── */
const ThemeEngine = (() => {
  const MODES   = ['SYSTEM', 'DARKMODE', 'LIGHTMODE'];
  const KEY     = 'pillars_theme';
  let   current = localStorage.getItem(KEY) || 'SYSTEM';
  const icons   = { SYSTEM: '🖥️', DARKMODE: '🌙', LIGHTMODE: '☀️' };

  function apply(mode) {
    const root = document.documentElement;
    root.removeAttribute('data-theme');
    if (mode === 'LIGHTMODE')      root.setAttribute('data-theme', 'light');
    else if (mode === 'DARKMODE')  root.setAttribute('data-theme', 'dark');
    else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
    }
  }

  function cycle() {
    const idx = MODES.indexOf(current);
    current   = MODES[(idx + 1) % MODES.length];
    localStorage.setItem(KEY, current);
    apply(current);
    updateButton();
  }

  function updateButton() {
    const btn = document.getElementById('theme-toggle');
    if (btn) btn.textContent = `${icons[current]} ${current}`;
  }

  function init() {
    apply(current);
    updateButton();
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      if (current === 'SYSTEM') apply('SYSTEM');
    });
  }

  return { init, cycle, updateButton };
})();

window.__ThemeEngine = ThemeEngine;

/* ─── ROUTE LOADER BAR ─────────────────────────────────────── */
const RouteLoader = (() => {
  let el, timer;
  function show() {
    el = el || document.getElementById('route-loader');
    clearTimeout(timer);
    el.classList.add('loading');
    timer = setTimeout(hide, 700);
  }
  function hide() {
    el = el || document.getElementById('route-loader');
    el.classList.remove('loading');
  }
  return { show, hide };
})();

/* ─── SPLASH SCREEN ────────────────────────────────────────── */
const Splash = (() => {
  function show(duration = 2000) {
    const splash = document.getElementById('splash');
    if (!splash) return;
    splash.classList.remove('hidden');
    setTimeout(() => splash.classList.add('hidden'), duration);
  }
  return { show };
})();

/* ─── PROTECTED ROUTES ──────────────────────────────────────── */
// These routes require auth + phone verification
const PROTECTED = ['marketplace', 'news', 'chat'];
// These routes require auth only (no phone needed)
const AUTH_ONLY = ['profile'];

/* ─── ROUTER ───────────────────────────────────────────────── */
const Router = (() => {
  const routes = {};

  function register(hash, fn) { routes[hash] = fn; }

  async function navigate(hash) {
    // Update nav active links
    document.querySelectorAll('[data-nav]').forEach(a => {
      a.classList.toggle('active', a.dataset.nav === hash);
    });

    // ── GATE: Protected routes (auth + phone) ──────────────────
    if (PROTECTED.includes(hash)) {
      await PhoneVerification.gate(hash, () => _renderView(hash));
      return;
    }

    // ── GATE: Auth-only routes ─────────────────────────────────
    if (AUTH_ONLY.includes(hash)) {
      if (!AuthManager.isLoggedIn()) {
        AuthManager.openModal('login');
        AuthManager.onAuthStateChange(user => {
          if (user) _renderView(hash);
        });
        window.showToast?.('Please sign in to view your profile.');
        return;
      }
    }

    _renderView(hash);
  }

  function _renderView(hash) {
    RouteLoader.show();
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    const view = document.getElementById(`view-${hash}`);
    if (view) {
      view.classList.add('active');
      if (routes[hash]) routes[hash]();
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function init() {
    const defaultHash = window.location.hash.replace('#', '') || 'home';
    navigate(defaultHash);
    window.addEventListener('hashchange', () => {
      const hash = window.location.hash.replace('#', '') || 'home';
      navigate(hash);
    });
  }

  return { register, navigate, init };
})();

/* ─── NAVIGATION ───────────────────────────────────────────── */
const Nav = (() => {
  function init() {
    document.querySelectorAll('[data-nav]').forEach(a => {
      a.addEventListener('click', e => {
        e.preventDefault();
        const hash = a.dataset.nav;
        window.location.hash = hash;
        closeMobileNav();
      });
    });

    const ham       = document.getElementById('hamburger');
    const mobileNav = document.getElementById('mobile-nav');
    ham?.addEventListener('click', () => {
      ham.classList.toggle('open');
      mobileNav.classList.toggle('open');
    });

    document.getElementById('theme-toggle')?.addEventListener('click', () => ThemeEngine.cycle());
  }

  function closeMobileNav() {
    document.getElementById('hamburger')?.classList.remove('open');
    document.getElementById('mobile-nav')?.classList.remove('open');
  }

  return { init };
})();

/* ─── GATE BANNER helpers ───────────────────────────────────── */
function showGate(gateId, contentId) {
  document.getElementById(gateId).style.display   = 'flex';
  document.getElementById(contentId).style.display = 'none';
}
function hideGate(gateId, contentId) {
  document.getElementById(gateId).style.display   = 'none';
  document.getElementById(contentId).style.display = 'block';
}

/* ─── HOME VIEW ─────────────────────────────────────────────── */
function initHome() {
  // Show/hide auth CTA
  const cta = document.getElementById('auth-cta-block');
  if (cta) cta.style.display = AuthManager.isLoggedIn() ? 'none' : 'flex';

  // Animate stat counters
  document.querySelectorAll('#view-home .stat-num[data-target]').forEach(el => {
    const target = parseInt(el.dataset.target, 10);
    let   count  = 0;
    const step   = Math.ceil(target / 60);
    const iv     = setInterval(() => {
      count = Math.min(count + step, target);
      el.textContent = el.dataset.suffix
        ? count.toLocaleString() + el.dataset.suffix
        : count.toLocaleString() + (el.dataset.plus ? '+' : '');
      if (count >= target) clearInterval(iv);
    }, 22);
  });
}

/* ─── MARKETPLACE VIEW ──────────────────────────────────────── */
const PRODUCTS = [
  { emoji: '⚔️',  name: 'Legend Blade Skin',    cat: 'WEAPONS',     price: '2,500' },
  { emoji: '🛡️',  name: 'Emerald Shield Pack',   cat: 'ARMOR',       price: '1,800' },
  { emoji: '🏆',  name: 'Champion Trophy NFT',   cat: 'COLLECTIBLE', price: '5,000' },
  { emoji: '💎',  name: 'Diamond Access Pass',   cat: 'MEMBERSHIP',  price: '9,999' },
  { emoji: '🎯',  name: 'Precision Strike Kit',  cat: 'WEAPONS',     price: '3,200' },
  { emoji: '🌿',  name: 'Nature God Bundle',     cat: 'BUNDLE',      price: '7,500' },
  { emoji: '🔮',  name: 'Mystic Orb Charm',      cat: 'COLLECTIBLE', price: '1,200' },
  { emoji: '👑',  name: 'Legends Crown Title',   cat: 'MEMBERSHIP',  price: '15,000' },
];

function initMarketplace() {
  renderProducts('ALL');
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderProducts(btn.dataset.filter);
    });
  });
}

function renderProducts(filter) {
  const grid = document.getElementById('products-grid');
  if (!grid) return;
  const items = filter === 'ALL' ? PRODUCTS : PRODUCTS.filter(p => p.cat === filter);
  grid.innerHTML = items.map(p => `
    <div class="glass-card product-card">
      <div class="product-img">${p.emoji}</div>
      <div class="product-body">
        <div class="product-category">${p.cat}</div>
        <div class="product-name">${p.name}</div>
        <div class="product-footer">
          <span class="product-price">${p.price} <small style="font-size:0.55em;color:var(--em-600);font-weight:700">PLC</small></span>
          <button class="btn btn-glass" style="padding:7px 14px;font-size:0.75rem" onclick="showToast('Added to cart!')">BUY</button>
        </div>
      </div>
    </div>
  `).join('');
}

/* ─── NEWS VIEW ─────────────────────────────────────────────── */
const NEWS = [
  { day: '18', month: 'JUL', tag: 'UPDATE',   title: 'Phase 2 Live — Auth & Phone Verification!',        excerpt: 'Supabase authentication, Google OAuth, and mandatory phone verification are now live across the Pillars ecosystem. Security first.' },
  { day: '12', month: 'JUL', tag: 'FEATURE',  title: 'Live Chat System Introduced',                      excerpt: 'Real-time communication is now available across all Legend tiers. Connect, share strategies, and form alliances.' },
  { day: '05', month: 'JUL', tag: 'EVENT',    title: "Champion's Tournament Season 1 Begins",            excerpt: 'The first Pillars tournament kicks off with 1,000,000 PLC in prizes. Register your squad and compete for the Champion Crown.' },
  { day: '28', month: 'JUN', tag: 'ECONOMY',  title: 'Pillars Coin (PLC) Tokenomics Revealed',          excerpt: 'Full PLC tokenomics whitepaper published. Read how the in-game economy rewards skill, loyalty, and community.' },
  { day: '20', month: 'JUN', tag: 'ROADMAP',  title: 'Phase 3 Teaser — Guilds & Land Ownership',        excerpt: 'Phase 3 introduces guild systems, land NFTs, and governance voting. The Legends ecosystem is just getting started.' },
];

function initNews() {
  const list = document.getElementById('news-list');
  if (!list) return;
  list.innerHTML = NEWS.map(n => `
    <article class="glass-card news-card">
      <div class="news-date-box">
        <span class="news-day">${n.day}</span>
        <span class="news-month">${n.month}</span>
      </div>
      <div>
        <span class="news-tag">${n.tag}</span>
        <h3 class="news-title">${n.title}</h3>
        <p class="news-excerpt">${n.excerpt}</p>
      </div>
    </article>
  `).join('');
}

/* ─── CHAT VIEW ─────────────────────────────────────────────── */
const INITIAL_CHAT = [
  { self: false, user: 'LG', name: 'LegendGod',     text: 'Welcome to Pillars Community Chat! Do simple things repeatedly... 🏛️' },
  { self: false, user: 'PX', name: 'PixelKnight',   text: 'Phase 2 is live! Auth + phone verification working perfectly.' },
  { self: false, user: 'EQ', name: 'EmeraldQueen',  text: 'Already grabbed the Champion Trophy NFT 🏆 Security feels solid.' },
];
const REPLIES = [
  'Welcome, Legend! The grind never stops 💪',
  "That's what I'm talking about. Do simple things repeatedly!",
  'Building together is how we rise. Respect! 🏛️',
  'Legendary mindset right there 🔥',
  'Phase 3 guilds are going to be massive. Stay ready.',
];

function initChat() {
  const container = document.getElementById('chat-messages');
  if (!container) return;

  const user     = AuthManager.getCurrentUser();
  const initials = user ? (user.email || 'L').charAt(0).toUpperCase() : 'ME';

  container.innerHTML = INITIAL_CHAT.map(m => `
    <div class="chat-msg ${m.self ? 'self' : ''}">
      <div class="chat-avatar">${m.user}</div>
      <div>
        <div style="font-size:0.72rem;color:var(--em-500);margin-bottom:4px;${m.self ? 'text-align:right' : ''}">${m.name}</div>
        <div class="chat-bubble">${m.text}</div>
      </div>
    </div>
  `).join('');

  container.scrollTop = container.scrollHeight;

  const input   = document.getElementById('chat-input');
  const sendBtn = document.getElementById('chat-send');

  function sendMessage() {
    const text = input.value.trim();
    if (!text) return;
    const msg = document.createElement('div');
    msg.className = 'chat-msg self';
    msg.innerHTML = `
      <div class="chat-avatar">${initials}</div>
      <div>
        <div style="font-size:0.72rem;color:var(--em-500);margin-bottom:4px;text-align:right">You</div>
        <div class="chat-bubble">${text}</div>
      </div>`;
    container.appendChild(msg);
    input.value = '';
    container.scrollTop = container.scrollHeight;

    setTimeout(() => {
      const reply = document.createElement('div');
      reply.className = 'chat-msg';
      reply.innerHTML = `
        <div class="chat-avatar">LG</div>
        <div>
          <div style="font-size:0.72rem;color:var(--em-500);margin-bottom:4px">LegendGod</div>
          <div class="chat-bubble">${REPLIES[Math.floor(Math.random() * REPLIES.length)]}</div>
        </div>`;
      container.appendChild(reply);
      container.scrollTop = container.scrollHeight;
    }, 1200 + Math.random() * 800);
  }

  sendBtn.addEventListener('click', sendMessage);
  input.addEventListener('keydown', e => { if (e.key === 'Enter') sendMessage(); });
}

/* ─── PROFILE VIEW ──────────────────────────────────────────── */
async function initProfile() {
  const user = AuthManager.getCurrentUser();
  if (!user) {
    showGate('profile-gate', 'profile-content');
    return;
  }
  hideGate('profile-gate', 'profile-content');

  const email    = user.email || '';
  const initials = email.charAt(0).toUpperCase();
  const created  = new Date(user.created_at || Date.now()).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  document.getElementById('profile-avatar-initials').textContent = initials;
  document.getElementById('profile-display-name').textContent    = email.split('@')[0] || 'Legend';
  document.getElementById('profile-email-display').textContent   = `@${email.split('@')[0]} · Tier: GOLD`;
  document.getElementById('profile-email-val').textContent       = email;
  document.getElementById('profile-created-at').textContent      = created;

  // Phone verification status
  const verified = PhoneVerification.isVerified();
  const phoneStatusEl      = document.getElementById('profile-phone-status');
  const phoneAchievementEl = document.getElementById('profile-phone-achievement');

  if (verified) {
    phoneStatusEl.textContent      = '✅ Verified';
    phoneStatusEl.style.color      = 'var(--em-400)';
    phoneAchievementEl.textContent = 'Unlocked';
    phoneAchievementEl.style.color = 'var(--em-400)';
    phoneAchievementEl.style.opacity = '1';
  } else {
    phoneStatusEl.innerHTML = `⏳ Not Verified &nbsp;<button onclick="window.__PhoneVerification?.openPhoneModal()" style="background:none;border:1px solid var(--glass-border);padding:3px 10px;border-radius:5px;color:var(--em-400);font-size:0.75rem;font-weight:700;cursor:pointer;font-family:inherit">Verify Now</button>`;
  }
}

/* ─── TOAST NOTIFICATION ────────────────────────────────────── */
window.showToast = function(message) {
  document.querySelector('.toast')?.remove();
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  Object.assign(toast.style, {
    position: 'fixed', bottom: '28px', right: '24px', zIndex: '9000',
    padding: '12px 22px',
    background: 'rgba(6,26,18,0.92)',
    backdropFilter: 'blur(12px)',
    border: '1px solid rgba(16,185,129,0.5)',
    borderRadius: '8px',
    color: '#6ee7b7',
    fontSize: '0.88rem',
    fontWeight: '600',
    fontFamily: 'inherit',
    boxShadow: '0 8px 32px rgba(16,185,129,0.2)',
    animation: 'toastIn 0.3s ease forwards',
  });
  if (!document.querySelector('#toast-style')) {
    const s = document.createElement('style');
    s.id = 'toast-style';
    s.textContent = `
      @keyframes toastIn  { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
      @keyframes toastOut { from { opacity:1; transform:translateY(0); } to { opacity:0; transform:translateY(12px); } }
    `;
    document.head.appendChild(s);
  }
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = 'toastOut 0.3s ease forwards';
    setTimeout(() => toast.remove(), 300);
  }, 2800);
};

/* ─── PASSWORD TOGGLE ───────────────────────────────────────── */
function bindPasswordToggles() {
  document.querySelectorAll('.pw-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const input = document.getElementById(btn.dataset.target);
      if (!input) return;
      input.type = input.type === 'password' ? 'text' : 'password';
      btn.textContent = input.type === 'password' ? '👁' : '🙈';
    });
  });
}

/* ─── APP INIT ──────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', async () => {
  // 1. Theme
  ThemeEngine.init();

  // 2. Nav
  Nav.init();
  bindPasswordToggles();

  // 3. Register routes early so router is always ready
  Router.register('home',        initHome);
  Router.register('marketplace', initMarketplace);
  Router.register('news',        initNews);
  Router.register('chat',        initChat);
  Router.register('profile',     initProfile);

  // 4. Splash — always hides after 1800ms no matter what
  Splash.show(1800);

  // 5. Init Auth + Phone with a hard 3s timeout so we never get stuck
  const withTimeout = (promise, ms) =>
    Promise.race([promise, new Promise(res => setTimeout(res, ms))]);

  try { await withTimeout(AuthManager.init(), 3000); }
  catch (e) { console.warn('Auth init failed, continuing anyway:', e); }

  try { await withTimeout(PhoneVerification.init(), 3000); }
  catch (e) { console.warn('Phone init failed, continuing anyway:', e); }

  // 6. Start router — always fires, splash will have hidden by now
  setTimeout(() => Router.init(), 250);

  // 7. Re-render home when auth state changes (show/hide CTA)
  AuthManager.onAuthStateChange(() => {
    const cta = document.getElementById('auth-cta-block');
    if (cta) cta.style.display = AuthManager.isLoggedIn() ? 'none' : 'flex';
    if (window.location.hash === '#profile') initProfile();
  });
});

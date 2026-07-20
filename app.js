/* ============================================================
   PROJECT PILLARS BY LEGENDS — app.js
   Vanilla JS Modules · SPA Router · Theme Engine
   ============================================================ */

/* ─── THEME ENGINE ─────────────────────────────────────────── */
const ThemeEngine = (() => {
  const MODES = ['SYSTEM', 'DARKMODE', 'LIGHTMODE'];
  const KEY   = 'pillars_theme';
  let   current = localStorage.getItem(KEY) || 'SYSTEM';

  const icons = { SYSTEM: '🖥️', DARKMODE: '🌙', LIGHTMODE: '☀️' };

  function apply(mode) {
    const root = document.documentElement;
    root.removeAttribute('data-theme');

    if (mode === 'LIGHTMODE') {
      root.setAttribute('data-theme', 'light');
    } else if (mode === 'DARKMODE') {
      root.setAttribute('data-theme', 'dark');
    } else {
      // SYSTEM — respect prefers-color-scheme
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
    }
  }

  function cycle() {
    const idx = MODES.indexOf(current);
    current = MODES[(idx + 1) % MODES.length];
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
    // Watch system preference changes when in SYSTEM mode
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      if (current === 'SYSTEM') apply('SYSTEM');
    });
  }

  return { init, cycle, updateButton };
})();

/* ─── ROUTE LOADER BAR ─────────────────────────────────────── */
const RouteLoader = (() => {
  let el;
  let timer;
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
  function hide() {
    const splash = document.getElementById('splash');
    if (splash) splash.classList.add('hidden');
  }
  return { show, hide };
})();

/* ─── ROUTER ───────────────────────────────────────────────── */
const Router = (() => {
  const routes = {};
  let currentView = null;

  function register(hash, fn) { routes[hash] = fn; }

  function navigate(hash) {
    // Update nav active state
    document.querySelectorAll('[data-nav]').forEach(a => {
      a.classList.toggle('active', a.dataset.nav === hash);
    });

    // Show route loader
    RouteLoader.show();

    // Swap view
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    const view = document.getElementById(`view-${hash}`);
    if (view) {
      view.classList.add('active');
      if (routes[hash]) routes[hash]();
    }

    currentView = hash;
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
    // Desktop nav links
    document.querySelectorAll('[data-nav]').forEach(a => {
      a.addEventListener('click', e => {
        e.preventDefault();
        const hash = a.dataset.nav;
        window.location.hash = hash;
        // Close mobile nav
        closeMobileNav();
      });
    });

    // Hamburger toggle
    const ham = document.getElementById('hamburger');
    const mobileNav = document.getElementById('mobile-nav');
    if (ham && mobileNav) {
      ham.addEventListener('click', () => {
        ham.classList.toggle('open');
        mobileNav.classList.toggle('open');
      });
    }

    // Theme toggle
    const themeBtn = document.getElementById('theme-toggle');
    if (themeBtn) themeBtn.addEventListener('click', () => ThemeEngine.cycle());
  }

  function closeMobileNav() {
    document.getElementById('hamburger')?.classList.remove('open');
    document.getElementById('mobile-nav')?.classList.remove('open');
  }

  return { init };
})();

/* ─── VIEWS ────────────────────────────────────────────────── */

// --- HOME ---
function initHome() {
  // Animate stat numbers
  document.querySelectorAll('#view-home .stat-num[data-target]').forEach(el => {
    const target = parseInt(el.dataset.target, 10);
    let current = 0;
    const step = Math.ceil(target / 60);
    const interval = setInterval(() => {
      current = Math.min(current + step, target);
      el.textContent = el.dataset.suffix
        ? current.toLocaleString() + el.dataset.suffix
        : current.toLocaleString() + (el.dataset.plus ? '+' : '');
      if (current >= target) clearInterval(interval);
    }, 22);
  });
}

// --- MARKETPLACE ---
const PRODUCTS = [
  { emoji: '⚔️',  name: 'Legend Blade Skin',   cat: 'WEAPONS',    price: '2,500' },
  { emoji: '🛡️',  name: 'Emerald Shield Pack',  cat: 'ARMOR',      price: '1,800' },
  { emoji: '🏆',  name: 'Champion Trophy NFT',  cat: 'COLLECTIBLE', price: '5,000' },
  { emoji: '💎',  name: 'Diamond Access Pass',  cat: 'MEMBERSHIP', price: '9,999' },
  { emoji: '🎯',  name: 'Precision Strike Kit', cat: 'WEAPONS',    price: '3,200' },
  { emoji: '🌿',  name: 'Nature God Bundle',    cat: 'BUNDLE',     price: '7,500' },
  { emoji: '🔮',  name: 'Mystic Orb Charm',     cat: 'COLLECTIBLE', price: '1,200' },
  { emoji: '👑',  name: 'Legends Crown Title',  cat: 'MEMBERSHIP', price: '15,000' },
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

// --- NEWS ---
const NEWS = [
  { day: '18', month: 'JUL', tag: 'UPDATE', title: 'Phase 1 Launch — Pillars Goes Live!', excerpt: 'The long-awaited Phase 1 of Project Pillars is now officially live. Explore the Marketplace, connect with Legends, and start building your empire.' },
  { day: '12', month: 'JUL', tag: 'FEATURE', title: 'Live Chat System Introduced', excerpt: 'Real-time communication is now available across all Legend tiers. Connect with the community, share strategies, and form alliances.' },
  { day: '05', month: 'JUL', tag: 'EVENT', title: 'Champion\'s Tournament Season 1 Begins', excerpt: 'The first-ever Pillars tournament kicks off with 1,000,000 PLC in prizes. Register your squad and compete for the Champion Crown.' },
  { day: '28', month: 'JUN', tag: 'ECONOMY', title: 'Pillars Coin (PLC) Tokenomics Revealed', excerpt: 'Our team has published the full PLC tokenomics whitepaper. Read how the in-game economy rewards skill, loyalty, and community participation.' },
  { day: '20', month: 'JUN', tag: 'ROADMAP', title: 'Phase 2 Teaser — Guilds & Land Ownership', excerpt: 'Phase 2 will introduce guild systems, land NFTs, and governance voting. The Legends ecosystem is just getting started.' },
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

// --- CHAT ---
const CHAT_MESSAGES = [
  { self: false, user: 'LG', name: 'LegendGod', text: 'Welcome to Pillars Community Chat! Do simple things repeatedly... 🏛️' },
  { self: false, user: 'PX', name: 'PixelKnight', text: 'Phase 1 is finally live! This has been a long time coming.' },
  { self: true,  user: 'ME', name: 'You', text: 'Excited to be part of the Legends community! Ready to build.' },
  { self: false, user: 'EQ', name: 'EmeraldQueen', text: 'The marketplace is stacked. Already grabbed the Champion Trophy NFT 🏆' },
];

function initChat() {
  const container = document.getElementById('chat-messages');
  if (!container) return;

  container.innerHTML = CHAT_MESSAGES.map(m => `
    <div class="chat-msg ${m.self ? 'self' : ''}">
      <div class="chat-avatar">${m.user}</div>
      <div>
        <div style="font-size:0.72rem;color:var(--em-500);margin-bottom:4px;${m.self ? 'text-align:right' : ''}">${m.name}</div>
        <div class="chat-bubble">${m.text}</div>
      </div>
    </div>
  `).join('');

  container.scrollTop = container.scrollHeight;

  const input = document.getElementById('chat-input');
  const sendBtn = document.getElementById('chat-send');

  function sendMessage() {
    const text = input.value.trim();
    if (!text) return;
    const msg = document.createElement('div');
    msg.className = 'chat-msg self';
    msg.innerHTML = `
      <div class="chat-avatar">ME</div>
      <div>
        <div style="font-size:0.72rem;color:var(--em-500);margin-bottom:4px;text-align:right">You</div>
        <div class="chat-bubble">${text}</div>
      </div>
    `;
    container.appendChild(msg);
    input.value = '';
    container.scrollTop = container.scrollHeight;

    // Simulated reply
    setTimeout(() => {
      const replies = [
        'Welcome, Legend! The grind never stops 💪',
        'That\'s what I\'m talking about. Do simple things repeatedly!',
        'Building together is how we rise. Respect! 🏛️',
        'Legendary mindset right there 🔥',
      ];
      const reply = document.createElement('div');
      reply.className = 'chat-msg';
      reply.innerHTML = `
        <div class="chat-avatar">LG</div>
        <div>
          <div style="font-size:0.72rem;color:var(--em-500);margin-bottom:4px">LegendGod</div>
          <div class="chat-bubble">${replies[Math.floor(Math.random() * replies.length)]}</div>
        </div>
      `;
      container.appendChild(reply);
      container.scrollTop = container.scrollHeight;
    }, 1200 + Math.random() * 800);
  }

  sendBtn.addEventListener('click', sendMessage);
  input.addEventListener('keydown', e => { if (e.key === 'Enter') sendMessage(); });
}

// --- PROFILE ---
function initProfile() {
  // Profile is static markup, nothing dynamic needed for Phase 1
}

/* ─── TOAST NOTIFICATION ───────────────────────────────────── */
function showToast(message) {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  toast.style.cssText = `
    position: fixed;
    bottom: 28px;
    right: 24px;
    z-index: 9000;
    padding: 12px 22px;
    background: rgba(6,26,18,0.9);
    backdrop-filter: blur(12px);
    border: 1px solid rgba(16,185,129,0.5);
    border-radius: 8px;
    color: #6ee7b7;
    font-size: 0.88rem;
    font-weight: 600;
    box-shadow: 0 8px 32px rgba(16,185,129,0.2);
    animation: toastIn 0.3s ease forwards;
  `;

  const style = document.createElement('style');
  style.textContent = `
    @keyframes toastIn { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
    @keyframes toastOut { from { opacity:1; transform:translateY(0); } to { opacity:0; transform:translateY(12px); } }
  `;
  document.head.appendChild(style);
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = 'toastOut 0.3s ease forwards';
    setTimeout(() => toast.remove(), 300);
  }, 2400);
}

/* ─── APP INIT ─────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  // Theme
  ThemeEngine.init();

  // Nav
  Nav.init();

  // Register routes
  Router.register('home',        initHome);
  Router.register('marketplace', initMarketplace);
  Router.register('news',        initNews);
  Router.register('chat',        initChat);
  Router.register('profile',     initProfile);

  // Splash screen (1.8s on first load)
  Splash.show(1800);

  // Init router after splash
  setTimeout(() => Router.init(), 200);
});

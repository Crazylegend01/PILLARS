/* ============================================================
   PROJECT PILLARS BY LEGENDS — app.js
   SPA Router · Theme Engine · Auth + Phone Gate Integration
   ============================================================ */

import { AuthManager }       from './js/auth.js';
import { PhoneVerification } from './js/phoneVerification.js';
import { AdminPanel }        from './js/admin.js';
import { ProfileManager }    from './js/profile.js';

/* ─── Expose globals for inline onclick handlers ────────────── */
window.__AuthManager       = AuthManager;
window.__PhoneVerification = PhoneVerification;
window.__AdminPanel        = AdminPanel;
window.__ProfileManager    = ProfileManager;

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
// These routes require auth + phone registration
const PROTECTED  = ['marketplace', 'news', 'chat'];
// These routes require auth only (no phone needed)
const AUTH_ONLY  = ['profile'];
// These routes require admin/superadmin/subadmin role
const ADMIN_ONLY = ['admin'];

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

    // ── GATE: Admin-only routes ────────────────────────────────
    if (ADMIN_ONLY.includes(hash)) {
      if (!AuthManager.isLoggedIn()) {
        AuthManager.openModal('login');
        window.showToast?.('Admin access requires sign in.');
        return;
      }
      // Role check happens inside initAdmin
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
// Marketplace listings are loaded from the database.
// PRODUCTS is empty until real sellers post listings.
const PRODUCTS = [];

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
  if (!items.length) {
    grid.innerHTML = `
      <div style="grid-column:1/-1;text-align:center;padding:60px 20px;">
        <div style="font-size:3rem;margin-bottom:16px;">🛒</div>
        <div style="font-size:1.1rem;font-weight:700;color:var(--text-primary);margin-bottom:8px;">No listings yet</div>
        <div style="font-size:0.9rem;color:var(--text-muted);">Switch to Seller mode and be the first to list an item.</div>
      </div>`;
    return;
  }
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
  { day: '29', month: 'JUL', tag: 'UPDATE',   title: 'Profile Setup & Buyer/Seller Modes Now Live!',    excerpt: 'Legends can now build a full profile — avatar, display name, profile tag, business name, and social links. Switch between Buyer and Seller mode anytime.' },
  { day: '18', month: 'JUL', tag: 'FEATURE',  title: 'Authentication & Phone Registration Live',        excerpt: 'Supabase authentication, Google OAuth, and phone registration are now live across the Pillars ecosystem. Security-first, always.' },
  { day: '12', month: 'JUL', tag: 'FEATURE',  title: 'Live Chat System Introduced',                    excerpt: 'Real-time communication is now available across all Legend tiers. Connect, share strategies, and form alliances.' },
  { day: '05', month: 'JUL', tag: 'COMMUNITY', title: 'Welcome to Pillars — Community Now Open',        excerpt: 'The Pillars community is officially open. Sign up, complete your profile, and connect with fellow Legends in real-time chat.' },
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
  { self: false, user: 'PX', name: 'PixelKnight',   text: 'Just set up my profile and switched to Seller mode — marketplace is looking 🔥' },
  { self: false, user: 'EQ', name: 'EmeraldQueen',  text: 'Profile is set up, marketplace is open — this ecosystem is built different. 🏛️' },
];
const REPLIES = [
  'Welcome, Legend! The grind never stops 💪',
  "That's what I'm talking about. Do simple things repeatedly!",
  'Building together is how we rise. Respect! 🏛️',
  'Legendary mindset right there 🔥',
  'The community is just getting started. Big things ahead. 🏛️',
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

  // Fetch latest profile
  const profile = await ProfileManager.fetchProfile();
  const email   = user.email || '';
  const created = new Date(user.created_at || Date.now()).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  // Avatar
  const avatarEl    = document.getElementById('profile-avatar-initials');
  const avatarImgEl = document.getElementById('profile-avatar-img');
  const displayName = profile?.display_name || email.split('@')[0] || 'Legend';
  const tag         = profile?.profile_tag  ? '@' + profile.profile_tag : '@' + email.split('@')[0];

  if (avatarEl)    avatarEl.textContent = displayName.charAt(0).toUpperCase();
  if (avatarImgEl && profile?.avatar_url) {
    avatarImgEl.src             = profile.avatar_url;
    avatarImgEl.style.display   = 'block';
    if (avatarEl) avatarEl.style.display = 'none';
  }

  document.getElementById('profile-display-name').textContent  = displayName;
  document.getElementById('profile-email-display').textContent = `${tag} · ${profile?.legend_tier || 'BRONZE'}`;
  document.getElementById('profile-email-val').textContent     = email;
  document.getElementById('profile-created-at').textContent    = created;

  // Mode badge
  const modeBadge = document.getElementById('profile-mode-badge');
  if (modeBadge) {
    const isSeller      = ProfileManager.getMode() === 'SELLER';
    modeBadge.textContent = isSeller ? '🛒 SELLER MODE' : '🛍️ BUYER MODE';
    modeBadge.className   = `mode-badge ${isSeller ? 'mode-badge-seller' : 'mode-badge-buyer'}`;
  }

  // Business name row
  const bnEl = document.getElementById('profile-business-name-val');
  if (bnEl) bnEl.textContent = profile?.business_name || '—';

  // Profile tag row
  const tagEl = document.getElementById('profile-tag-val');
  if (tagEl)  tagEl.textContent = profile?.profile_tag ? '@' + profile.profile_tag : '—';

  // Language row
  const langEl = document.getElementById('profile-language-val');
  if (langEl) langEl.textContent = profile?.language || 'en';

  // Phone verification status
  const verified       = PhoneVerification.isVerified();
  const phoneStatusEl  = document.getElementById('profile-phone-status');
  const phoneAchEl     = document.getElementById('profile-phone-achievement');

  if (verified) {
    if (phoneStatusEl) { phoneStatusEl.textContent = '✅ Registered'; phoneStatusEl.style.color = 'var(--em-400)'; }
    if (phoneAchEl)    { phoneAchEl.textContent = 'Unlocked'; phoneAchEl.style.color = 'var(--em-400)'; phoneAchEl.style.opacity = '1'; }
  } else {
    if (phoneStatusEl) phoneStatusEl.innerHTML = `⏳ Pending &nbsp;<button onclick="window.__PhoneVerification?.openPhoneModal()" style="background:none;border:1px solid var(--glass-border);padding:3px 10px;border-radius:5px;color:var(--em-400);font-size:0.75rem;font-weight:700;cursor:pointer;font-family:inherit">Register</button>`;
  }

  // Social links
  const socialEl = document.getElementById('profile-social-links');
  if (socialEl) {
    const links = profile?.social_links || [];
    if (links.length) {
      socialEl.innerHTML = links.map(l =>
        `<a href="${l.url}" target="_blank" rel="noopener" class="profile-social-link">${l.platform}</a>`
      ).join('');
    } else {
      socialEl.innerHTML = '<span style="color:var(--text-muted);font-size:0.85rem;">No social links added.</span>';
    }
  }
}

window.__refreshProfile = initProfile;

/* ─── ADMIN VIEW ────────────────────────────────────────────── */
let _allUsers = [];

async function initAdmin() {
  const role = await AdminPanel.init();

  const gate    = document.getElementById('admin-gate');
  const content = document.getElementById('admin-content');

  if (!AdminPanel.hasAccess()) {
    gate.style.display    = 'flex';
    content.style.display = 'none';
    return;
  }

  gate.style.display    = 'none';
  content.style.display = 'block';

  // Badge
  const badge = document.getElementById('admin-role-badge');
  const labels = { superadmin: '👑 SUPER ADMIN', admin: '🛡️ ADMIN', subadmin: '⚙️ SUB-ADMIN' };
  if (badge) badge.textContent = labels[role] || role;

  // Tab switching
  document.querySelectorAll('.admin-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.admin-panel-tab').forEach(t => t.style.display = 'none');
      btn.classList.add('active');
      document.getElementById(`admin-tab-${btn.dataset.admintab}`).style.display = 'block';
      if (btn.dataset.admintab === 'announcements') window.__AdminPanel_loadAnnouncements();
    });
  });

  // Hide post form for subadmin (they can post but not manage)
  // Actually subadmins CAN post, so keep form visible

  // Load users
  window.__AdminPanel_loadUsers();
}

window.__AdminPanel_loadUsers = async function() {
  const wrap = document.getElementById('admin-users-table');
  const statsRow = document.getElementById('admin-stats-row');
  wrap.innerHTML = '<div class="admin-loading">Loading users…</div>';
  try {
    _allUsers = await AdminPanel.loadUsers();
    _renderUsersTable(_allUsers);

    // Stats
    const total   = _allUsers.length;
    const banned  = _allUsers.filter(u => u.is_banned).length;
    const admins  = _allUsers.filter(u => ['superadmin','admin','subadmin'].includes(u.role)).length;
    const verified = _allUsers.filter(u => u.phone_verified).length;
    statsRow.innerHTML = `
      <div class="admin-stat-card"><div class="admin-stat-num">${total}</div><div class="admin-stat-lbl">Total Users</div></div>
      <div class="admin-stat-card"><div class="admin-stat-num">${verified}</div><div class="admin-stat-lbl">Phone Verified</div></div>
      <div class="admin-stat-card"><div class="admin-stat-num">${admins}</div><div class="admin-stat-lbl">Staff</div></div>
      <div class="admin-stat-card admin-stat-danger"><div class="admin-stat-num">${banned}</div><div class="admin-stat-lbl">Banned</div></div>
    `;
  } catch(e) {
    wrap.innerHTML = `<div class="admin-loading" style="color:#f87171;">Error loading users: ${e.message}</div>`;
  }
};

window.__AdminPanel_filterUsers = function(query) {
  const q = query.toLowerCase();
  const filtered = _allUsers.filter(u =>
    (u.display_name || '').toLowerCase().includes(q) ||
    (u.phone_number || '').includes(q)
  );
  _renderUsersTable(filtered);
};

function _renderUsersTable(users) {
  const wrap    = document.getElementById('admin-users-table');
  const myRole  = AdminPanel.getRole();
  const roleOrder = { superadmin: 4, admin: 3, subadmin: 2, user: 1 };

  if (!users.length) {
    wrap.innerHTML = '<div class="admin-loading">No users found.</div>';
    return;
  }

  const roleOpts = (u) => {
    const opts = ['user', 'subadmin', 'admin', 'superadmin'];
    return opts
      .filter(r => {
        if (myRole === 'admin' && r === 'superadmin') return false; // admin can't set superadmin
        return true;
      })
      .map(r => `<option value="${r}" ${u.role === r ? 'selected' : ''}>${r}</option>`)
      .join('');
  };

  const rows = users.map(u => {
    const banBtn = AdminPanel.canBan()
      ? `<button class="admin-action-btn ${u.is_banned ? 'btn-unban' : 'btn-ban'}"
           onclick="window.__AdminPanel_toggleBan('${u.id}', ${u.is_banned})">
           ${u.is_banned ? '✅ Unban' : '🚫 Ban'}
         </button>`
      : '';

    const roleSelect = AdminPanel.canPromote()
      ? `<select class="admin-role-select" onchange="window.__AdminPanel_changeRole('${u.id}', this.value)">
           ${roleOpts(u)}
         </select>`
      : `<span class="admin-role-tag role-${u.role}">${u.role}</span>`;

    return `
      <tr class="${u.is_banned ? 'row-banned' : ''}">
        <td>
          <div class="admin-user-cell">
            <div class="admin-user-avatar">${(u.display_name || '?').charAt(0).toUpperCase()}</div>
            <div>
              <div class="admin-user-name">${u.display_name || '—'}</div>
              <div class="admin-user-meta">${u.phone_verified ? '✅ Verified' : '⏳ Unverified'} · ${u.legend_tier || 'BRONZE'}</div>
            </div>
          </div>
        </td>
        <td>${u.phone_number || '—'}</td>
        <td>${roleSelect}</td>
        <td>${u.is_banned ? '<span class="badge-banned">BANNED</span>' : '<span class="badge-active">ACTIVE</span>'}</td>
        <td class="admin-actions-cell">${banBtn}</td>
      </tr>`;
  }).join('');

  wrap.innerHTML = `
    <table class="admin-table">
      <thead>
        <tr>
          <th>User</th>
          <th>Phone</th>
          <th>Role</th>
          <th>Status</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;
}

window.__AdminPanel_toggleBan = async function(userId, isBanned) {
  try {
    await AdminPanel.banUser(userId, !isBanned);
    window.showToast?.(!isBanned ? '🚫 User banned.' : '✅ User unbanned.');
    window.__AdminPanel_loadUsers();
  } catch(e) {
    window.showToast?.('Error: ' + e.message);
  }
};

window.__AdminPanel_changeRole = async function(userId, role) {
  try {
    await AdminPanel.setRole(userId, role);
    window.showToast?.(`✅ Role updated to ${role}`);
    window.__AdminPanel_loadUsers();
  } catch(e) {
    window.showToast?.('Error: ' + e.message);
  }
};

window.__AdminPanel_loadAnnouncements = async function() {
  const list = document.getElementById('admin-announcements-list');
  list.innerHTML = '<div class="admin-loading">Loading…</div>';
  try {
    const items = await AdminPanel.loadAnnouncements();
    if (!items.length) { list.innerHTML = '<div class="admin-loading">No announcements yet.</div>'; return; }
    const catIcon = { general:'📢', update:'🚀', event:'🎉', warning:'⚠️' };
    list.innerHTML = items.map(a => `
      <div class="glass-card admin-ann-card">
        <div class="admin-ann-header">
          <span class="admin-ann-cat">${catIcon[a.category] || '📢'} ${a.category.toUpperCase()}</span>
          <span class="admin-ann-date">${new Date(a.created_at).toLocaleDateString()}</span>
          ${AdminPanel.isAdmin() ? `<button class="admin-ann-del" onclick="window.__AdminPanel_deleteAnn('${a.id}')">🗑</button>` : ''}
        </div>
        <div class="admin-ann-title">${a.title}</div>
        <div class="admin-ann-body">${a.body}</div>
      </div>`).join('');
  } catch(e) {
    list.innerHTML = `<div class="admin-loading" style="color:#f87171;">Error: ${e.message}</div>`;
  }
};

window.__AdminPanel_postAnnouncement = async function() {
  const title = document.getElementById('ann-title').value.trim();
  const body  = document.getElementById('ann-body').value.trim();
  const cat   = document.getElementById('ann-category').value;
  if (!title || !body) { window.showToast?.('Title and body are required.'); return; }
  try {
    await AdminPanel.postAnnouncement(title, body, cat);
    document.getElementById('ann-title').value = '';
    document.getElementById('ann-body').value  = '';
    window.showToast?.('📢 Announcement posted!');
    window.__AdminPanel_loadAnnouncements();
  } catch(e) {
    window.showToast?.('Error: ' + e.message);
  }
};

window.__AdminPanel_deleteAnn = async function(id) {
  if (!confirm('Delete this announcement?')) return;
  try {
    await AdminPanel.deleteAnnouncement(id);
    window.showToast?.('🗑 Deleted.');
    window.__AdminPanel_loadAnnouncements();
  } catch(e) {
    window.showToast?.('Error: ' + e.message);
  }
};

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
  Router.register('admin',       initAdmin);

  // 4. Splash — always hides after 1800ms no matter what
  Splash.show(1800);

  // 5. Init Auth + Phone with a hard 3s timeout so we never get stuck
  const withTimeout = (promise, ms) =>
    Promise.race([promise, new Promise(res => setTimeout(res, ms))]);

  try { await withTimeout(AuthManager.init(), 3000); }
  catch (e) { console.warn('Auth init failed, continuing anyway:', e); }

  try { await withTimeout(PhoneVerification.init(), 3000); }
  catch (e) { console.warn('Phone init failed, continuing anyway:', e); }

  try { await withTimeout(ProfileManager.init(), 3000); }
  catch (e) { console.warn('Profile init failed, continuing anyway:', e); }

  // 6. Start router — always fires, splash will have hidden by now
  setTimeout(() => Router.init(), 250);

  // 7. Show/hide admin nav links based on role
  async function _updateAdminNav() {
    const role = await AdminPanel.init();
    const show = ['superadmin','admin','subadmin'].includes(role);
    const desktopLink = document.getElementById('nav-admin-link');
    const mobileLink  = document.getElementById('mobile-nav-admin-link');
    if (desktopLink) desktopLink.style.display = show ? 'block' : 'none';
    if (mobileLink)  mobileLink.style.display  = show ? 'flex'  : 'none';
  }
  _updateAdminNav();

  // 8. Re-render home when auth state changes (show/hide CTA)
  AuthManager.onAuthStateChange(() => {
    const cta = document.getElementById('auth-cta-block');
    if (cta) cta.style.display = AuthManager.isLoggedIn() ? 'none' : 'flex';
    if (window.location.hash === '#profile') initProfile();
    _updateAdminNav();
  });
});

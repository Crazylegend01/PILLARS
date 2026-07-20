/* ============================================================
   PROJECT PILLARS BY LEGENDS — js/auth.js
   Authentication Manager
   · Email + Password Sign Up / Login
   · Google OAuth
   · Session persistence & nav state
   ============================================================ */

import { supabase } from './supabaseClient.js';

/* ─── AUTH MANAGER ─────────────────────────────────────────── */
export const AuthManager = (() => {
  let _user        = null;
  let _listeners   = [];
  let _activeTab   = 'login';   // 'login' | 'signup'

  // ── Notify subscribers ─────────────────────────────────────
  function _emit(user) {
    _user = user;
    _listeners.forEach(fn => fn(user));
    _updateNav(user);
  }

  // ── Nav UI ──────────────────────────────────────────────────
  function _updateNav(user) {
    const container = document.getElementById('nav-auth');
    if (!container) return;

    if (user) {
      const initials = (user.email || 'L').charAt(0).toUpperCase();
      const email    = user.email || 'Legend';
      container.innerHTML = `
        <div class="nav-user">
          <div class="nav-avatar" title="${email}">${initials}</div>
          <span class="nav-user-email">${email}</span>
          <button class="nav-signout-btn" id="nav-signout" aria-label="Sign out">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
          </button>
        </div>`;
      document.getElementById('nav-signout')?.addEventListener('click', signOut);
    } else {
      container.innerHTML = `
        <button class="btn-auth-nav" id="nav-login-btn">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/>
          </svg>
          LOGIN
        </button>`;
      document.getElementById('nav-login-btn')?.addEventListener('click', () => openModal('login'));
    }
  }

  // ── Modal helpers ───────────────────────────────────────────
  function _setError(msg) {
    const el = document.getElementById('auth-error');
    if (el) { el.textContent = msg; el.style.display = msg ? 'block' : 'none'; }
  }

  function _setLoading(loading) {
    const btn = document.getElementById('auth-submit-btn');
    if (btn) {
      btn.disabled    = loading;
      btn.textContent = loading
        ? 'Please wait...'
        : (_activeTab === 'login' ? 'SIGN IN' : 'CREATE ACCOUNT');
    }
    const gBtn = document.getElementById('auth-google-btn');
    if (gBtn) gBtn.disabled = loading;
  }

  function _switchTab(tab) {
    _activeTab = tab;
    _setError('');
    document.querySelectorAll('.auth-tab').forEach(t => {
      t.classList.toggle('active', t.dataset.tab === tab);
    });
    document.getElementById('auth-login-form').style.display  = tab === 'login'  ? 'flex' : 'none';
    document.getElementById('auth-signup-form').style.display = tab === 'signup' ? 'flex' : 'none';
    document.getElementById('auth-modal-title').textContent   =
      tab === 'login' ? 'Welcome Back, Legend' : 'Join the Legends';
  }

  // ── Open / Close Modal ──────────────────────────────────────
  function openModal(tab = 'login') {
    const overlay = document.getElementById('auth-modal-overlay');
    if (!overlay) return;
    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
    _setError('');
    _switchTab(tab);
    // Auto-focus first input
    setTimeout(() => {
      const first = overlay.querySelector('input');
      if (first) first.focus();
    }, 80);
  }

  function closeModal() {
    const overlay = document.getElementById('auth-modal-overlay');
    if (!overlay) return;
    overlay.classList.remove('open');
    document.body.style.overflow = '';
  }

  // ── Email Sign Up ───────────────────────────────────────────
  async function signUpWithEmail(email, password, confirmPassword) {
    _setError('');
    if (!email || !password)          { _setError('Email and password are required.'); return; }
    if (password !== confirmPassword) { _setError('Passwords do not match.'); return; }
    if (password.length < 8)          { _setError('Password must be at least 8 characters.'); return; }

    _setLoading(true);
    const { data, error } = await supabase.auth.signUp({ email, password });
    _setLoading(false);

    if (error) { _setError(error.message); return; }

    if (data.user && !data.session) {
      // Email confirmation required
      _showSuccess('Check your email to confirm your account!');
    } else {
      closeModal();
      window.showToast?.('Welcome to Pillars, Legend! 🏛️');
    }
  }

  // ── Email Sign In ───────────────────────────────────────────
  async function signInWithEmail(email, password) {
    _setError('');
    if (!email || !password) { _setError('Email and password are required.'); return; }

    _setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    _setLoading(false);

    if (error) { _setError(error.message); return; }
    closeModal();
    window.showToast?.('Welcome back, Legend! 🏛️');
  }

  // ── Google OAuth ────────────────────────────────────────────
  async function signInWithGoogle() {
    _setError('');
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.href,
        queryParams: { prompt: 'select_account' },
      },
    });
    if (error) _setError(error.message);
  }

  // ── Sign Out ────────────────────────────────────────────────
  async function signOut() {
    await supabase.auth.signOut();
    window.showToast?.('Signed out. See you soon, Legend.');
    window.location.hash = 'home';
  }

  // ── Success message ─────────────────────────────────────────
  function _showSuccess(msg) {
    const err = document.getElementById('auth-error');
    if (err) {
      err.textContent     = msg;
      err.style.display   = 'block';
      err.style.background = 'rgba(16,185,129,0.12)';
      err.style.borderColor = 'rgba(16,185,129,0.4)';
      err.style.color     = 'var(--em-300)';
    }
  }

  // ── Wire up DOM events ──────────────────────────────────────
  function _bindEvents() {
    // Overlay click to close
    document.getElementById('auth-modal-overlay')?.addEventListener('click', e => {
      if (e.target.id === 'auth-modal-overlay') closeModal();
    });

    // ESC key
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') closeModal();
    });

    // Close button
    document.getElementById('auth-close-btn')?.addEventListener('click', closeModal);

    // Tabs
    document.querySelectorAll('.auth-tab').forEach(tab => {
      tab.addEventListener('click', () => _switchTab(tab.dataset.tab));
    });

    // Login form submit
    document.getElementById('auth-login-form')?.addEventListener('submit', e => {
      e.preventDefault();
      const email    = document.getElementById('login-email').value.trim();
      const password = document.getElementById('login-password').value;
      signInWithEmail(email, password);
    });

    // Signup form submit
    document.getElementById('auth-signup-form')?.addEventListener('submit', e => {
      e.preventDefault();
      const email    = document.getElementById('signup-email').value.trim();
      const password = document.getElementById('signup-password').value;
      const confirm  = document.getElementById('signup-confirm').value;
      signUpWithEmail(email, password, confirm);
    });

    // Google button (shared by both tabs — listen on all)
    document.querySelectorAll('.auth-google-btn').forEach(btn => {
      btn.addEventListener('click', signInWithGoogle);
    });
  }

  // ── Public init ─────────────────────────────────────────────
  async function init() {
    // Get initial session
    const { data: { session } } = await supabase.auth.getSession();
    _emit(session?.user ?? null);

    // Listen for auth changes
    supabase.auth.onAuthStateChange((_event, session) => {
      _emit(session?.user ?? null);
    });

    _bindEvents();
  }

  // ── Subscribe ───────────────────────────────────────────────
  function onAuthStateChange(fn) { _listeners.push(fn); }

  function getCurrentUser() { return _user; }
  function isLoggedIn()     { return !!_user; }

  return { init, openModal, closeModal, signOut, getCurrentUser, isLoggedIn, onAuthStateChange };
})();

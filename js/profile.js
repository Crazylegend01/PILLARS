/* ============================================================
   PROJECT PILLARS BY LEGENDS — js/profile.js
   Phase 3: Profile Setup Engine & Buyer/Seller Mode
   ============================================================ */

import { supabase } from './supabaseClient.js';
import { AuthManager } from './auth.js';

export const ProfileManager = (() => {
  let _profile = null;
  let _mode    = localStorage.getItem('pillars_mode') || 'BUYER';

  /* ── Static data ─────────────────────────────────────────── */
  const LANGUAGES = [
    { code: 'en', label: 'English' },
    { code: 'fr', label: 'French (Français)' },
    { code: 'ar', label: 'Arabic (العربية)' },
    { code: 'yo', label: 'Yoruba' },
    { code: 'ha', label: 'Hausa' },
    { code: 'ig', label: 'Igbo' },
    { code: 'sw', label: 'Swahili' },
    { code: 'pt', label: 'Portuguese (Português)' },
    { code: 'es', label: 'Spanish (Español)' },
    { code: 'zh', label: 'Chinese (中文)' },
  ];

  const PLATFORMS = [
    { id: 'instagram', label: 'Instagram',  placeholder: 'https://instagram.com/yourname' },
    { id: 'x',         label: 'X (Twitter)',placeholder: 'https://x.com/yourname' },
    { id: 'facebook',  label: 'Facebook',   placeholder: 'https://facebook.com/yourname' },
    { id: 'linkedin',  label: 'LinkedIn',   placeholder: 'https://linkedin.com/in/yourname' },
    { id: 'tiktok',    label: 'TikTok',     placeholder: 'https://tiktok.com/@yourname' },
    { id: 'youtube',   label: 'YouTube',    placeholder: 'https://youtube.com/@yourname' },
    { id: 'telegram',  label: 'Telegram',   placeholder: 'https://t.me/yourname' },
    { id: 'whatsapp',  label: 'WhatsApp',   placeholder: '+1234567890' },
  ];

  /* ── Profile fetch ───────────────────────────────────────── */
  async function fetchProfile() {
    const user = AuthManager.getCurrentUser();
    if (!user) return null;
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    _profile = data;
    return data;
  }

  function isProfileComplete(p) {
    return !!(p?.display_name && p?.profile_tag);
  }

  /* ── Mode management ─────────────────────────────────────── */
  function getMode() { return _mode; }

  async function setMode(mode) {
    _mode = mode;
    localStorage.setItem('pillars_mode', mode);
    _updateModeUI();
    const user = AuthManager.getCurrentUser();
    if (user) {
      await supabase.from('profiles').update({ mode }).eq('id', user.id);
    }
  }

  function _updateModeUI() {
    const btn = document.getElementById('mode-toggle');
    if (btn) {
      const isSeller = _mode === 'SELLER';
      btn.textContent = isSeller ? '🛒 SELLER' : '🛍️ BUYER';
      btn.classList.toggle('mode-seller', isSeller);
      btn.classList.toggle('mode-buyer', !isSeller);
    }
    const badge = document.getElementById('profile-mode-badge');
    if (badge) {
      const isSeller = _mode === 'SELLER';
      badge.textContent = isSeller ? '🛒 SELLER MODE' : '🛍️ BUYER MODE';
      badge.className   = `mode-badge ${isSeller ? 'mode-badge-seller' : 'mode-badge-buyer'}`;
    }
  }

  /* ── Modal open/close ────────────────────────────────────── */
  function openSetupModal() {
    const overlay = document.getElementById('profile-setup-overlay');
    if (!overlay) return;
    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
    _populateForm();
  }

  function closeSetupModal() {
    const overlay = document.getElementById('profile-setup-overlay');
    if (!overlay) return;
    overlay.classList.remove('open');
    document.body.style.overflow = '';
  }

  /* ── Populate form ───────────────────────────────────────── */
  async function _populateForm() {
    const profile = _profile || await fetchProfile();

    // Language dropdown
    const langSel = document.getElementById('setup-language');
    if (langSel) {
      langSel.innerHTML = LANGUAGES.map(l =>
        `<option value="${l.code}" ${profile?.language === l.code ? 'selected' : ''}>${l.label}</option>`
      ).join('');
    }

    // Text fields
    const dn = document.getElementById('setup-display-name');
    const pt = document.getElementById('setup-profile-tag');
    const bn = document.getElementById('setup-business-name');

    if (dn && profile?.display_name) dn.value = profile.display_name;
    if (pt && profile?.profile_tag)  pt.value = profile.profile_tag;

    if (bn) {
      if (profile?.business_name)  bn.value = profile.business_name;
      if (profile?.business_name_locked) {
        bn.disabled = true;
        bn.classList.add('input-locked');
        const hint = document.getElementById('business-name-lock-hint');
        const lockBadge = document.getElementById('business-lock-badge');
        if (hint)      hint.style.display = 'block';
        if (lockBadge) lockBadge.style.display = 'inline';
      }
    }

    // Avatar
    const user = AuthManager.getCurrentUser();
    const avatarEl = document.getElementById('avatar-initials');
    if (avatarEl && user) {
      avatarEl.textContent = (profile?.display_name || user.email || 'L').charAt(0).toUpperCase();
    }
    if (profile?.avatar_url) _setAvatarPreview(profile.avatar_url);

    // Social links
    _renderSocialLinks(profile?.social_links || []);
  }

  /* ── Avatar preview ──────────────────────────────────────── */
  function _setAvatarPreview(url) {
    const wrap     = document.getElementById('avatar-preview');
    const initials = document.getElementById('avatar-initials');
    if (!wrap) return;
    if (url) {
      wrap.style.backgroundImage    = `url('${url}')`;
      wrap.style.backgroundSize     = 'cover';
      wrap.style.backgroundPosition = 'center';
      if (initials) initials.style.opacity = '0';
    } else {
      wrap.style.backgroundImage = 'none';
      if (initials) initials.style.opacity = '1';
    }
  }

  /* ── Avatar upload ───────────────────────────────────────── */
  async function _uploadAvatar(file) {
    const user = AuthManager.getCurrentUser();
    if (!user || !file) return null;
    const ext  = file.name.split('.').pop().toLowerCase();
    const path = `${user.id}/avatar.${ext}`;
    const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
    if (error) throw error;
    const { data } = supabase.storage.from('avatars').getPublicUrl(path);
    return data.publicUrl + '?t=' + Date.now();
  }

  /* ── Social links ────────────────────────────────────────── */
  let _socialLinks = [];

  function _renderSocialLinks(links) {
    _socialLinks = links.length ? [...links] : [{ platform: 'instagram', url: '' }];
    _redrawSocialLinks();
  }

  function _redrawSocialLinks() {
    const container = document.getElementById('social-links-container');
    if (!container) return;
    container.innerHTML = _socialLinks.map((link, i) => {
      const plat = PLATFORMS.find(p => p.id === link.platform) || PLATFORMS[0];
      return `
        <div class="social-link-row">
          <select class="form-input social-platform-sel" data-idx="${i}">
            ${PLATFORMS.map(p => `<option value="${p.id}" ${link.platform === p.id ? 'selected' : ''}>${p.label}</option>`).join('')}
          </select>
          <input
            type="url"
            class="form-input social-url-input"
            data-idx="${i}"
            placeholder="${plat.placeholder}"
            value="${link.url || ''}"
          />
          <button type="button" class="social-remove-btn" data-idx="${i}" title="Remove">✕</button>
        </div>`;
    }).join('');

    container.querySelectorAll('.social-platform-sel').forEach(sel => {
      sel.addEventListener('change', e => {
        const idx  = +e.target.dataset.idx;
        _socialLinks[idx].platform = e.target.value;
        const plat = PLATFORMS.find(p => p.id === e.target.value);
        const inp  = container.querySelector(`.social-url-input[data-idx="${idx}"]`);
        if (inp && plat) inp.placeholder = plat.placeholder;
      });
    });
    container.querySelectorAll('.social-url-input').forEach(inp => {
      inp.addEventListener('input', e => { _socialLinks[+e.target.dataset.idx].url = e.target.value; });
    });
    container.querySelectorAll('.social-remove-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        const idx = +e.target.dataset.idx;
        _socialLinks.splice(idx, 1);
        if (!_socialLinks.length) _socialLinks.push({ platform: 'instagram', url: '' });
        _redrawSocialLinks();
      });
    });
  }

  /* ── Save profile ────────────────────────────────────────── */
  async function saveProfile() {
    const user = AuthManager.getCurrentUser();
    if (!user) return;

    const displayName  = document.getElementById('setup-display-name')?.value.trim();
    const language     = document.getElementById('setup-language')?.value || 'en';
    const profileTag   = document.getElementById('setup-profile-tag')?.value.trim().replace(/^@/, '');
    const businessName = document.getElementById('setup-business-name')?.value.trim();

    _setSetupError('');

    if (!displayName) { _setSetupError('Display name is required.'); return; }
    if (!profileTag)  { _setSetupError('Profile tag (@username) is required.'); return; }
    if (!/^[a-zA-Z0-9_]{3,24}$/.test(profileTag)) {
      _setSetupError('Profile tag: 3–24 chars, letters/numbers/underscores only.');
      return;
    }

    _setSetupLoading(true);

    // Avatar upload
    let avatarUrl = _profile?.avatar_url || null;
    const fileInput = document.getElementById('avatar-file-input');
    const file      = fileInput?.files?.[0];
    if (file) {
      try   { avatarUrl = await _uploadAvatar(file); }
      catch (e) {
        _setSetupError('Avatar upload failed: ' + e.message);
        _setSetupLoading(false);
        return;
      }
    }

    const socialLinks  = _socialLinks.filter(l => l.url.trim());
    const bnLocked     = _profile?.business_name_locked;
    const updates      = {
      id:           user.id,
      display_name: displayName,
      language,
      profile_tag:  profileTag,
      social_links: socialLinks,
      avatar_url:   avatarUrl,
      updated_at:   new Date().toISOString(),
    };
    if (!bnLocked) {
      updates.business_name        = businessName || null;
      updates.business_name_locked = !!businessName;   // lock if a name was entered
    }

    const { error } = await supabase.from('profiles').upsert(updates, { onConflict: 'id' });

    _setSetupLoading(false);

    if (error) {
      _setSetupError(
        error.message.includes('profile_tag')
          ? 'That profile tag is already taken — try another.'
          : error.message
      );
      return;
    }

    _profile = { ..._profile, ...updates };
    closeSetupModal();
    window.showToast?.('✅ Profile saved, Legend!');
    window.__refreshProfile?.();
  }

  function _setSetupError(msg) {
    const el = document.getElementById('setup-error');
    if (el) { el.textContent = msg; el.style.display = msg ? 'block' : 'none'; }
  }

  function _setSetupLoading(loading) {
    const btn = document.getElementById('setup-save-btn');
    if (btn) { btn.disabled = loading; btn.textContent = loading ? 'Saving...' : 'SAVE PROFILE'; }
  }

  /* ── Bind DOM events ─────────────────────────────────────── */
  function _bindEvents() {
    // Avatar click → file picker
    document.getElementById('avatar-preview')?.addEventListener('click', () => {
      document.getElementById('avatar-file-input')?.click();
    });

    // File → preview
    document.getElementById('avatar-file-input')?.addEventListener('change', e => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader   = new FileReader();
      reader.onload  = ev => _setAvatarPreview(ev.target.result);
      reader.readAsDataURL(file);
    });

    // Add social link
    document.getElementById('add-social-btn')?.addEventListener('click', () => {
      _socialLinks.push({ platform: 'instagram', url: '' });
      _redrawSocialLinks();
    });

    // Save
    document.getElementById('setup-save-btn')?.addEventListener('click', saveProfile);

    // Close (only if profile is already complete)
    document.getElementById('setup-close-btn')?.addEventListener('click', () => {
      if (isProfileComplete(_profile)) closeSetupModal();
      else window.showToast?.('Please complete your profile to continue.');
    });

    // Mode toggle in nav
    document.getElementById('mode-toggle')?.addEventListener('click', () => {
      const next = _mode === 'BUYER' ? 'SELLER' : 'BUYER';
      setMode(next);
      window.showToast?.(`Switched to ${next} MODE`);
    });
  }

  /* ── Init ────────────────────────────────────────────────── */
  async function init() {
    _bindEvents();
    _updateModeUI();

    if (AuthManager.isLoggedIn()) {
      const profile = await fetchProfile();
      if (!isProfileComplete(profile)) setTimeout(() => openSetupModal(), 700);
    }

    AuthManager.onAuthStateChange(async user => {
      if (user) {
        const profile = await fetchProfile();
        _updateModeUI();
        if (!isProfileComplete(profile)) setTimeout(() => openSetupModal(), 700);
      } else {
        _profile = null;
      }
    });
  }

  return {
    init, getMode, setMode, fetchProfile,
    openSetupModal, closeSetupModal,
    isProfileComplete: () => isProfileComplete(_profile),
    getProfile: () => _profile,
  };
})();

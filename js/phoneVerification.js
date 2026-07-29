/* ============================================================
   PROJECT PILLARS BY LEGENDS — js/phoneVerification.js
   Phone Registration Gate (No SMS / No OTP)
   · Intercepts protected routes (News, Chat, Marketplace)
   · Collects phone number and saves directly to profiles
   · Marks phone_verified = true without SMS confirmation
   ============================================================ */

import { supabase } from './supabaseClient.js';
import { AuthManager } from './auth.js';

/* ─── PHONE VERIFICATION MANAGER ───────────────────────────── */
export const PhoneVerification = (() => {
  let _verified     = false;
  let _pendingCb    = null;   // callback to fire after registration

  // ── Check DB for verified status ────────────────────────────
  async function checkVerified() {
    const user = AuthManager.getCurrentUser();
    if (!user) return false;

    const { data, error } = await supabase
      .from('profiles')
      .select('phone_verified')
      .eq('id', user.id)
      .single();

    if (error || !data) return false;
    _verified = !!data.phone_verified;
    return _verified;
  }

  // ── Public: is phone registered? ────────────────────────────
  function isVerified() { return _verified; }

  // ── Gate: check auth + registration, then run callback ──────
  async function gate(routeName, callback) {
    // 1. Must be logged in first
    if (!AuthManager.isLoggedIn()) {
      AuthManager.openModal('login');
      AuthManager.onAuthStateChange(async user => {
        if (user) await gate(routeName, callback);
      });
      window.showToast?.('Please sign in to access ' + routeName);
      return;
    }

    // 2. Must have registered phone
    const verified = await checkVerified();
    if (!verified) {
      _pendingCb = callback;
      openPhoneModal();
      window.showToast?.('📱 Phone registration required to access ' + routeName);
      return;
    }

    // 3. All good — proceed
    callback();
  }

  // ── Open phone registration modal ────────────────────────────
  function openPhoneModal(step = 'enter') {
    const overlay = document.getElementById('phone-modal-overlay');
    if (!overlay) return;
    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
    _setPhoneStep(step);
    _clearPhoneMessages();
  }

  function closePhoneModal() {
    const overlay = document.getElementById('phone-modal-overlay');
    if (!overlay) return;
    overlay.classList.remove('open');
    document.body.style.overflow = '';
  }

  // ── Step switcher ────────────────────────────────────────────
  function _setPhoneStep(step) {
    document.getElementById('phone-step-enter').style.display = step === 'enter' ? 'flex' : 'none';
    document.getElementById('phone-step-done').style.display  = step === 'done'  ? 'flex' : 'none';
  }

  function _setPhoneError(msg) {
    const el = document.getElementById('phone-error');
    if (el) { el.textContent = msg; el.style.display = msg ? 'block' : 'none'; }
  }

  function _clearPhoneMessages() { _setPhoneError(''); }

  function _setLoading(btnId, loading, label) {
    const btn = document.getElementById(btnId);
    if (btn) { btn.disabled = loading; btn.textContent = loading ? 'Please wait...' : label; }
  }

  // ── Register Phone (no OTP — saves directly) ─────────────────
  async function registerPhone() {
    const input = document.getElementById('phone-input');
    const phone = input?.value.trim();

    if (!phone) { _setPhoneError('Please enter your phone number.'); return; }
    // Basic E.164 format check
    if (!/^\+[1-9]\d{6,14}$/.test(phone)) {
      _setPhoneError('Use international format: +2348012345678 (include country code).');
      return;
    }

    _setPhoneError('');
    _setLoading('phone-send-btn', true, 'REGISTER NUMBER');

    // Save phone number directly to profiles and mark as verified
    const user = AuthManager.getCurrentUser();
    if (!user) {
      _setPhoneError('Session expired. Please sign in again.');
      _setLoading('phone-send-btn', false, 'REGISTER NUMBER');
      return;
    }

    const { error } = await supabase.from('profiles').upsert({
      id:             user.id,
      phone_number:   phone,
      phone_verified: true,
      updated_at:     new Date().toISOString(),
    }, { onConflict: 'id' });

    _setLoading('phone-send-btn', false, 'REGISTER NUMBER');

    if (error) {
      _setPhoneError(error.message);
      return;
    }

    _verified = true;
    _setPhoneStep('done');

    // Fire the pending navigation callback after short delay
    setTimeout(() => {
      closePhoneModal();
      window.showToast?.('✅ Phone registered! Access granted, Legend.');
      if (_pendingCb) { _pendingCb(); _pendingCb = null; }
    }, 2000);
  }

  // ── Wire up DOM events ───────────────────────────────────────
  function _bindEvents() {
    // Overlay backdrop — phone modal is compulsory, cannot dismiss
    document.getElementById('phone-modal-overlay')?.addEventListener('click', e => {
      // Intentionally blocked
    });

    // Register button
    document.getElementById('phone-send-btn')?.addEventListener('click', registerPhone);

    // Phone input Enter
    document.getElementById('phone-input')?.addEventListener('keydown', e => {
      if (e.key === 'Enter') registerPhone();
    });
  }

  // ── Init ─────────────────────────────────────────────────────
  async function init() {
    _bindEvents();
    // Check on load if user is already registered
    if (AuthManager.isLoggedIn()) {
      await checkVerified();
    }
    // Re-check whenever auth state changes
    AuthManager.onAuthStateChange(async user => {
      if (user) await checkVerified();
      else { _verified = false; }
    });
  }

  return { init, gate, isVerified, openPhoneModal, closePhoneModal };
})();

/* ============================================================
   PROJECT PILLARS BY LEGENDS — js/phoneVerification.js
   Phone Verification Gate
   · Intercepts protected routes (News, Chat, Marketplace)
   · Sends OTP via Supabase → Twilio
   · Stores verified phone in `profiles` table
   ============================================================ */

import { supabase } from './supabaseClient.js';
import { AuthManager } from './auth.js';

/* ─── PHONE VERIFICATION MANAGER ───────────────────────────── */
export const PhoneVerification = (() => {
  let _verified     = false;
  let _pendingPhone = '';
  let _pendingCb    = null;   // callback to fire after verification

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

  // ── Public: is phone verified? ───────────────────────────────
  function isVerified() { return _verified; }

  // ── Gate: check auth + verification, then run callback ──────
  async function gate(routeName, callback) {
    // 1. Must be logged in first
    if (!AuthManager.isLoggedIn()) {
      AuthManager.openModal('login');
      // After login, re-try navigating to the same route
      AuthManager.onAuthStateChange(async user => {
        if (user) await gate(routeName, callback);
      });
      window.showToast?.('Please sign in to access ' + routeName);
      return;
    }

    // 2. Must have verified phone
    const verified = await checkVerified();
    if (!verified) {
      _pendingCb = callback;
      openPhoneModal();
      window.showToast?.('📱 Phone verification required to access ' + routeName);
      return;
    }

    // 3. All good — proceed
    callback();
  }

  // ── Open phone verification modal ────────────────────────────
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
    document.getElementById('phone-step-otp').style.display   = step === 'otp'   ? 'flex' : 'none';
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

  // ── Send OTP ─────────────────────────────────────────────────
  async function sendOTP() {
    const input = document.getElementById('phone-input');
    const phone = input?.value.trim();

    if (!phone) { _setPhoneError('Please enter your phone number.'); return; }
    // Basic E.164 format check
    if (!/^\+[1-9]\d{6,14}$/.test(phone)) {
      _setPhoneError('Use E.164 format: +1234567890 (include country code).');
      return;
    }

    _pendingPhone = phone;
    _setPhoneError('');
    _setLoading('phone-send-btn', true, 'SEND CODE');

    // Supabase sends OTP via Twilio to the user's new phone
    const { error } = await supabase.auth.updateUser({ phone });

    _setLoading('phone-send-btn', false, 'SEND CODE');

    if (error) {
      _setPhoneError(error.message);
      return;
    }

    // Switch to OTP entry step
    _setPhoneStep('otp');
    document.getElementById('otp-phone-display').textContent = phone;
    setTimeout(() => document.getElementById('otp-input')?.focus(), 80);
  }

  // ── Verify OTP ───────────────────────────────────────────────
  async function verifyOTP() {
    const token = document.getElementById('otp-input')?.value.trim();
    if (!token || token.length < 4) { _setPhoneError('Enter the 6-digit code.'); return; }

    _setPhoneError('');
    _setLoading('otp-verify-btn', true, 'VERIFY');

    const { data, error } = await supabase.auth.verifyOtp({
      phone: _pendingPhone,
      token,
      type: 'phone_change',
    });

    if (error) {
      _setLoading('otp-verify-btn', false, 'VERIFY');
      _setPhoneError(error.message);
      return;
    }

    // Save to profiles table
    const user = data.user || AuthManager.getCurrentUser();
    if (user) {
      await supabase.from('profiles').upsert({
        id:             user.id,
        phone_number:   _pendingPhone,
        phone_verified: true,
        updated_at:     new Date().toISOString(),
      }, { onConflict: 'id' });
    }

    _verified = true;
    _setLoading('otp-verify-btn', false, 'VERIFY');
    _setPhoneStep('done');

    // Fire the pending navigation callback after short delay
    setTimeout(() => {
      closePhoneModal();
      window.showToast?.('✅ Phone verified! Access granted, Legend.');
      if (_pendingCb) { _pendingCb(); _pendingCb = null; }
    }, 2000);
  }

  // ── Resend OTP ───────────────────────────────────────────────
  async function resendOTP() {
    const { error } = await supabase.auth.updateUser({ phone: _pendingPhone });
    if (error) { _setPhoneError(error.message); return; }
    window.showToast?.('New code sent!');
  }

  // ── Wire up DOM events ───────────────────────────────────────
  function _bindEvents() {
    // Overlay backdrop close (only if user clicks outside card)
    document.getElementById('phone-modal-overlay')?.addEventListener('click', e => {
      // Phone modal is compulsory — cannot dismiss by backdrop
    });

    // ESC disabled for compulsory modal (intentional)

    // Send OTP button
    document.getElementById('phone-send-btn')?.addEventListener('click', sendOTP);

    // Phone input Enter
    document.getElementById('phone-input')?.addEventListener('keydown', e => {
      if (e.key === 'Enter') sendOTP();
    });

    // Verify button
    document.getElementById('otp-verify-btn')?.addEventListener('click', verifyOTP);

    // OTP input Enter
    document.getElementById('otp-input')?.addEventListener('keydown', e => {
      if (e.key === 'Enter') verifyOTP();
    });

    // OTP input: auto-format (digits only)
    document.getElementById('otp-input')?.addEventListener('input', e => {
      e.target.value = e.target.value.replace(/\D/g, '').slice(0, 6);
    });

    // Resend link
    document.getElementById('otp-resend-btn')?.addEventListener('click', resendOTP);

    // Back to phone step
    document.getElementById('otp-back-btn')?.addEventListener('click', () => {
      _setPhoneStep('enter');
      _clearPhoneMessages();
    });
  }

  // ── Init ─────────────────────────────────────────────────────
  async function init() {
    _bindEvents();
    // Check on load if user is already verified
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

/* ============================================================
   PROJECT PILLARS BY LEGENDS — js/admin.js
   Admin Panel — Data Layer
   Roles: superadmin > admin > subadmin > user
   ============================================================ */

import { supabase } from './supabaseClient.js';

export const AdminPanel = (() => {
  let _role = null;

  /* ── Role helpers ──────────────────────────────────────────── */
  function getRole()        { return _role; }
  function isAdmin()        { return ['superadmin','admin'].includes(_role); }
  function canBan()         { return ['superadmin','admin'].includes(_role); }
  function canPromote()     { return ['superadmin','admin'].includes(_role); }
  function canPost()        { return ['superadmin','admin','subadmin'].includes(_role); }
  function hasAccess()      { return ['superadmin','admin','subadmin'].includes(_role); }

  /* ── Init — fetch current user's role ─────────────────────── */
  async function init() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { _role = null; return null; }
    const { data } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    _role = data?.role || 'user';
    return _role;
  }

  /* ── Users ─────────────────────────────────────────────────── */
  async function loadUsers() {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, display_name, phone_number, phone_verified, role, is_banned, legend_tier, created_at')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  }

  async function banUser(userId, ban = true) {
    const { error } = await supabase
      .from('profiles')
      .update({ is_banned: ban })
      .eq('id', userId);
    if (error) throw error;
  }

  async function setRole(userId, role) {
    const { error } = await supabase
      .from('profiles')
      .update({ role })
      .eq('id', userId);
    if (error) throw error;
  }

  /* ── Announcements ─────────────────────────────────────────── */
  async function loadAnnouncements() {
    const { data, error } = await supabase
      .from('announcements')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) throw error;
    return data || [];
  }

  async function postAnnouncement(title, body, category) {
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase
      .from('announcements')
      .insert({ title, body, category, author_id: user.id });
    if (error) throw error;
  }

  async function deleteAnnouncement(id) {
    const { error } = await supabase.from('announcements').delete().eq('id', id);
    if (error) throw error;
  }

  return {
    init, getRole, isAdmin, canBan, canPromote, canPost, hasAccess,
    loadUsers, banUser, setRole,
    loadAnnouncements, postAnnouncement, deleteAnnouncement,
  };
})();

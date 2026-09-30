import { isSupabaseConfigured, supabase } from './supabase';

export async function getMyNotificationPage(page = 1) {
  if (!isSupabaseConfigured) throw new Error('Supabase is not configured.');
  const { data, error } = await supabase.rpc('get_my_notification_page', { p_page: page, p_page_size: 20 });
  if (error) throw error;
  return data || { items: [], page, page_size: 20, total: 0, unread_count: 0, has_more: false };
}

export async function getMyUnreadNotificationCount() {
  if (!isSupabaseConfigured) return 0;
  const { data, error } = await supabase.rpc('get_my_unread_notification_count');
  if (error) throw error;
  return Number(data || 0);
}

export async function markNotificationRead(notificationId) {
  if (!isSupabaseConfigured) throw new Error('Supabase is not configured.');
  const { data, error } = await supabase.rpc('mark_notification_read', { p_notification_id: notificationId });
  if (error) throw error;
  return Boolean(data);
}

export async function markAllNotificationsRead() {
  if (!isSupabaseConfigured) throw new Error('Supabase is not configured.');
  const { data, error } = await supabase.rpc('mark_all_notifications_read');
  if (error) throw error;
  return Number(data || 0);
}

export async function getMyNotificationPreferences() {
  if (!isSupabaseConfigured) throw new Error('Supabase is not configured.');
  const { data, error } = await supabase.rpc('get_my_notification_preferences');
  if (error) throw error;
  return data;
}

export async function updateMyNotificationPreferences(preferences) {
  if (!isSupabaseConfigured) throw new Error('Supabase is not configured.');
  const { data, error } = await supabase.rpc('update_my_notification_preferences', {
    p_study_reminders_enabled: preferences.study_reminders_enabled,
    p_preferred_time: preferences.preferred_time,
    p_preferred_days: preferences.preferred_days,
    p_timezone_name: preferences.timezone_name,
    p_new_content_enabled: preferences.new_content_enabled,
    p_mock_test_notifications_enabled: preferences.mock_test_notifications_enabled,
    p_subscription_notifications_enabled: preferences.subscription_notifications_enabled,
  });
  if (error) throw error;
  return data;
}

export async function createAdminNotification(notification) {
  if (!isSupabaseConfigured) throw new Error('Supabase is not configured.');
  const { data, error } = await supabase.rpc('create_admin_notification', {
    p_title: notification.title,
    p_message: notification.message,
    p_notification_type: notification.notificationType,
    p_action_url: notification.actionUrl || null,
    p_audience: notification.audience,
    p_expires_at: notification.expiresAt || null,
  });
  if (error) throw error;
  return data;
}

export async function getAdminNotificationHistory() {
  if (!isSupabaseConfigured) throw new Error('Supabase is not configured.');
  const { data, error } = await supabase.rpc('get_admin_notification_history');
  if (error) throw error;
  return Array.isArray(data) ? data : [];
}

export async function getAdminNotificationTargets() {
  if (!isSupabaseConfigured) throw new Error('Supabase is not configured.');
  const [materials, affairs, modules] = await Promise.all([
    supabase.from('study_materials').select('slug,title,is_premium').eq('is_published', true).order('title').limit(100),
    supabase.from('current_affairs').select('slug,title').eq('is_published', true).order('published_at', { ascending: false }).limit(100),
    supabase.from('issb_modules').select('slug,title').eq('is_published', true).order('display_order').limit(100),
  ]);
  const error = materials.error || affairs.error || modules.error;
  if (error) throw error;
  return {
    studyMaterials: materials.data || [],
    currentAffairs: affairs.data || [],
    issbModules: modules.data || [],
  };
}
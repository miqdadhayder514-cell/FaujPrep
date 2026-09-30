export const PRIMARY_ADMIN_EMAIL = 'miqdadhayder514@gmail.com';

export function isPrimaryAdmin(user) {
  const email = String(user?.email || '').trim().toLowerCase();
  const emailConfirmed = Boolean(user?.email_confirmed_at || user?.confirmed_at);
  return email === PRIMARY_ADMIN_EMAIL && emailConfirmed;
}
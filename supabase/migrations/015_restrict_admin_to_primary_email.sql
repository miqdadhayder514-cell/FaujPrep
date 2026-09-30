update public.profiles as profile
set role = 'ADMIN',
    updated_at = now()
from auth.users as auth_user
where profile.id = auth_user.id
  and lower(auth_user.email) = 'miqdadhayder514@gmail.com'
  and auth_user.email_confirmed_at is not null;

create or replace function public.is_primary_admin()
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1
    from auth.users auth_user
    join public.profiles profile on profile.id = auth_user.id
    where auth_user.id = auth.uid()
      and lower(auth_user.email) = 'miqdadhayder514@gmail.com'
      and auth_user.email_confirmed_at is not null
      and profile.role = 'ADMIN'
  );
$$;

revoke all on function public.is_primary_admin() from public, anon;
grant execute on function public.is_primary_admin() to authenticated;

create or replace function public.is_editor_or_admin()
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select public.is_primary_admin();
$$;

revoke all on function public.is_editor_or_admin() from public, anon;
grant execute on function public.is_editor_or_admin() to authenticated;

create or replace function public.is_analytics_admin()
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select public.is_primary_admin();
$$;

revoke all on function public.is_analytics_admin() from public, anon;
grant execute on function public.is_analytics_admin() to authenticated;
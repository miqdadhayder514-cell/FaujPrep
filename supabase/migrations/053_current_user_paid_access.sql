begin;

create or replace function public.get_current_user_access_level()
returns text
language sql
security definer
set search_path = public
stable
as $$
  select public.get_access_level_for_user(auth.uid());
$$;

revoke all on function public.get_current_user_access_level() from public, anon;
grant execute on function public.get_current_user_access_level() to authenticated;

notify pgrst, 'reload schema';

commit;

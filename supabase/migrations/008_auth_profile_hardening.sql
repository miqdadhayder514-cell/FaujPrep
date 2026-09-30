create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare raw_branch_id text;
declare safe_branch_id uuid;
begin
  raw_branch_id := nullif(new.raw_user_meta_data ->> 'target_branch_id', '');
  if raw_branch_id is not null and raw_branch_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
    safe_branch_id := raw_branch_id::uuid;
  end if;

  insert into public.profiles (id, full_name, target_branch_id)
  values (new.id, nullif(new.raw_user_meta_data ->> 'full_name', ''), safe_branch_id)
  on conflict (id) do update
  set full_name = coalesce(excluded.full_name, public.profiles.full_name),
      target_branch_id = coalesce(excluded.target_branch_id, public.profiles.target_branch_id),
      updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

insert into public.profiles (id, full_name)
select id, nullif(raw_user_meta_data ->> 'full_name', '')
from auth.users
on conflict (id) do nothing;

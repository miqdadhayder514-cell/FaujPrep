begin;

-- Treat an approved Pro/Premium payment as access while subscription rows are being repaired or synchronized.
create or replace function public.get_access_level_for_user(p_user_id uuid default auth.uid())
returns text
language plpgsql
security definer
set search_path = public
stable
as $$
declare access_level text;
begin
  if p_user_id is null then
    return 'free';
  end if;

  select p.slug into access_level
  from public.subscriptions s
  join public.plans p on p.id = s.plan_id
  where s.user_id = p_user_id
    and s.status = 'ACTIVE'
  order by s.started_at desc, s.created_at desc
  limit 1;

  if access_level in ('pro', 'premium') then
    return access_level;
  end if;

  select p.slug into access_level
  from public.payment_transactions payment
  join public.plans p on p.id = payment.plan_id
  where payment.user_id = p_user_id
    and payment.status in ('APPROVED', 'SUCCESS')
    and p.slug in ('pro', 'premium')
  order by payment.updated_at desc, payment.created_at desc
  limit 1;

  return coalesce(access_level, 'free');
end;
$$;

grant execute on function public.get_access_level_for_user(uuid) to authenticated;

notify pgrst, 'reload schema';

commit;

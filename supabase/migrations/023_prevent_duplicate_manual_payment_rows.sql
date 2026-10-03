begin;

create or replace function public.create_plan_checkout(p_plan_slug text)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare v_user_id uuid := auth.uid();
declare v_plan public.plans%rowtype;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  select * into v_plan
  from public.plans
  where slug = p_plan_slug and is_active = true;

  if not found then
    raise exception 'Invalid or inactive plan';
  end if;

  if v_plan.price_pkr = 0 then
    perform public.seed_free_subscription_for_user(v_user_id);
    return jsonb_build_object(
      'plan_slug', v_plan.slug,
      'plan_name', v_plan.name,
      'amount_pkr', v_plan.price_pkr,
      'payment_required', false,
      'status', 'FREE_ACTIVE',
      'provider', 'SYSTEM',
      'requires_provider', false,
      'transaction_id', null,
      'message', 'Free plan activated immediately.'
    );
  end if;

  return jsonb_build_object(
    'plan_slug', v_plan.slug,
    'plan_name', v_plan.name,
    'amount_pkr', v_plan.price_pkr,
    'payment_required', true,
    'status', 'PENDING',
    'provider', 'JAZZCASH_MANUAL',
    'requires_provider', false,
    'transaction_id', null,
    'provider_status', 'PROOF_REQUIRED',
    'message', 'Submit your payment proof for manual verification.'
  );
end;
$$;

revoke all on function public.create_plan_checkout(text) from public, anon;
grant execute on function public.create_plan_checkout(text) to authenticated;

delete from public.payment_transactions placeholder
using public.payment_transactions submitted_proof
where placeholder.user_id = submitted_proof.user_id
  and placeholder.plan_id = submitted_proof.plan_id
  and placeholder.amount_pkr = submitted_proof.amount_pkr
  and placeholder.status = 'PENDING'
  and placeholder.payment_method = 'JAZZCASH'
  and placeholder.created_at <= submitted_proof.created_at
  and submitted_proof.payment_method = 'JAZZCASH_MANUAL'
  and submitted_proof.payment_screenshot_url is not null;

commit;

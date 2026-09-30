create table if not exists public.plans (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  price_pkr integer not null default 0 check (price_pkr >= 0),
  billing_interval text not null default 'ONE_TIME' check (billing_interval in ('ONE_TIME', 'MONTHLY')),
  is_active boolean not null default true,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.plan_entitlements (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.plans(id) on delete cascade,
  feature_key text not null,
  label text not null,
  is_enabled boolean not null default true,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique (plan_id, feature_key)
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_id uuid not null references public.plans(id) on delete restrict,
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'PENDING', 'EXPIRED', 'CANCELLED', 'PAYMENT_FAILED')),
  provider text not null default 'JAZZCASH' check (provider in ('JAZZCASH', 'SYSTEM', 'MANUAL', 'FREEMIUM')),
  provider_subscription_id text,
  started_at timestamptz not null default now(),
  expires_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id)
);

create table if not exists public.payment_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subscription_id uuid references public.subscriptions(id) on delete set null,
  plan_id uuid not null references public.plans(id) on delete restrict,
  provider text not null default 'JAZZCASH' check (provider in ('JAZZCASH', 'FUTURE_PROVIDER')),
  provider_transaction_id text,
  amount_pkr integer not null default 0 check (amount_pkr >= 0),
  currency text not null default 'PKR' check (currency = 'PKR'),
  status text not null default 'CREATED' check (status in ('CREATED', 'PENDING', 'SUCCESS', 'FAILED', 'CANCELLED', 'REFUNDED', 'EXPIRED')),
  payment_method text default 'JAZZCASH',
  provider_response_reference text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists plans_active_order_idx on public.plans (is_active, display_order);
create index if not exists plan_entitlements_plan_idx on public.plan_entitlements (plan_id, display_order);
create index if not exists subscriptions_user_status_idx on public.subscriptions (user_id, status, started_at desc);
create index if not exists payment_transactions_user_created_idx on public.payment_transactions (user_id, created_at desc);
create index if not exists payment_transactions_plan_idx on public.payment_transactions (plan_id, created_at desc);

DO $$
DECLARE table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY['plans', 'plan_entitlements', 'subscriptions', 'payment_transactions'] LOOP
    EXECUTE format('drop trigger if exists %I_updated_at on public.%I', table_name, table_name);
    EXECUTE format('create trigger %I_updated_at before update on public.%I for each row execute function public.set_updated_at()', table_name, table_name);
  END LOOP;
END $$;

insert into public.plans (name, slug, description, price_pkr, billing_interval, is_active, display_order)
values
  ('Free', 'free', 'Basic preparation access with premium resources protected.', 0, 'ONE_TIME', true, 1),
  ('Pro', 'pro', 'Expanded question practice, mock tests, study materials, and premium resources.', 1999, 'ONE_TIME', true, 2),
  ('Premium', 'premium', 'Full premium access to all protected study and practice content available in the current FaujPrep platform.', 4999, 'ONE_TIME', true, 3)
on conflict (slug) do update
set name = excluded.name,
    description = excluded.description,
    price_pkr = excluded.price_pkr,
    billing_interval = excluded.billing_interval,
    is_active = excluded.is_active,
    display_order = excluded.display_order,
    updated_at = now();

with plan_lookup as (
  select id, slug from public.plans
)
insert into public.plan_entitlements (plan_id, feature_key, label, is_enabled, display_order)
select p.id, f.feature_key, f.label, f.is_enabled, f.display_order
from (
  values
    ('free', 'basic_practice', 'Basic practice', true, 1),
    ('free', 'limited_practice', 'Daily practice allotment', true, 2),
    ('free', 'premium_questions', 'Premium questions', false, 3),
    ('free', 'free_mock_tests', 'Free mock tests', true, 4),
    ('free', 'premium_mock_tests', 'Premium mock tests', false, 5),
    ('free', 'free_study_materials', 'Free study materials', true, 6),
    ('free', 'premium_study_materials', 'Premium study materials', false, 7),
    ('free', 'free_current_affairs', 'Free current affairs', true, 8),
    ('free', 'premium_current_affairs', 'Premium current affairs', false, 9),
    ('free', 'basic_issb', 'Basic ISSB guidance', true, 10),
    ('free', 'premium_issb', 'Premium ISSB resources', false, 11),
    ('pro', 'basic_practice', 'Basic practice', true, 1),
    ('pro', 'limited_practice', 'Expanded practice access', true, 2),
    ('pro', 'unlimited_practice', 'Larger practice allowance', true, 3),
    ('pro', 'premium_questions', 'Premium questions', true, 4),
    ('pro', 'free_mock_tests', 'Free mock tests', true, 5),
    ('pro', 'premium_mock_tests', 'Premium mock tests', true, 6),
    ('pro', 'free_study_materials', 'Free study materials', true, 7),
    ('pro', 'premium_study_materials', 'Premium study materials', true, 8),
    ('pro', 'free_current_affairs', 'Free current affairs', true, 9),
    ('pro', 'premium_current_affairs', 'Premium current affairs', true, 10),
    ('pro', 'basic_issb', 'Basic ISSB guidance', true, 11),
    ('pro', 'premium_issb', 'Premium ISSB resources', true, 12),
    ('premium', 'basic_practice', 'Basic practice', true, 1),
    ('premium', 'limited_practice', 'Expanded practice access', true, 2),
    ('premium', 'unlimited_practice', 'Unlimited practice access', true, 3),
    ('premium', 'premium_questions', 'Premium questions', true, 4),
    ('premium', 'free_mock_tests', 'Free mock tests', true, 5),
    ('premium', 'premium_mock_tests', 'Premium mock tests', true, 6),
    ('premium', 'free_study_materials', 'Free study materials', true, 7),
    ('premium', 'premium_study_materials', 'Premium study materials', true, 8),
    ('premium', 'free_current_affairs', 'Free current affairs', true, 9),
    ('premium', 'premium_current_affairs', 'Premium current affairs', true, 10),
    ('premium', 'basic_issb', 'Basic ISSB guidance', true, 11),
    ('premium', 'premium_issb', 'Premium ISSB resources', true, 12)
) as f(plan_slug, feature_key, label, is_enabled, display_order)
join public.plans p on p.slug = f.plan_slug
on conflict (plan_id, feature_key) do update
set label = excluded.label,
    is_enabled = excluded.is_enabled,
    display_order = excluded.display_order,
    updated_at = now();

create or replace function public.get_access_level_for_user(p_user_id uuid default auth.uid())
returns text
language plpgsql
security definer set search_path = public
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

  if access_level is null then
    return 'free';
  end if;

  return access_level;
end;
$$;

grant execute on function public.get_access_level_for_user(uuid) to authenticated;

drop policy if exists plans_public_select on public.plans;
create policy plans_public_select
on public.plans for select
to public
using (is_active = true);

drop policy if exists entitlements_public_select on public.plan_entitlements;
create policy entitlements_public_select
on public.plan_entitlements for select
to public
using (exists (
  select 1 from public.plans p
  where p.id = plan_entitlements.plan_id
    and p.is_active = true
));

drop policy if exists own_subscription_read on public.subscriptions;
create policy own_subscription_read
on public.subscriptions for select
to authenticated
using (user_id = auth.uid() or public.is_editor_or_admin());

create policy no_direct_subscription_write
on public.subscriptions for insert
to authenticated
with check (false);

create policy no_direct_subscription_update
on public.subscriptions for update
to authenticated
using (false)
with check (false);

create policy no_direct_subscription_delete
on public.subscriptions for delete
to authenticated
using (false);

drop policy if exists own_payment_read on public.payment_transactions;
create policy own_payment_read
on public.payment_transactions for select
to authenticated
using (user_id = auth.uid() or public.is_editor_or_admin());

create policy no_direct_payment_write
on public.payment_transactions for insert
to authenticated
with check (false);

create policy no_direct_payment_update
on public.payment_transactions for update
to authenticated
using (false)
with check (false);

create policy no_direct_payment_delete
on public.payment_transactions for delete
to authenticated
using (false);

create or replace function public.seed_free_subscription_for_user(p_user_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare v_plan_id uuid;
begin
  if p_user_id is null then
    return;
  end if;

  select id into v_plan_id from public.plans where slug = 'free' limit 1;
  if v_plan_id is null then
    return;
  end if;

  insert into public.subscriptions (user_id, plan_id, status, provider, provider_subscription_id, started_at, expires_at, cancelled_at, created_at, updated_at)
  values (p_user_id, v_plan_id, 'ACTIVE', 'SYSTEM', null, now(), null, null, now(), now())
  on conflict (user_id) do update
  set plan_id = excluded.plan_id,
      status = 'ACTIVE',
      provider = 'SYSTEM',
      expires_at = null,
      cancelled_at = null,
      updated_at = now();
end;
$$;

create or replace function public.get_user_billing_summary(p_user_id uuid default auth.uid())
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare subscription_payload jsonb;
declare transactions_payload jsonb;
begin
  if p_user_id is null then
    raise exception 'Authentication required';
  end if;

  select jsonb_build_object(
    'id', s.id,
    'user_id', s.user_id,
    'plan_id', s.plan_id,
    'plan_slug', p.slug,
    'plan_name', p.name,
    'status', s.status,
    'provider', s.provider,
    'started_at', s.started_at,
    'expires_at', s.expires_at,
    'cancelled_at', s.cancelled_at,
    'price_pkr', p.price_pkr
  ) into subscription_payload
  from public.subscriptions s
  join public.plans p on p.id = s.plan_id
  where s.user_id = p_user_id
  order by s.started_at desc, s.created_at desc
  limit 1;

  if subscription_payload is null then
    select jsonb_build_object(
      'id', null,
      'user_id', p_user_id,
      'plan_id', p.id,
      'plan_slug', p.slug,
      'plan_name', p.name,
      'status', 'ACTIVE',
      'provider', 'SYSTEM',
      'started_at', now(),
      'expires_at', null,
      'cancelled_at', null,
      'price_pkr', p.price_pkr
    ) into subscription_payload
    from public.plans p
    where p.slug = 'free';
  end if;

  select coalesce(jsonb_agg(to_jsonb(tx) order by tx.created_at desc), '[]'::jsonb)
  into transactions_payload
  from (
    select pt.id, pt.user_id, pt.plan_id, p.slug as plan_slug, p.name as plan_name, pt.provider,
           pt.amount_pkr, pt.currency, pt.status, pt.payment_method,
           pt.provider_response_reference, pt.created_at, pt.updated_at
    from public.payment_transactions pt
    join public.plans p on p.id = pt.plan_id
    where pt.user_id = p_user_id
  ) tx;

  return jsonb_build_object(
    'subscription', subscription_payload,
    'transactions', transactions_payload
  );
end;
$$;

grant execute on function public.get_user_billing_summary(uuid) to authenticated;

create or replace function public.create_plan_checkout(p_plan_slug text)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare v_user_id uuid := auth.uid();
declare v_plan public.plans%rowtype;
declare v_transaction_id uuid;
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

  insert into public.payment_transactions (user_id, plan_id, provider, amount_pkr, currency, status, payment_method, provider_response_reference)
  values (v_user_id, v_plan.id, 'JAZZCASH', v_plan.price_pkr, 'PKR', 'PENDING', 'JAZZCASH', gen_random_uuid()::text)
  returning id into v_transaction_id;

  return jsonb_build_object(
    'plan_slug', v_plan.slug,
    'plan_name', v_plan.name,
    'amount_pkr', v_plan.price_pkr,
    'payment_required', true,
    'status', 'PENDING',
    'provider', 'JAZZCASH',
    'requires_provider', true,
    'transaction_id', v_transaction_id,
    'provider_status', 'CONFIG_REQUIRED',
    'message', 'JazzCash configuration is required before live payment verification can be completed.'
  );
end;
$$;

grant execute on function public.create_plan_checkout(text) to authenticated;

create or replace function public.confirm_payment_transaction(p_transaction_id uuid, p_provider_reference text default null)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare v_tx public.payment_transactions%rowtype;
declare v_plan public.plans%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  select * into v_tx
  from public.payment_transactions
  where id = p_transaction_id;

  if not found then
    raise exception 'Transaction not found';
  end if;

  if v_tx.user_id <> auth.uid() then
    raise exception 'Cannot access another user transaction';
  end if;

  if v_tx.status = 'SUCCESS' then
    return jsonb_build_object('status', 'ALREADY_ACTIVE', 'transaction_id', v_tx.id);
  end if;

  if v_tx.status <> 'PENDING' then
    raise exception 'Only pending transactions can be confirmed';
  end if;

  select * into v_plan
  from public.plans
  where id = v_tx.plan_id;

  update public.payment_transactions
  set status = 'SUCCESS',
      provider_response_reference = coalesce(p_provider_reference, provider_response_reference),
      updated_at = now()
  where id = v_tx.id;

  insert into public.subscriptions (user_id, plan_id, status, provider, provider_subscription_id, started_at, expires_at, cancelled_at, created_at, updated_at)
  values (v_tx.user_id, v_tx.plan_id, 'ACTIVE', v_tx.provider, coalesce(v_tx.provider_transaction_id, p_provider_reference), now(), null, null, now(), now())
  on conflict (user_id)
  do update
  set plan_id = excluded.plan_id,
      status = 'ACTIVE',
      provider = excluded.provider,
      provider_subscription_id = coalesce(excluded.provider_subscription_id, public.subscriptions.provider_subscription_id),
      started_at = now(),
      expires_at = null,
      cancelled_at = null,
      updated_at = now();

  return jsonb_build_object(
    'status', 'SUCCESS',
    'transaction_id', v_tx.id,
    'plan_slug', v_plan.slug,
    'plan_name', v_plan.name,
    'amount_pkr', v_tx.amount_pkr,
    'provider', v_tx.provider
  );
end;
$$;

grant execute on function public.confirm_payment_transaction(uuid, text) to authenticated;

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

  perform public.seed_free_subscription_for_user(new.id);

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

DO $$
BEGIN
  if not exists (select 1 from pg_proc where proname = 'create_plan_checkout') then
    raise exception 'Payment checkout function was not created';
  end if;
  if not exists (select 1 from pg_proc where proname = 'get_user_billing_summary') then
    raise exception 'Billing summary function was not created';
  end if;
END $$;

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
  provider text not null default 'JAZZCASH' check (provider in ('JAZZCASH', 'FUTURE_PROVIDER', 'MANUAL')),
  provider_transaction_id text,
  amount_pkr integer not null default 0 check (amount_pkr >= 0),
  currency text not null default 'PKR' check (currency = 'PKR'),
  status text not null default 'CREATED' check (status in ('CREATED', 'PENDING', 'SUCCESS', 'FAILED', 'CANCELLED', 'REFUNDED', 'EXPIRED', 'APPROVED', 'REJECTED')),
  payment_method text default 'JAZZCASH',
  provider_response_reference text,
  sender_name text,
  sender_phone text,
  transaction_reference text,
  payment_date date,
  payment_time time,
  payment_screenshot_url text,
  notes text,
  admin_notes text,
  verified_by uuid references auth.users(id) on delete set null,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.payment_settings (
  id uuid primary key default gen_random_uuid(),
  payment_method text not null default 'JAZZCASH_MANUAL' check (payment_method = 'JAZZCASH_MANUAL'),
  bank_name text not null default 'NAYAPAY',
  account_title text not null default 'MUHAMMAD MIQDAD HAIDER',
  account_number text not null default '03052231414',
  mobile_number text not null default '03052231414',
  instructions text not null default 'Important: In JazzCash or any bank transfer flow, select NAYAPAY and send the exact amount to the account details below. Then submit the payment proof on FaujPrep for manual verification.',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.payment_transactions
  add column if not exists sender_name text,
  add column if not exists sender_phone text,
  add column if not exists transaction_reference text,
  add column if not exists payment_date date,
  add column if not exists payment_time time,
  add column if not exists payment_screenshot_url text,
  add column if not exists notes text,
  add column if not exists admin_notes text,
  add column if not exists verified_by uuid references auth.users(id) on delete set null,
  add column if not exists verified_at timestamptz;

alter table public.payment_transactions
  alter column payment_method set default 'JAZZCASH_MANUAL';

alter table public.payment_transactions
  alter column currency set default 'PKR';

alter table public.payment_transactions
  alter column status set default 'PENDING';

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE table_schema = 'public' AND table_name = 'payment_transactions' AND constraint_name = 'payment_transactions_status_check'
  ) THEN
    ALTER TABLE public.payment_transactions DROP CONSTRAINT payment_transactions_status_check;
  END IF;
END $$;

alter table public.payment_transactions
  add constraint payment_transactions_status_check
  check (status in ('CREATED','PENDING','APPROVED','REJECTED','CANCELLED','SUCCESS','FAILED','REFUNDED','EXPIRED'))
  not valid;

create index if not exists payment_transactions_reference_idx on public.payment_transactions (lower(transaction_reference));
create index if not exists payment_settings_active_idx on public.payment_settings (is_active, updated_at desc);

create or replace function public.get_active_payment_settings()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v_settings public.payment_settings%rowtype;
begin
  select * into v_settings
  from public.payment_settings
  where is_active = true
  order by updated_at desc
  limit 1;

  if not found then
    insert into public.payment_settings (
      payment_method,
      bank_name,
      account_title,
      account_number,
      mobile_number,
      instructions,
      is_active
    ) values (
      'JAZZCASH_MANUAL',
      'NAYAPAY',
      'MUHAMMAD MIQDAD HAIDER',
      '03052231414',
      '03052231414',
      'Important: In JazzCash or any bank transfer flow, select NAYAPAY and send the exact amount to the account details below. Then submit the payment proof on FaujPrep for manual verification.',
      true
    ) returning * into v_settings;
  end if;

  return jsonb_build_object(
    'payment_method', v_settings.payment_method,
    'bank_name', v_settings.bank_name,
    'account_title', v_settings.account_title,
    'account_number', v_settings.account_number,
    'mobile_number', v_settings.mobile_number,
    'instructions', v_settings.instructions,
    'is_active', v_settings.is_active,
    'updated_at', v_settings.updated_at
  );
end;
$$;

grant execute on function public.get_active_payment_settings() to authenticated;

create or replace function public.upsert_payment_settings(
  p_payment_method text default 'JAZZCASH_MANUAL',
  p_bank_name text default 'NAYAPAY',
  p_account_title text default 'MUHAMMAD MIQDAD HAIDER',
  p_account_number text default '03052231414',
  p_mobile_number text default '03052231414',
  p_instructions text default 'Important: In JazzCash or any bank transfer flow, select NAYAPAY and send the exact amount to the account details below. Then submit the payment proof on FaujPrep for manual verification.'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v_user_id uuid := auth.uid();
declare v_row public.payment_settings%rowtype;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  if not public.is_editor_or_admin() then
    raise exception 'Admin access required';
  end if;

  insert into public.payment_settings (
    payment_method,
    bank_name,
    account_title,
    account_number,
    mobile_number,
    instructions,
    is_active,
    updated_at
  ) values (
    coalesce(p_payment_method, 'JAZZCASH_MANUAL'),
    coalesce(p_bank_name, 'NAYAPAY'),
    coalesce(p_account_title, 'MUHAMMAD MIQDAD HAIDER'),
    coalesce(p_account_number, '03052231414'),
    coalesce(p_mobile_number, '03052231414'),
    coalesce(p_instructions, 'Important: In JazzCash or any bank transfer flow, select NAYAPAY and send the exact amount to the account details below. Then submit the payment proof on FaujPrep for manual verification.'),
    true,
    now()
  )
  on conflict (id) do nothing
  returning * into v_row;

  if v_row.id is null then
    select * into v_row
    from public.payment_settings
    where is_active = true
    order by updated_at desc
    limit 1;
  end if;

  update public.payment_settings
  set payment_method = coalesce(p_payment_method, payment_method),
      bank_name = coalesce(p_bank_name, bank_name),
      account_title = coalesce(p_account_title, account_title),
      account_number = coalesce(p_account_number, account_number),
      mobile_number = coalesce(p_mobile_number, mobile_number),
      instructions = coalesce(p_instructions, instructions),
      is_active = true,
      updated_at = now()
  where id = v_row.id;

  return jsonb_build_object(
    'payment_method', coalesce(p_payment_method, v_row.payment_method),
    'bank_name', coalesce(p_bank_name, v_row.bank_name),
    'account_title', coalesce(p_account_title, v_row.account_title),
    'account_number', coalesce(p_account_number, v_row.account_number),
    'mobile_number', coalesce(p_mobile_number, v_row.mobile_number),
    'instructions', coalesce(p_instructions, v_row.instructions),
    'is_active', true
  );
end;
$$;

grant execute on function public.upsert_payment_settings(text, text, text, text, text, text) to authenticated;

create or replace function public.submit_manual_payment_proof(
  p_plan_slug text,
  p_sender_name text,
  p_sender_phone text,
  p_transaction_reference text,
  p_payment_date date,
  p_payment_time time,
  p_payment_screenshot_url text,
  p_notes text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v_user_id uuid := auth.uid();
declare v_plan public.plans%rowtype;
declare v_ref_count integer;
declare v_payment_id uuid;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  if trim(coalesce(p_sender_name, '')) = '' then
    raise exception 'Sender name is required';
  end if;

  if trim(coalesce(p_sender_phone, '')) = '' then
    raise exception 'JazzCash mobile number is required';
  end if;

  if trim(coalesce(p_transaction_reference, '')) = '' then
    raise exception 'Transaction reference is required';
  end if;

  if p_payment_date is null then
    raise exception 'Payment date is required';
  end if;

  select * into v_plan
  from public.plans
  where slug = p_plan_slug and is_active = true;

  if not found then
    raise exception 'Invalid plan selection';
  end if;

  select count(*) into v_ref_count
  from public.payment_transactions
  where lower(transaction_reference) = lower(trim(p_transaction_reference));

  if coalesce(v_ref_count, 0) > 0 then
    raise exception 'This transaction reference has already been submitted. Please use a unique JazzCash reference.';
  end if;

  insert into public.payment_transactions (
    user_id,
    plan_id,
    amount_pkr,
    currency,
    payment_method,
    sender_name,
    sender_phone,
    transaction_reference,
    payment_date,
    payment_time,
    payment_screenshot_url,
    notes,
    status,
    created_at,
    updated_at
  ) values (
    v_user_id,
    v_plan.id,
    v_plan.price_pkr,
    'PKR',
    'JAZZCASH_MANUAL',
    trim(p_sender_name),
    trim(p_sender_phone),
    trim(p_transaction_reference),
    p_payment_date,
    p_payment_time,
    p_payment_screenshot_url,
    p_notes,
    'PENDING',
    now(),
    now()
  ) returning id into v_payment_id;

  return jsonb_build_object(
    'id', v_payment_id,
    'status', 'PENDING',
    'plan_slug', v_plan.slug,
    'amount_pkr', v_plan.price_pkr,
    'message', 'Payment submitted successfully. Your payment is pending verification and premium access will be activated after admin approval.'
  );
end;
$$;

grant execute on function public.submit_manual_payment_proof(text, text, text, text, date, time, text, text) to authenticated;

create or replace function public.get_my_payment_transactions()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  return coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', pt.id,
        'user_id', pt.user_id,
        'plan_id', pt.plan_id,
        'plan_slug', p.slug,
        'plan_name', p.name,
        'amount_pkr', pt.amount_pkr,
        'currency', pt.currency,
        'payment_method', pt.payment_method,
        'sender_name', pt.sender_name,
        'sender_phone', pt.sender_phone,
        'transaction_reference', pt.transaction_reference,
        'payment_date', pt.payment_date,
        'payment_time', pt.payment_time,
        'payment_screenshot_url', pt.payment_screenshot_url,
        'notes', pt.notes,
        'status', pt.status,
        'admin_notes', pt.admin_notes,
        'verified_by', pt.verified_by,
        'verified_at', pt.verified_at,
        'created_at', pt.created_at,
        'updated_at', pt.updated_at
      ) order by pt.created_at desc
    ), '[]'::jsonb
  )
  from public.payment_transactions pt
  join public.plans p on p.id = pt.plan_id
  where pt.user_id = v_user_id;
end;
$$;

grant execute on function public.get_my_payment_transactions() to authenticated;

create or replace function public.get_admin_payment_queue()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_editor_or_admin() then
    raise exception 'Admin access required';
  end if;

  return coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', pt.id,
        'user_id', pt.user_id,
        'user_email', u.email,
        'plan_id', pt.plan_id,
        'plan_name', p.name,
        'plan_slug', p.slug,
        'amount_pkr', pt.amount_pkr,
        'currency', pt.currency,
        'payment_method', pt.payment_method,
        'sender_name', pt.sender_name,
        'sender_phone', pt.sender_phone,
        'transaction_reference', pt.transaction_reference,
        'payment_date', pt.payment_date,
        'payment_time', pt.payment_time,
        'payment_screenshot_url', pt.payment_screenshot_url,
        'notes', pt.notes,
        'status', pt.status,
        'admin_notes', pt.admin_notes,
        'verified_by', pt.verified_by,
        'verified_at', pt.verified_at,
        'created_at', pt.created_at,
        'updated_at', pt.updated_at
      ) order by pt.created_at desc
    ), '[]'::jsonb
  )
  from public.payment_transactions pt
  join public.plans p on p.id = pt.plan_id
  join auth.users u on u.id = pt.user_id;
end;
$$;

grant execute on function public.get_admin_payment_queue() to authenticated;

create or replace function public.admin_approve_payment(
  p_payment_id uuid,
  p_admin_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v_user_id uuid;
declare v_payment public.payment_transactions%rowtype;
declare v_plan public.plans%rowtype;
begin
  if not public.is_editor_or_admin() then
    raise exception 'Admin access required';
  end if;

  select * into v_payment
  from public.payment_transactions
  where id = p_payment_id
  for update;

  if not found then
    raise exception 'Payment record not found';
  end if;

  select * into v_plan
  from public.plans
  where id = v_payment.plan_id;

  if v_payment.amount_pkr <> v_plan.price_pkr then
    raise exception 'Payment amount does not match the selected plan price.';
  end if;

  if v_payment.status = 'APPROVED' then
    return jsonb_build_object('status', 'APPROVED', 'payment_id', v_payment.id, 'plan_slug', v_plan.slug);
  end if;

  update public.payment_transactions
  set status = 'APPROVED',
      admin_notes = coalesce(p_admin_notes, admin_notes, 'Payment verified by admin.'),
      verified_by = auth.uid(),
      verified_at = now(),
      updated_at = now()
  where id = v_payment.id;

  insert into public.subscriptions (user_id, plan_id, status, provider, provider_subscription_id, started_at, expires_at, cancelled_at, created_at, updated_at)
  values (v_payment.user_id, v_payment.plan_id, 'ACTIVE', 'MANUAL', coalesce(v_payment.transaction_reference, v_payment.id::text), now(), null, null, now(), now())
  on conflict (user_id)
  do update
  set plan_id = excluded.plan_id,
      status = 'ACTIVE',
      provider = 'MANUAL',
      provider_subscription_id = coalesce(excluded.provider_subscription_id, public.subscriptions.provider_subscription_id),
      started_at = now(),
      expires_at = null,
      cancelled_at = null,
      updated_at = now();

  return jsonb_build_object(
    'status', 'APPROVED',
    'payment_id', v_payment.id,
    'user_id', v_payment.user_id,
    'plan_slug', v_plan.slug,
    'amount_pkr', v_payment.amount_pkr,
    'verified_by', auth.uid()
  );
end;
$$;

grant execute on function public.admin_approve_payment(uuid, text) to authenticated;

create or replace function public.admin_reject_payment(
  p_payment_id uuid,
  p_admin_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v_payment public.payment_transactions%rowtype;
begin
  if not public.is_editor_or_admin() then
    raise exception 'Admin access required';
  end if;

  select * into v_payment
  from public.payment_transactions
  where id = p_payment_id
  for update;

  if not found then
    raise exception 'Payment record not found';
  end if;

  update public.payment_transactions
  set status = 'REJECTED',
      admin_notes = coalesce(p_admin_notes, admin_notes, 'Payment could not be verified.'),
      verified_by = auth.uid(),
      verified_at = now(),
      updated_at = now()
  where id = v_payment.id;

  return jsonb_build_object(
    'status', 'REJECTED',
    'payment_id', v_payment.id,
    'user_id', v_payment.user_id,
    'amount_pkr', v_payment.amount_pkr,
    'message', 'Payment rejected and no premium access was granted.'
  );
end;
$$;

grant execute on function public.admin_reject_payment(uuid, text) to authenticated;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'plans' AND column_name = 'billing_interval'
  ) THEN
    UPDATE public.plans
    SET price_pkr = 0, name = 'Free', slug = 'free'
    WHERE slug = 'free';

    UPDATE public.plans
    SET price_pkr = 1999, name = 'Pro', slug = 'pro'
    WHERE slug = 'pro';

    UPDATE public.plans
    SET price_pkr = 4999, name = 'Premium', slug = 'premium'
    WHERE slug = 'premium';
  END IF;
END $$;

insert into public.plans (name, slug, description, price_pkr, billing_interval, is_active, display_order)
values
  ('Free', 'free', 'Basic preparation access with premium resources protected.', 0, 'ONE_TIME', true, 1),
  ('Pro', 'pro', 'Expanded question practice, mock tests, materials, and premium preparation access.', 1999, 'ONE_TIME', true, 2),
  ('Premium', 'premium', 'Complete premium preparation access for all protected study and practice content.', 4999, 'ONE_TIME', true, 3)
on conflict (slug) do update
set name = excluded.name,
    description = excluded.description,
    price_pkr = excluded.price_pkr,
    billing_interval = excluded.billing_interval,
    is_active = excluded.is_active,
    display_order = excluded.display_order,
    updated_at = now();

insert into public.payment_settings (payment_method, bank_name, account_title, account_number, mobile_number, instructions, is_active)
values (
  'JAZZCASH_MANUAL',
  'NAYAPAY',
  'MUHAMMAD MIQDAD HAIDER',
  '03052231414',
  '03052231414',
  'Important: In JazzCash or any bank transfer flow, select NAYAPAY and send the exact amount to the account details below. Then submit the payment proof on FaujPrep for manual verification.',
  true
)
on conflict do nothing;

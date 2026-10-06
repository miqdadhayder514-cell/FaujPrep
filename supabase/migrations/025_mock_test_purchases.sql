begin;

create table if not exists public.mock_test_purchase_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  test_slug text not null check (test_slug in (
    'pma-long-course-159-mock-test-2',
    'pma-long-course-159-most-repeated-questions-bank',
    'academic-portion-mock-test-2'
  )),
  amount_pkr integer not null check (
    (test_slug = 'pma-long-course-159-mock-test-2' and amount_pkr = 49)
    or (test_slug = 'pma-long-course-159-most-repeated-questions-bank' and amount_pkr = 79)
    or (test_slug = 'academic-portion-mock-test-2' and amount_pkr = 20)
  ),
  currency text not null default 'PKR' check (currency = 'PKR'),
  payment_method text not null default 'NAYAPAY_MANUAL',
  sender_name text not null,
  sender_phone text not null,
  payment_date date not null,
  payment_time time,
  payment_screenshot_url text not null,
  notes text,
  status text not null default 'PENDING' check (status in ('PENDING', 'APPROVED', 'REJECTED')),
  admin_notes text,
  verified_by uuid references auth.users(id) on delete set null,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists mock_test_purchase_one_active_request_idx
  on public.mock_test_purchase_requests (user_id, test_slug)
  where status in ('PENDING', 'APPROVED');

create index if not exists mock_test_purchase_admin_queue_idx
  on public.mock_test_purchase_requests (status, created_at desc);

alter table public.mock_test_purchase_requests enable row level security;
revoke all on table public.mock_test_purchase_requests from anon, authenticated;

drop trigger if exists mock_test_purchase_requests_updated_at on public.mock_test_purchase_requests;
create trigger mock_test_purchase_requests_updated_at
before update on public.mock_test_purchase_requests
for each row execute function public.set_updated_at();

create table if not exists public.paid_mock_test_question_banks (
  test_slug text primary key check (test_slug in (
    'pma-long-course-159-mock-test-2',
    'pma-long-course-159-most-repeated-questions-bank',
    'academic-portion-mock-test-2'
  )),
  questions jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.paid_mock_test_question_banks enable row level security;
revoke all on table public.paid_mock_test_question_banks from anon, authenticated;

create or replace function public.get_my_mock_test_purchases()
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

  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', purchase.id,
      'test_slug', purchase.test_slug,
      'test_title', case purchase.test_slug
        when 'pma-long-course-159-mock-test-2' then 'PMA Long Course 159 Mock Test 2'
        when 'pma-long-course-159-most-repeated-questions-bank' then 'PMA Long Course 159 Most Repeated Questions Bank'
        when 'academic-portion-mock-test-2' then 'Academic Portion Mock Test 2'
      end,
      'amount_pkr', purchase.amount_pkr,
      'status', purchase.status,
      'admin_notes', purchase.admin_notes,
      'created_at', purchase.created_at,
      'verified_at', purchase.verified_at
    ) order by purchase.created_at desc)
    from public.mock_test_purchase_requests purchase
    where purchase.user_id = v_user_id
  ), '[]'::jsonb);
end;
$$;

create or replace function public.submit_mock_test_payment_proof(
  p_test_slug text,
  p_sender_name text,
  p_sender_phone text,
  p_payment_date date,
  p_payment_time time,
  p_payment_screenshot_url text,
  p_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v_user_id uuid := auth.uid();
declare v_amount_pkr integer;
declare v_purchase_id uuid;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  v_amount_pkr := case p_test_slug
    when 'pma-long-course-159-mock-test-2' then 49
    when 'pma-long-course-159-most-repeated-questions-bank' then 79
    when 'academic-portion-mock-test-2' then 20
    else null
  end;
  if v_amount_pkr is null then
    raise exception 'This mock test is not available for individual purchase';
  end if;

  if trim(coalesce(p_sender_name, '')) = '' or trim(coalesce(p_sender_phone, '')) = '' then
    raise exception 'Sender name and phone number are required';
  end if;
  if p_payment_date is null then
    raise exception 'Payment date is required';
  end if;
  if trim(coalesce(p_payment_screenshot_url, '')) = '' or not exists (
    select 1 from storage.objects
    where bucket_id = 'payment-screenshots'
      and name = trim(p_payment_screenshot_url)
      and split_part(name, '/', 1) = v_user_id::text
  ) then
    raise exception 'Upload a valid payment screenshot before submitting';
  end if;

  if exists (
    select 1 from public.mock_test_purchase_requests
    where user_id = v_user_id and test_slug = p_test_slug and status = 'APPROVED'
  ) then
    raise exception 'You already have permanent access to this mock test';
  end if;

  if exists (
    select 1 from public.mock_test_purchase_requests
    where user_id = v_user_id and test_slug = p_test_slug and status = 'PENDING'
  ) then
    raise exception 'A payment request for this mock test is already pending';
  end if;

  insert into public.mock_test_purchase_requests (
    user_id, test_slug, amount_pkr, payment_method, sender_name, sender_phone,
    payment_date, payment_time, payment_screenshot_url, notes
  ) values (
    v_user_id, p_test_slug, v_amount_pkr, 'NAYAPAY_MANUAL',
    trim(p_sender_name), trim(p_sender_phone), p_payment_date, p_payment_time,
    trim(p_payment_screenshot_url), nullif(trim(coalesce(p_notes, '')), '')
  ) returning id into v_purchase_id;

  return jsonb_build_object(
    'id', v_purchase_id,
    'test_slug', p_test_slug,
    'amount_pkr', v_amount_pkr,
    'status', 'PENDING',
    'message', 'Payment proof submitted. Access will be enabled after admin approval.'
  );
exception
  when unique_violation then
    raise exception 'A payment request for this mock test is already pending or approved';
end;
$$;

create or replace function public.get_admin_mock_test_purchase_queue()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_editor_or_admin() then
    raise exception 'Admin access required';
  end if;

  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', purchase.id,
      'purchase_type', 'MOCK_TEST',
      'test_slug', purchase.test_slug,
      'test_title', case purchase.test_slug
        when 'pma-long-course-159-mock-test-2' then 'PMA Long Course 159 Mock Test 2'
        when 'pma-long-course-159-most-repeated-questions-bank' then 'PMA Long Course 159 Most Repeated Questions Bank'
        when 'academic-portion-mock-test-2' then 'Academic Portion Mock Test 2'
      end,
      'user_id', purchase.user_id,
      'user_email', account.email,
      'amount_pkr', purchase.amount_pkr,
      'currency', purchase.currency,
      'payment_method', purchase.payment_method,
      'sender_name', purchase.sender_name,
      'sender_phone', purchase.sender_phone,
      'payment_date', purchase.payment_date,
      'payment_time', purchase.payment_time,
      'payment_screenshot_url', purchase.payment_screenshot_url,
      'notes', purchase.notes,
      'status', purchase.status,
      'admin_notes', purchase.admin_notes,
      'verified_by', purchase.verified_by,
      'verified_at', purchase.verified_at,
      'created_at', purchase.created_at,
      'updated_at', purchase.updated_at
    ) order by purchase.created_at desc)
    from public.mock_test_purchase_requests purchase
    join auth.users account on account.id = purchase.user_id
  ), '[]'::jsonb);
end;
$$;

create or replace function public.admin_approve_mock_test_purchase(
  p_purchase_id uuid,
  p_admin_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v_purchase public.mock_test_purchase_requests%rowtype;
begin
  if not public.is_editor_or_admin() then
    raise exception 'Admin access required';
  end if;

  select * into v_purchase
  from public.mock_test_purchase_requests
  where id = p_purchase_id
  for update;
  if not found then
    raise exception 'Mock-test payment request not found';
  end if;
  if v_purchase.status = 'APPROVED' then
    return jsonb_build_object('status', 'APPROVED', 'purchase_id', v_purchase.id, 'test_slug', v_purchase.test_slug);
  end if;
  if v_purchase.status <> 'PENDING' then
    raise exception 'Only pending mock-test payments can be approved';
  end if;

  update public.mock_test_purchase_requests
  set status = 'APPROVED',
      admin_notes = coalesce(p_admin_notes, admin_notes, 'Payment verified by admin.'),
      verified_by = auth.uid(),
      verified_at = now(),
      updated_at = now()
  where id = v_purchase.id;

  return jsonb_build_object(
    'status', 'APPROVED',
    'purchase_id', v_purchase.id,
    'user_id', v_purchase.user_id,
    'test_slug', v_purchase.test_slug,
    'amount_pkr', v_purchase.amount_pkr
  );
end;
$$;

create or replace function public.admin_reject_mock_test_purchase(
  p_purchase_id uuid,
  p_admin_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v_purchase public.mock_test_purchase_requests%rowtype;
begin
  if not public.is_editor_or_admin() then
    raise exception 'Admin access required';
  end if;

  select * into v_purchase
  from public.mock_test_purchase_requests
  where id = p_purchase_id
  for update;
  if not found then
    raise exception 'Mock-test payment request not found';
  end if;
  if v_purchase.status = 'REJECTED' then
    return jsonb_build_object('status', 'REJECTED', 'purchase_id', v_purchase.id, 'test_slug', v_purchase.test_slug);
  end if;
  if v_purchase.status <> 'PENDING' then
    raise exception 'Only pending mock-test payments can be rejected';
  end if;

  update public.mock_test_purchase_requests
  set status = 'REJECTED',
      admin_notes = coalesce(p_admin_notes, admin_notes, 'Payment could not be verified.'),
      verified_by = auth.uid(),
      verified_at = now(),
      updated_at = now()
  where id = v_purchase.id;

  return jsonb_build_object(
    'status', 'REJECTED',
    'purchase_id', v_purchase.id,
    'user_id', v_purchase.user_id,
    'test_slug', v_purchase.test_slug,
    'amount_pkr', v_purchase.amount_pkr
  );
end;
$$;

create or replace function public.get_paid_mock_test_questions(p_test_slug text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v_user_id uuid := auth.uid();
declare v_questions jsonb;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;
  if p_test_slug not in ('pma-long-course-159-mock-test-2', 'pma-long-course-159-most-repeated-questions-bank', 'academic-portion-mock-test-2') then
    raise exception 'This mock test is not available for individual purchase';
  end if;

  if not exists (
    select 1
    from public.mock_test_purchase_requests purchase
    where purchase.user_id = v_user_id
      and purchase.test_slug = p_test_slug
      and purchase.status = 'APPROVED'
  ) then
    raise exception 'An approved purchase on this account is required to access this mock test';
  end if;

  select questions into v_questions
  from public.paid_mock_test_question_banks
  where test_slug = p_test_slug;
  if v_questions is null then
    raise exception 'Mock-test questions are not available';
  end if;
  return v_questions;
end;
$$;

revoke all on function public.get_my_mock_test_purchases() from public, anon;
revoke all on function public.submit_mock_test_payment_proof(text, text, text, date, time, text, text) from public, anon;
revoke all on function public.get_admin_mock_test_purchase_queue() from public, anon;
revoke all on function public.admin_approve_mock_test_purchase(uuid, text) from public, anon;
revoke all on function public.admin_reject_mock_test_purchase(uuid, text) from public, anon;
revoke all on function public.get_paid_mock_test_questions(text) from public, anon;

grant execute on function public.get_my_mock_test_purchases() to authenticated;
grant execute on function public.submit_mock_test_payment_proof(text, text, text, date, time, text, text) to authenticated;
grant execute on function public.get_admin_mock_test_purchase_queue() to authenticated;
grant execute on function public.admin_approve_mock_test_purchase(uuid, text) to authenticated;
grant execute on function public.admin_reject_mock_test_purchase(uuid, text) to authenticated;
grant execute on function public.get_paid_mock_test_questions(text) to authenticated;

commit;
begin;

alter table public.mock_test_purchase_requests
  drop constraint if exists mock_test_purchase_requests_check;

alter table public.mock_test_purchase_requests
  drop constraint if exists mock_test_purchase_requests_test_slug_check;

alter table public.mock_test_purchase_requests
  add constraint mock_test_purchase_requests_test_slug_check
  check (test_slug in (
    'pma-long-course-159-mock-test-2',
    'pma-long-course-159-most-repeated-questions-bank',
    'academic-portion-mock-test-2'
  ));

alter table public.mock_test_purchase_requests
  drop constraint if exists mock_test_purchase_requests_amount_pkr_check;

alter table public.mock_test_purchase_requests
  add constraint mock_test_purchase_requests_amount_pkr_check
  check (
    (test_slug = 'pma-long-course-159-mock-test-2' and amount_pkr = 49)
    or (test_slug = 'pma-long-course-159-most-repeated-questions-bank' and amount_pkr = 79)
    or (test_slug = 'academic-portion-mock-test-2' and amount_pkr = 20)
  );

alter table public.mock_test_purchase_requests
  drop constraint if exists mock_test_purchase_requests_currency_check;

alter table public.mock_test_purchase_requests
  add constraint mock_test_purchase_requests_currency_check
  check (currency = 'PKR');

alter table public.mock_test_purchase_requests
  drop constraint if exists mock_test_purchase_requests_status_check;

alter table public.mock_test_purchase_requests
  add constraint mock_test_purchase_requests_status_check
  check (status in ('PENDING', 'APPROVED', 'REJECTED'));

create unique index if not exists mock_test_purchase_one_active_request_idx
  on public.mock_test_purchase_requests (user_id, test_slug)
  where status in ('PENDING', 'APPROVED');

alter table public.mock_test_purchase_requests enable row level security;
revoke all on table public.mock_test_purchase_requests from public, anon, authenticated;

alter table public.paid_mock_test_question_banks
  drop constraint if exists paid_mock_test_question_banks_test_slug_check;

alter table public.paid_mock_test_question_banks
  add constraint paid_mock_test_question_banks_test_slug_check
  check (test_slug in (
    'pma-long-course-159-mock-test-2',
    'pma-long-course-159-most-repeated-questions-bank',
    'academic-portion-mock-test-2'
  ));

alter table public.paid_mock_test_question_banks enable row level security;
revoke all on table public.paid_mock_test_question_banks from public, anon, authenticated;

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
    where user_id = v_user_id
      and test_slug = p_test_slug
      and status = 'APPROVED'
  ) then
    raise exception 'You already have permanent access to this mock test';
  end if;
  if exists (
    select 1 from public.mock_test_purchase_requests
    where user_id = v_user_id
      and test_slug = p_test_slug
      and status = 'PENDING'
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
  if p_test_slug not in (
    'pma-long-course-159-mock-test-2',
    'pma-long-course-159-most-repeated-questions-bank',
    'academic-portion-mock-test-2'
  ) then
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

revoke all on function public.submit_mock_test_payment_proof(text, text, text, date, time, text, text) from public, anon;
grant execute on function public.submit_mock_test_payment_proof(text, text, text, date, time, text, text) to authenticated;

revoke all on function public.get_paid_mock_test_questions(text) from public, anon;
grant execute on function public.get_paid_mock_test_questions(text) to authenticated;

commit;

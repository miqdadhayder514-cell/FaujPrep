-- Final RPC repair for PMA Long Course 159 Mock Tests 5 and 6.
begin;

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
    when 'pma-long-course-159-mock-test-5' then 100
    when 'pma-long-course-159-mock-test-6' then 100
    when 'pma-long-course-159-most-repeated-questions-bank' then 79
    when 'pma-long-course-159-must-come-questions-bank' then 99
    when 'academic-portion-mock-test-2' then 20
    when 'pma-long-course-159-non-verbal-intelligence-test-1' then 49
    when 'pma-long-course-159-non-verbal-intelligence-test-2' then 49
    when 'academic-portion-mock-test-1' then 30
    when 'pma-long-course-159-academic-portion-mock-test-3' then 49
    when 'pma-long-course-academic-portion-most-repeated-questions' then 49
    when 'pma-verbal-intelligence-test-2' then 14
    when 'pma-verbal-intelligence-test-3' then 14
    when 'pma-non-verbal-intelligence-test-2' then 14
    when 'pma-non-verbal-intelligence-test-3' then 14
    when 'pma-analogy-test' then 14
    when 'pma-mathematical-series-test' then 14
    when 'army-initial-practice-mock' then 14
    when 'live-interview-assessment' then 250
    when 'pma-long-course-159-interview-fully-cracked' then 150
    when 'interview-practice-personal' then 50
    when 'interview-practice-academic' then 50
    when 'interview-practice-general-knowledge' then 50
    when 'interview-practice-current-affairs' then 50
    when 'interview-practice-defense' then 50
    when 'interview-practice-rapid-fire' then 50
    when 'interview-practice-mock' then 50
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

notify pgrst, 'reload schema';

commit;

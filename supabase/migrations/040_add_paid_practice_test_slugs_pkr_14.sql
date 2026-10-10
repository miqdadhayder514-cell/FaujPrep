begin;

alter table public.paid_mock_test_question_banks
  drop constraint if exists paid_mock_test_question_banks_test_slug_check;

alter table public.paid_mock_test_question_banks
  add constraint paid_mock_test_question_banks_test_slug_check
  check (test_slug in (
    'pma-long-course-159-mock-test-2',
    'pma-long-course-159-most-repeated-questions-bank',
    'pma-long-course-159-must-come-questions-bank',
    'academic-portion-mock-test-2',
    'pma-long-course-159-non-verbal-intelligence-test-1',
    'pma-long-course-159-non-verbal-intelligence-test-2',
    'academic-portion-mock-test-1',
    'pma-long-course-159-academic-portion-mock-test-3',
    'pma-long-course-academic-portion-most-repeated-questions',
    'pma-verbal-intelligence-test-2',
    'pma-verbal-intelligence-test-3',
    'pma-non-verbal-intelligence-test-2',
    'pma-non-verbal-intelligence-test-3',
    'pma-analogy-test',
    'pma-mathematical-series-test',
    'army-initial-practice-mock'
  ));

alter table public.mock_test_purchase_requests
  drop constraint if exists mock_test_purchase_requests_test_slug_check;

alter table public.mock_test_purchase_requests
  add constraint mock_test_purchase_requests_test_slug_check
  check (test_slug in (
    'pma-long-course-159-mock-test-2',
    'pma-long-course-159-most-repeated-questions-bank',
    'pma-long-course-159-must-come-questions-bank',
    'academic-portion-mock-test-2',
    'pma-long-course-159-non-verbal-intelligence-test-1',
    'pma-long-course-159-non-verbal-intelligence-test-2',
    'academic-portion-mock-test-1',
    'pma-long-course-159-academic-portion-mock-test-3',
    'pma-long-course-academic-portion-most-repeated-questions',
    'pma-academic-notes',
    'pa-academic-notes',
    'pma-academic-tests-notes',
    'pma-non-verbal-intelligence-notes',
    'pma-verbal-intelligence-notes',
    'pma-verbal-intelligence-test-2',
    'pma-verbal-intelligence-test-3',
    'pma-non-verbal-intelligence-test-2',
    'pma-non-verbal-intelligence-test-3',
    'pma-analogy-test',
    'pma-mathematical-series-test',
    'army-initial-practice-mock'
  ));

alter table public.mock_test_purchase_requests
  drop constraint if exists mock_test_purchase_requests_amount_pkr_check;

alter table public.mock_test_purchase_requests
  add constraint mock_test_purchase_requests_amount_pkr_check
  check (
    (test_slug = 'pma-long-course-159-mock-test-2' and amount_pkr = 49)
    or (test_slug = 'pma-long-course-159-most-repeated-questions-bank' and amount_pkr = 79)
    or (test_slug = 'pma-long-course-159-must-come-questions-bank' and amount_pkr = 99)
    or (test_slug = 'academic-portion-mock-test-2' and amount_pkr = 20)
    or (test_slug = 'pma-long-course-159-non-verbal-intelligence-test-1' and amount_pkr = 49)
    or (test_slug = 'pma-long-course-159-non-verbal-intelligence-test-2' and amount_pkr = 49)
    or (test_slug = 'academic-portion-mock-test-1' and amount_pkr = 30)
    or (test_slug = 'pma-long-course-159-academic-portion-mock-test-3' and amount_pkr = 49)
    or (test_slug = 'pma-long-course-academic-portion-most-repeated-questions' and amount_pkr = 49)
    or (test_slug in (
      'pma-academic-notes',
      'pa-academic-notes',
      'pma-academic-tests-notes',
      'pma-non-verbal-intelligence-notes',
      'pma-verbal-intelligence-notes'
    ) and amount_pkr = 14)
    or (test_slug = 'pma-verbal-intelligence-test-2' and amount_pkr = 14)
    or (test_slug = 'pma-verbal-intelligence-test-3' and amount_pkr = 14)
    or (test_slug = 'pma-non-verbal-intelligence-test-2' and amount_pkr = 14)
    or (test_slug = 'pma-non-verbal-intelligence-test-3' and amount_pkr = 14)
    or (test_slug = 'pma-analogy-test' and amount_pkr = 14)
    or (test_slug = 'pma-mathematical-series-test' and amount_pkr = 14)
    or (test_slug = 'army-initial-practice-mock' and amount_pkr = 14)
  );

create or replace function public.can_download_paid_note(p_object_name text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.mock_test_purchase_requests purchase
    where purchase.user_id = auth.uid()
      and purchase.status = 'APPROVED'
      and (
        (purchase.test_slug in ('pma-academic-notes', 'pa-academic-notes') and p_object_name = 'pma-academic-notes.pdf')
        or (purchase.test_slug = 'pma-academic-tests-notes' and p_object_name = 'pma-academic-tests-notes.pdf')
        or (purchase.test_slug = 'pma-non-verbal-intelligence-notes' and p_object_name = 'pma-non-verbal-intelligence-notes.pdf')
        or (purchase.test_slug = 'pma-verbal-intelligence-notes' and p_object_name = 'pma-verbal-intelligence-notes.pdf')
      )
  );
$$;

revoke all on function public.can_download_paid_note(text) from public, anon;
grant execute on function public.can_download_paid_note(text) to authenticated;

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
        when 'pma-long-course-159-must-come-questions-bank' then 'PMA Long Course 159 Must Come Questions Bank'
        when 'academic-portion-mock-test-2' then 'Academic Portion Mock Test 2'
        when 'pma-long-course-159-non-verbal-intelligence-test-1' then 'Non-Verbal Intelligence Test 1 (Most Repeated Questions)'
        when 'pma-long-course-159-non-verbal-intelligence-test-2' then 'Non-Verbal Intelligence Test 2 (Most Repeated Questions)'
        when 'academic-portion-mock-test-1' then 'Academic Portion Mock Test 1'
        when 'pma-long-course-159-academic-portion-mock-test-3' then 'PMA Long 159 Academic Portion Mock Test 3'
        when 'pma-long-course-academic-portion-most-repeated-questions' then 'PMA Long Course Academic Portion Most Repeated Questions'
        when 'pma-academic-notes' then 'PMA Academic Notes'
        when 'pa-academic-notes' then 'PMA Academic Notes'
        when 'pma-academic-tests-notes' then 'PMA Academic Tests Notes'
        when 'pma-non-verbal-intelligence-notes' then 'PMA Non-Verbal Intelligence Notes'
        when 'pma-verbal-intelligence-notes' then 'PMA Verbal Intelligence Notes'
        when 'pma-verbal-intelligence-test-2' then 'PMA Long Course Initial Test — Verbal Intelligence Test 2'
        when 'pma-verbal-intelligence-test-3' then 'PMA Long Course Initial Test — Verbal Intelligence Test 3'
        when 'pma-non-verbal-intelligence-test-2' then 'PMA Long Course Initial Test — Non-Verbal Intelligence Test 2'
        when 'pma-non-verbal-intelligence-test-3' then 'PMA Long Course Initial Test — Non-Verbal Intelligence Test 3'
        when 'pma-analogy-test' then 'PMA Long Course Initial Test — Analogy Test'
        when 'pma-mathematical-series-test' then 'PMA Long Course Initial Test — Mathematical Series Test'
        when 'army-initial-practice-mock' then 'Army Initial Practice Mock'
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
        when 'pma-long-course-159-must-come-questions-bank' then 'PMA Long Course 159 Must Come Questions Bank'
        when 'academic-portion-mock-test-2' then 'Academic Portion Mock Test 2'
        when 'pma-long-course-159-non-verbal-intelligence-test-1' then 'Non-Verbal Intelligence Test 1 (Most Repeated Questions)'
        when 'pma-long-course-159-non-verbal-intelligence-test-2' then 'Non-Verbal Intelligence Test 2 (Most Repeated Questions)'
        when 'academic-portion-mock-test-1' then 'Academic Portion Mock Test 1'
        when 'pma-long-course-159-academic-portion-mock-test-3' then 'PMA Long 159 Academic Portion Mock Test 3'
        when 'pma-long-course-academic-portion-most-repeated-questions' then 'PMA Long Course Academic Portion Most Repeated Questions'
        when 'pma-academic-notes' then 'PMA Academic Notes'
        when 'pa-academic-notes' then 'PMA Academic Notes'
        when 'pma-academic-tests-notes' then 'PMA Academic Tests Notes'
        when 'pma-non-verbal-intelligence-notes' then 'PMA Non-Verbal Intelligence Notes'
        when 'pma-verbal-intelligence-notes' then 'PMA Verbal Intelligence Notes'
        when 'pma-verbal-intelligence-test-2' then 'PMA Long Course Initial Test — Verbal Intelligence Test 2'
        when 'pma-verbal-intelligence-test-3' then 'PMA Long Course Initial Test — Verbal Intelligence Test 3'
        when 'pma-non-verbal-intelligence-test-2' then 'PMA Long Course Initial Test — Non-Verbal Intelligence Test 2'
        when 'pma-non-verbal-intelligence-test-3' then 'PMA Long Course Initial Test — Non-Verbal Intelligence Test 3'
        when 'pma-analogy-test' then 'PMA Long Course Initial Test — Analogy Test'
        when 'pma-mathematical-series-test' then 'PMA Long Course Initial Test — Mathematical Series Test'
        when 'army-initial-practice-mock' then 'Army Initial Practice Mock'
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

create or replace function public.get_admin_paid_note_purchase_queue()
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
      'purchase_type', 'NOTE',
      'test_slug', purchase.test_slug,
      'test_title', case purchase.test_slug
        when 'pma-academic-notes' then 'PMA Academic Notes'
        when 'pa-academic-notes' then 'PMA Academic Notes'
        when 'pma-academic-tests-notes' then 'PMA Academic Tests Notes'
        when 'pma-non-verbal-intelligence-notes' then 'PMA Non-Verbal Intelligence Notes'
        when 'pma-verbal-intelligence-notes' then 'PMA Verbal Intelligence Notes'
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
    where purchase.test_slug in (
      'pma-academic-notes',
      'pa-academic-notes',
      'pma-academic-tests-notes',
      'pma-non-verbal-intelligence-notes',
      'pma-verbal-intelligence-notes'
    )
  ), '[]'::jsonb);
end;
$$;

revoke all on function public.get_admin_paid_note_purchase_queue() from public, anon;
grant execute on function public.get_admin_paid_note_purchase_queue() to authenticated;

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

commit;

begin;

alter table public.mock_test_purchase_requests
  drop constraint if exists mock_test_purchase_requests_test_slug_check;

alter table public.mock_test_purchase_requests
  add constraint mock_test_purchase_requests_test_slug_check
  check (test_slug in (
    'first-full-mock-test',
    'pma-long-course-159-mock-test-2',
    'pma-long-course-159-mock-test-5',
    'pma-long-course-159-mock-test-6',
    'pma-long-course-159-mock-test-7',
    'pma-long-course-159-mock-test-8',
    'pma-long-course-159-mock-test-9',
    'pma-long-course-159-mock-test-10',
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
    'army-initial-practice-mock',
    'live-interview-assessment',
    'pma-long-course-159-interview-fully-cracked',
    'interview-practice-personal',
    'interview-practice-academic',
    'interview-practice-general-knowledge',
    'interview-practice-current-affairs',
    'interview-practice-defense',
    'interview-practice-rapid-fire',
    'interview-practice-mock',
    'pma-lc160-initial-test-foundations',
    'pma-lc160-initial-test-practice-plan',
    'pma-lc160-interview-introduction',
    'pma-lc160-interview-personal-questions',
    'pma-lc160-interview-current-affairs',
    'pma-lc160-issb-group-discussion',
    'pma-lc160-issb-psychological-preparation',
    'pma-lc160-issb-leadership',
    'pma-lc160-physical-progressive-training',
    'pma-lc160-physical-test-day',
    'pma-lc160-preparation-book',
    'pma-lc160-preparation-book-dogars',
    'pma-lc160-preparation-book-faujprep'
  )) not valid;

alter table public.mock_test_purchase_requests
  drop constraint if exists mock_test_purchase_requests_amount_pkr_check;

alter table public.mock_test_purchase_requests
  add constraint mock_test_purchase_requests_amount_pkr_check
  check (
    (test_slug = 'first-full-mock-test' and amount_pkr = 100)
    or (test_slug = 'pma-long-course-159-mock-test-2' and amount_pkr = 49)
    or (test_slug in (
      'pma-long-course-159-mock-test-5',
      'pma-long-course-159-mock-test-6',
      'pma-long-course-159-mock-test-7',
      'pma-long-course-159-mock-test-8',
      'pma-long-course-159-mock-test-9',
      'pma-long-course-159-mock-test-10'
    ) and amount_pkr = 100)
    or (test_slug = 'pma-long-course-159-most-repeated-questions-bank' and amount_pkr = 79)
    or (test_slug = 'pma-long-course-159-must-come-questions-bank' and amount_pkr = 99)
    or (test_slug = 'academic-portion-mock-test-2' and amount_pkr = 20)
    or (test_slug in (
      'pma-long-course-159-non-verbal-intelligence-test-1',
      'pma-long-course-159-academic-portion-mock-test-3',
      'pma-long-course-academic-portion-most-repeated-questions'
    ) and amount_pkr = 49)
    or (test_slug = 'pma-long-course-159-non-verbal-intelligence-test-2' and amount_pkr in (14, 49))
    or (test_slug = 'academic-portion-mock-test-1' and amount_pkr = 30)
    or (test_slug in (
      'pma-academic-notes', 'pa-academic-notes', 'pma-academic-tests-notes',
      'pma-non-verbal-intelligence-notes', 'pma-verbal-intelligence-notes',
      'pma-verbal-intelligence-test-2', 'pma-verbal-intelligence-test-3',
      'pma-non-verbal-intelligence-test-2', 'pma-non-verbal-intelligence-test-3',
      'pma-analogy-test', 'pma-mathematical-series-test', 'army-initial-practice-mock'
    ) and amount_pkr = 14)
    or (test_slug = 'live-interview-assessment' and amount_pkr in (200, 250))
    or (test_slug = 'pma-long-course-159-interview-fully-cracked' and amount_pkr = 150)
    or (test_slug in (
      'interview-practice-personal', 'interview-practice-academic',
      'interview-practice-general-knowledge', 'interview-practice-current-affairs',
      'interview-practice-defense', 'interview-practice-rapid-fire',
      'interview-practice-mock'
    ) and amount_pkr in (50, 70))
    or (test_slug in (
      'pma-lc160-initial-test-foundations',
      'pma-lc160-initial-test-practice-plan',
      'pma-lc160-interview-introduction',
      'pma-lc160-interview-personal-questions',
      'pma-lc160-interview-current-affairs',
      'pma-lc160-issb-group-discussion',
      'pma-lc160-issb-psychological-preparation',
      'pma-lc160-issb-leadership',
      'pma-lc160-physical-progressive-training',
      'pma-lc160-physical-test-day'
    ) and amount_pkr = 30)
    or (test_slug = 'pma-lc160-preparation-book' and amount_pkr = 350)
    or (test_slug = 'pma-lc160-preparation-book-dogars' and amount_pkr = 450)
    or (test_slug = 'pma-lc160-preparation-book-faujprep' and amount_pkr = 430)
  ) not valid;

create or replace function public.submit_paid_ebook_payment_proof(
  p_ebook_slug text,
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
declare
  v_user_id uuid := auth.uid();
  v_purchase_id uuid;
  v_amount_pkr integer;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  v_amount_pkr := case p_ebook_slug
    when 'pma-lc160-preparation-book' then 350
    when 'pma-lc160-preparation-book-dogars' then 450
    when 'pma-lc160-preparation-book-faujprep' then 430
    else null
  end;
  if v_amount_pkr is null then
    raise exception 'This e-book is not available for individual purchase';
  end if;

  if trim(coalesce(p_sender_name, '')) = '' or trim(coalesce(p_sender_phone, '')) = '' then
    raise exception 'Sender name and phone number are required';
  end if;
  if p_payment_date is null then
    raise exception 'Payment date is required';
  end if;
  if trim(coalesce(p_payment_screenshot_url, '')) = '' or not exists (
    select 1
    from storage.objects
    where bucket_id = 'payment-screenshots'
      and name = trim(p_payment_screenshot_url)
      and split_part(name, '/', 1) = v_user_id::text
  ) then
    raise exception 'Upload a valid payment screenshot before submitting';
  end if;
  if exists (
    select 1
    from public.mock_test_purchase_requests
    where user_id = v_user_id
      and test_slug = p_ebook_slug
      and status in ('PENDING', 'APPROVED')
  ) then
    raise exception 'A payment request for this e-book is already pending or approved';
  end if;

  insert into public.mock_test_purchase_requests (
    user_id, test_slug, amount_pkr, payment_method, sender_name, sender_phone,
    payment_date, payment_time, payment_screenshot_url, notes
  ) values (
    v_user_id, p_ebook_slug, v_amount_pkr, 'NAYAPAY_MANUAL',
    trim(p_sender_name), trim(p_sender_phone), p_payment_date, p_payment_time,
    trim(p_payment_screenshot_url), nullif(trim(coalesce(p_notes, '')), '')
  ) returning id into v_purchase_id;

  return jsonb_build_object(
    'id', v_purchase_id,
    'test_slug', p_ebook_slug,
    'amount_pkr', v_amount_pkr,
    'status', 'PENDING',
    'message', 'Payment proof submitted. The e-book download will unlock after admin approval.'
  );
exception
  when unique_violation then
    raise exception 'A payment request for this e-book is already pending or approved';
end;
$$;

create or replace function public.can_download_paid_note(p_object_name text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select (
      p_object_name not in (
        'pma-lc160-preparation-book.pdf',
        'pma-lc160-preparation-book-dogars.pdf',
        'pma-lc160-preparation-book-faujprep.pdf'
      )
      and public.get_access_level_for_user(auth.uid()) in ('pro', 'premium')
    )
    or exists (
      select 1
      from public.mock_test_purchase_requests purchase
      where purchase.user_id = auth.uid()
        and purchase.status = 'APPROVED'
        and (
          (purchase.test_slug in ('pma-academic-notes', 'pa-academic-notes') and p_object_name = 'pma-academic-notes.pdf')
          or (purchase.test_slug = 'pma-academic-tests-notes' and p_object_name = 'pma-academic-tests-notes.pdf')
          or (purchase.test_slug = 'pma-non-verbal-intelligence-notes' and p_object_name = 'pma-non-verbal-intelligence-notes.pdf')
          or (purchase.test_slug = 'pma-verbal-intelligence-notes' and p_object_name = 'pma-verbal-intelligence-notes.pdf')
          or (purchase.test_slug = 'pma-long-course-159-interview-fully-cracked' and p_object_name = 'pma-long-course-159-interview-fully-cracked.pdf')
          or (purchase.test_slug = 'pma-lc160-initial-test-foundations' and p_object_name = 'pma-lc160-initial-test-foundations.pdf')
          or (purchase.test_slug = 'pma-lc160-initial-test-practice-plan' and p_object_name = 'pma-lc160-initial-test-practice-plan.pdf')
          or (purchase.test_slug = 'pma-lc160-interview-introduction' and p_object_name = 'pma-lc160-interview-introduction.pdf')
          or (purchase.test_slug = 'pma-lc160-interview-personal-questions' and p_object_name = 'pma-lc160-interview-personal-questions.pdf')
          or (purchase.test_slug = 'pma-lc160-interview-current-affairs' and p_object_name = 'pma-lc160-interview-current-affairs.pdf')
          or (purchase.test_slug = 'pma-lc160-issb-group-discussion' and p_object_name = 'pma-lc160-issb-group-discussion.pdf')
          or (purchase.test_slug = 'pma-lc160-issb-psychological-preparation' and p_object_name = 'pma-lc160-issb-psychological-preparation.pdf')
          or (purchase.test_slug = 'pma-lc160-issb-leadership' and p_object_name = 'pma-lc160-issb-leadership.pdf')
          or (purchase.test_slug = 'pma-lc160-physical-progressive-training' and p_object_name = 'pma-lc160-physical-progressive-training.pdf')
          or (purchase.test_slug = 'pma-lc160-physical-test-day' and p_object_name = 'pma-lc160-physical-test-day.pdf')
          or (purchase.test_slug = 'pma-lc160-preparation-book' and p_object_name = 'pma-lc160-preparation-book.pdf')
          or (purchase.test_slug = 'pma-lc160-preparation-book-dogars' and p_object_name = 'pma-lc160-preparation-book-dogars.pdf')
          or (purchase.test_slug = 'pma-lc160-preparation-book-faujprep' and p_object_name = 'pma-lc160-preparation-book-faujprep.pdf')
        )
    );
$$;

create or replace function public.get_admin_ebook_purchase_queue()
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
        when 'pma-lc160-preparation-book' then 'PMA Long Course 160 Preparation Book'
        when 'pma-lc160-preparation-book-dogars' then 'PMA Long Course 160 Preparation by Dogars'
        when 'pma-lc160-preparation-book-faujprep' then 'PMA Long Course 160 Preparation by FaujPrep'
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
      'pma-lc160-preparation-book',
      'pma-lc160-preparation-book-dogars',
      'pma-lc160-preparation-book-faujprep'
    )
  ), '[]'::jsonb);
end;
$$;

revoke all on function public.submit_paid_ebook_payment_proof(text, text, text, date, time, text, text) from public, anon;
grant execute on function public.submit_paid_ebook_payment_proof(text, text, text, date, time, text, text) to authenticated;
revoke all on function public.can_download_paid_note(text) from public, anon;
grant execute on function public.can_download_paid_note(text) to authenticated;
revoke all on function public.get_admin_ebook_purchase_queue() from public, anon;
grant execute on function public.get_admin_ebook_purchase_queue() to authenticated;

commit;

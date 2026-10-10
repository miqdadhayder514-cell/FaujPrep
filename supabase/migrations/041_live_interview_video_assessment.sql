begin;

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
    'army-initial-practice-mock',
    'live-interview-assessment'
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
    or (test_slug in (
      'pma-verbal-intelligence-test-2',
      'pma-verbal-intelligence-test-3',
      'pma-non-verbal-intelligence-test-2',
      'pma-non-verbal-intelligence-test-3',
      'pma-analogy-test',
      'pma-mathematical-series-test',
      'army-initial-practice-mock'
    ) and amount_pkr = 14)
    or (test_slug = 'live-interview-assessment' and amount_pkr in (200, 250))
  );

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
        when 'live-interview-assessment' then 'Live Interview Assessment'
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
        when 'live-interview-assessment' then 'Live Interview Assessment'
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
    when 'live-interview-assessment' then 250
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

create table if not exists public.live_interview_submissions (
  id uuid primary key default gen_random_uuid(),
  purchase_id uuid not null unique references public.mock_test_purchase_requests(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  video_path text not null unique,
  status text not null default 'SUBMITTED' check (status in ('SUBMITTED', 'ASSESSED')),
  admin_feedback text,
  assessed_by uuid references auth.users(id) on delete set null,
  assessed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.live_interview_submissions enable row level security;
revoke all on table public.live_interview_submissions from public, anon, authenticated;

create or replace function public.can_upload_live_interview_video()
returns boolean
language sql
security definer
set search_path = public
as $$
  select auth.uid() is not null and exists (
    select 1
    from public.mock_test_purchase_requests purchase
    where purchase.user_id = auth.uid()
      and purchase.test_slug = 'live-interview-assessment'
      and purchase.status = 'APPROVED'
  );
$$;

create or replace function public.can_delete_unsubmitted_live_interview_video(p_video_path text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select auth.uid() is not null
    and split_part(coalesce(p_video_path, ''), '/', 1) = auth.uid()::text
    and not exists (
      select 1
      from public.live_interview_submissions submission
      where submission.user_id = auth.uid()
        and submission.video_path = p_video_path
    );
$$;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'live-interview-videos',
  'live-interview-videos',
  false,
  104857600,
  array['video/mp4', 'video/webm', 'video/quicktime']
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists candidates_upload_own_live_interview_video on storage.objects;
create policy candidates_upload_own_live_interview_video
on storage.objects for insert to authenticated
with check (
  bucket_id = 'live-interview-videos'
  and split_part(name, '/', 1) = auth.uid()::text
  and public.can_upload_live_interview_video()
);

drop policy if exists candidates_delete_unsubmitted_live_interview_video on storage.objects;
create policy candidates_delete_unsubmitted_live_interview_video
on storage.objects for delete to authenticated
using (
  bucket_id = 'live-interview-videos'
  and public.can_delete_unsubmitted_live_interview_video(name)
);

drop policy if exists admins_read_live_interview_videos on storage.objects;
create policy admins_read_live_interview_videos
on storage.objects for select to authenticated
using (
  bucket_id = 'live-interview-videos'
  and public.is_editor_or_admin()
);

create or replace function public.submit_live_interview_video(p_video_path text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v_user_id uuid := auth.uid();
declare v_purchase_id uuid;
declare v_submission public.live_interview_submissions%rowtype;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;
  if trim(coalesce(p_video_path, '')) = '' or split_part(trim(p_video_path), '/', 1) <> v_user_id::text then
    raise exception 'Upload a video to your own account folder';
  end if;

  select purchase.id into v_purchase_id
  from public.mock_test_purchase_requests purchase
  where purchase.user_id = v_user_id
    and purchase.test_slug = 'live-interview-assessment'
    and purchase.status = 'APPROVED'
  order by purchase.verified_at desc nulls last, purchase.created_at desc
  limit 1;

  if v_purchase_id is null then
    raise exception 'An approved PKR 250 live interview assessment purchase is required before video submission';
  end if;
  if not exists (
    select 1
    from storage.objects
    where bucket_id = 'live-interview-videos'
      and name = trim(p_video_path)
      and split_part(name, '/', 1) = v_user_id::text
  ) then
    raise exception 'Upload a valid interview video before submitting';
  end if;
  if exists (
    select 1 from public.live_interview_submissions where purchase_id = v_purchase_id
  ) then
    raise exception 'A video has already been submitted for this approved interview assessment';
  end if;

  insert into public.live_interview_submissions (purchase_id, user_id, video_path)
  values (v_purchase_id, v_user_id, trim(p_video_path))
  returning * into v_submission;

  return jsonb_build_object(
    'id', v_submission.id,
    'status', v_submission.status,
    'created_at', v_submission.created_at
  );
end;
$$;

create or replace function public.get_my_live_interview_submission()
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

  return (
    select jsonb_build_object(
      'id', submission.id,
      'status', submission.status,
      'admin_feedback', submission.admin_feedback,
      'created_at', submission.created_at,
      'assessed_at', submission.assessed_at
    )
    from public.live_interview_submissions submission
    join public.mock_test_purchase_requests purchase on purchase.id = submission.purchase_id
    where submission.user_id = v_user_id
      and purchase.status = 'APPROVED'
    order by submission.created_at desc
    limit 1
  );
end;
$$;

create or replace function public.get_admin_live_interview_submissions()
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
      'id', submission.id,
      'user_id', submission.user_id,
      'user_email', account.email,
      'purchase_id', submission.purchase_id,
      'video_path', submission.video_path,
      'status', submission.status,
      'admin_feedback', submission.admin_feedback,
      'created_at', submission.created_at,
      'assessed_at', submission.assessed_at
    ) order by submission.created_at desc)
    from public.live_interview_submissions submission
    join auth.users account on account.id = submission.user_id
    join public.mock_test_purchase_requests purchase on purchase.id = submission.purchase_id
    where purchase.test_slug = 'live-interview-assessment'
      and purchase.status = 'APPROVED'
  ), '[]'::jsonb);
end;
$$;

create or replace function public.admin_assess_live_interview_submission(
  p_submission_id uuid,
  p_admin_feedback text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v_submission public.live_interview_submissions%rowtype;
begin
  if not public.is_editor_or_admin() then
    raise exception 'Admin access required';
  end if;
  if p_submission_id is null then
    raise exception 'Interview submission is required';
  end if;
  if length(trim(coalesce(p_admin_feedback, ''))) = 0 then
    raise exception 'Assessment feedback is required';
  end if;
  if length(p_admin_feedback) > 5000 then
    raise exception 'Assessment feedback must be 5000 characters or fewer';
  end if;

  update public.live_interview_submissions submission
  set status = 'ASSESSED',
      admin_feedback = trim(p_admin_feedback),
      assessed_by = auth.uid(),
      assessed_at = now(),
      updated_at = now()
  from public.mock_test_purchase_requests purchase
  where submission.id = p_submission_id
    and purchase.id = submission.purchase_id
    and purchase.test_slug = 'live-interview-assessment'
    and purchase.status = 'APPROVED'
  returning submission.* into v_submission;

  if not found then
    raise exception 'Approved live interview submission not found';
  end if;

  return jsonb_build_object(
    'id', v_submission.id,
    'status', v_submission.status,
    'admin_feedback', v_submission.admin_feedback,
    'assessed_at', v_submission.assessed_at
  );
end;
$$;

revoke all on function public.submit_live_interview_video(text) from public, anon;
grant execute on function public.submit_live_interview_video(text) to authenticated;
revoke all on function public.get_my_live_interview_submission() from public, anon;
grant execute on function public.get_my_live_interview_submission() to authenticated;
revoke all on function public.get_admin_live_interview_submissions() from public, anon;
grant execute on function public.get_admin_live_interview_submissions() to authenticated;
revoke all on function public.admin_assess_live_interview_submission(uuid, text) from public, anon;
grant execute on function public.admin_assess_live_interview_submission(uuid, text) to authenticated;
revoke all on function public.can_upload_live_interview_video() from public, anon;
grant execute on function public.can_upload_live_interview_video() to authenticated;
revoke all on function public.can_delete_unsubmitted_live_interview_video(text) from public, anon;
grant execute on function public.can_delete_unsubmitted_live_interview_video(text) to authenticated;

notify pgrst, 'reload schema';

commit;

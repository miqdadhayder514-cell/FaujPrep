begin;

-- Pro and Premium subscriptions unlock every paid question bank.
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
    'pma-long-course-159-mock-test-5',
    'pma-long-course-159-mock-test-6',
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
  ) then
    raise exception 'This mock test is not available for individual purchase';
  end if;
  if public.get_access_level_for_user(v_user_id) not in ('pro', 'premium')
    and not exists (
      select 1 from public.mock_test_purchase_requests purchase
      where purchase.user_id = v_user_id
        and purchase.test_slug = p_test_slug
        and purchase.status = 'APPROVED'
    ) then
    raise exception 'An approved purchase or active Pro plan is required to access this mock test';
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

revoke all on function public.get_paid_mock_test_questions(text) from public, anon;
grant execute on function public.get_paid_mock_test_questions(text) to authenticated;

-- Pro and Premium subscriptions unlock private paid-note PDFs.
create or replace function public.can_download_paid_note(p_object_name text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select public.get_access_level_for_user(auth.uid()) in ('pro', 'premium')
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
        )
    );
$$;

revoke all on function public.can_download_paid_note(text) from public, anon;
grant execute on function public.can_download_paid_note(text) to authenticated;

-- Pro and Premium subscriptions also unlock live interview assessment.
alter table public.live_interview_submissions
  alter column purchase_id drop not null;

create or replace function public.can_upload_live_interview_video()
returns boolean
language sql
security definer
set search_path = public
as $$
  select auth.uid() is not null
    and (
      public.get_access_level_for_user(auth.uid()) in ('pro', 'premium')
      or exists (
        select 1 from public.mock_test_purchase_requests purchase
        where purchase.user_id = auth.uid()
          and purchase.test_slug = 'live-interview-assessment'
          and purchase.status = 'APPROVED'
      )
    );
$$;

create or replace function public.submit_live_interview_video(p_video_path text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v_user_id uuid := auth.uid();
declare v_purchase_id uuid;
declare v_universal_access boolean;
declare v_submission public.live_interview_submissions%rowtype;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;
  if trim(coalesce(p_video_path, '')) = '' or split_part(trim(p_video_path), '/', 1) <> v_user_id::text then
    raise exception 'Upload a video to your own account folder';
  end if;

  v_universal_access := public.get_access_level_for_user(v_user_id) in ('pro', 'premium');
  select purchase.id into v_purchase_id
  from public.mock_test_purchase_requests purchase
  where purchase.user_id = v_user_id
    and purchase.test_slug = 'live-interview-assessment'
    and purchase.status = 'APPROVED'
  order by purchase.verified_at desc nulls last, purchase.created_at desc
  limit 1;

  if v_purchase_id is null and not v_universal_access then
    raise exception 'An approved live interview purchase or active Pro plan is required before video submission';
  end if;
  if not exists (
    select 1 from storage.objects
    where bucket_id = 'live-interview-videos'
      and name = trim(p_video_path)
      and split_part(name, '/', 1) = v_user_id::text
  ) then
    raise exception 'Upload a valid interview video before submitting';
  end if;
  if exists (
    select 1 from public.live_interview_submissions submission
    where submission.user_id = v_user_id
      and (submission.purchase_id = v_purchase_id or (v_universal_access and submission.purchase_id is null))
  ) then
    raise exception 'A video has already been submitted for this interview assessment';
  end if;

  insert into public.live_interview_submissions (purchase_id, user_id, video_path)
  values (v_purchase_id, v_user_id, trim(p_video_path))
  returning * into v_submission;

  return jsonb_build_object('id', v_submission.id, 'status', v_submission.status, 'created_at', v_submission.created_at);
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
    left join public.mock_test_purchase_requests purchase on purchase.id = submission.purchase_id
    where submission.user_id = v_user_id
      and (purchase.status = 'APPROVED' or public.get_access_level_for_user(v_user_id) in ('pro', 'premium'))
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
    left join public.mock_test_purchase_requests purchase on purchase.id = submission.purchase_id
    where (purchase.test_slug = 'live-interview-assessment' and purchase.status = 'APPROVED')
       or public.get_access_level_for_user(submission.user_id) in ('pro', 'premium')
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
  if length(trim(coalesce(p_admin_feedback, ''))) = 0 or length(p_admin_feedback) > 5000 then
    raise exception 'Assessment feedback must be between 1 and 5000 characters';
  end if;

  update public.live_interview_submissions submission
  set status = 'ASSESSED',
      admin_feedback = trim(p_admin_feedback),
      assessed_by = auth.uid(),
      assessed_at = now(),
      updated_at = now()
  where submission.id = p_submission_id
    and ((exists (
      select 1 from public.mock_test_purchase_requests purchase
      where purchase.id = submission.purchase_id
        and purchase.test_slug = 'live-interview-assessment'
        and purchase.status = 'APPROVED'
    ))
      or public.get_access_level_for_user(submission.user_id) in ('pro', 'premium'))
  returning submission.* into v_submission;

  if not found then
    raise exception 'Approved live interview submission not found';
  end if;
  return jsonb_build_object('id', v_submission.id, 'status', v_submission.status, 'admin_feedback', v_submission.admin_feedback, 'assessed_at', v_submission.assessed_at);
end;
$$;

revoke all on function public.can_upload_live_interview_video() from public, anon;
grant execute on function public.can_upload_live_interview_video() to authenticated;
revoke all on function public.submit_live_interview_video(text) from public, anon;
grant execute on function public.submit_live_interview_video(text) to authenticated;
revoke all on function public.get_my_live_interview_submission() from public, anon;
grant execute on function public.get_my_live_interview_submission() to authenticated;
revoke all on function public.get_admin_live_interview_submissions() from public, anon;
grant execute on function public.get_admin_live_interview_submissions() to authenticated;
revoke all on function public.admin_assess_live_interview_submission(uuid, text) from public, anon;
grant execute on function public.admin_assess_live_interview_submission(uuid, text) to authenticated;

notify pgrst, 'reload schema';

commit;

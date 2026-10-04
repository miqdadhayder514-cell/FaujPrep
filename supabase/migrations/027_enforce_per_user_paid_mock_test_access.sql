begin;

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
  if p_test_slug not in ('pma-long-course-159-mock-test-2', 'academic-portion-mock-test-2') then
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

revoke all on function public.get_paid_mock_test_questions(text) from public, anon;
grant execute on function public.get_paid_mock_test_questions(text) to authenticated;

commit;
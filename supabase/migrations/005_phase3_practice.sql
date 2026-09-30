create or replace function public.evaluate_question_answer(
  p_question_id uuid,
  p_selected_option text,
  p_time_taken_seconds integer default null
)
returns table (is_correct boolean, correct_option text, explanation text)
language plpgsql
security definer set search_path = public
as $$
declare question_row public.questions%rowtype;
declare answer_is_correct boolean;
begin
  select * into question_row
  from public.questions
  where id = p_question_id and is_active = true;

  if not found then raise exception 'Question not found'; end if;
  answer_is_correct := upper(coalesce(p_selected_option, '')) = upper(coalesce(question_row.correct_option, ''));

  if auth.uid() is not null then
    insert into public.question_attempts (user_id, question_id, selected_option, is_correct, time_taken_seconds)
    values (auth.uid(), p_question_id, p_selected_option, answer_is_correct, p_time_taken_seconds);
  end if;

  return query select answer_is_correct, question_row.correct_option, question_row.explanation;
end;
$$;

grant execute on function public.evaluate_question_answer(uuid, text, integer) to anon, authenticated;

DO $$
BEGIN
  if not exists (
    select 1 from pg_proc
    where proname = 'evaluate_question_answer'
  ) then
    raise exception 'Phase 3 answer evaluation function was not created';
  end if;
END $$;

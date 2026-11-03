begin;

create table if not exists public.self_description_questions (
  id text primary key,
  category_id text not null,
  category_name text not null,
  title text not null,
  description text not null,
  writing_guidance text not null,
  difficulty text not null check (difficulty in ('easy', 'medium', 'hard')),
  display_order integer not null,
  question_type text not null default 'written',
  is_active boolean not null default true,
  is_core boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists self_description_questions_category_order_idx
  on public.self_description_questions (category_id, display_order);

create table if not exists public.self_description_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  practice_mode text not null,
  title text not null,
  question_ids text[] not null,
  current_question_index integer not null default 0 check (current_question_index >= 0),
  started_at timestamptz not null default now(),
  submitted_at timestamptz,
  duration_minutes integer check (duration_minutes is null or duration_minutes in (5, 10, 15)),
  duration_seconds integer check (duration_seconds is null or duration_seconds >= 0),
  status text not null default 'in_progress' check (status in ('in_progress', 'completed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists self_description_attempts_user_started_idx
  on public.self_description_attempts (user_id, started_at desc);

create table if not exists public.self_description_responses (
  attempt_id uuid not null references public.self_description_attempts (id) on delete cascade,
  question_id text not null references public.self_description_questions (id) on delete restrict,
  user_id uuid not null references auth.users (id) on delete cascade,
  response_text text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (attempt_id, question_id)
);

create index if not exists self_description_responses_user_idx
  on public.self_description_responses (user_id, attempt_id);

create table if not exists public.self_description_feedback (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null unique references public.self_description_attempts (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  feedback_json jsonb not null,
  provider text not null,
  model text not null,
  consent_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_self_description_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

revoke all on function public.set_self_description_updated_at() from public, anon, authenticated;

drop trigger if exists self_description_questions_updated_at on public.self_description_questions;
create trigger self_description_questions_updated_at
before update on public.self_description_questions
for each row execute function public.set_self_description_updated_at();

drop trigger if exists self_description_attempts_updated_at on public.self_description_attempts;
create trigger self_description_attempts_updated_at
before update on public.self_description_attempts
for each row execute function public.set_self_description_updated_at();

drop trigger if exists self_description_responses_updated_at on public.self_description_responses;
create trigger self_description_responses_updated_at
before update on public.self_description_responses
for each row execute function public.set_self_description_updated_at();

drop trigger if exists self_description_feedback_updated_at on public.self_description_feedback;
create trigger self_description_feedback_updated_at
before update on public.self_description_feedback
for each row execute function public.set_self_description_updated_at();

alter table public.self_description_questions enable row level security;
alter table public.self_description_attempts enable row level security;
alter table public.self_description_responses enable row level security;
alter table public.self_description_feedback enable row level security;

drop policy if exists self_description_questions_read_active on public.self_description_questions;
create policy self_description_questions_read_active
on public.self_description_questions for select to authenticated
using (is_active or public.is_editor_or_admin());

drop policy if exists self_description_questions_admin_manage on public.self_description_questions;
create policy self_description_questions_admin_manage
on public.self_description_questions for all to authenticated
using (public.is_editor_or_admin())
with check (public.is_editor_or_admin());

drop policy if exists self_description_attempts_read_own on public.self_description_attempts;
create policy self_description_attempts_read_own
on public.self_description_attempts for select to authenticated
using (user_id = auth.uid());

drop policy if exists self_description_attempts_insert_own on public.self_description_attempts;
create policy self_description_attempts_insert_own
on public.self_description_attempts for insert to authenticated
with check (user_id = auth.uid());

drop policy if exists self_description_attempts_update_own on public.self_description_attempts;
create policy self_description_attempts_update_own
on public.self_description_attempts for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists self_description_responses_read_own on public.self_description_responses;
create policy self_description_responses_read_own
on public.self_description_responses for select to authenticated
using (user_id = auth.uid() and exists (
  select 1
  from public.self_description_attempts
  where public.self_description_attempts.id = self_description_responses.attempt_id
    and public.self_description_attempts.user_id = auth.uid()
));

drop policy if exists self_description_responses_insert_own on public.self_description_responses;
create policy self_description_responses_insert_own
on public.self_description_responses for insert to authenticated
with check (user_id = auth.uid() and exists (
  select 1
  from public.self_description_attempts
  where public.self_description_attempts.id = self_description_responses.attempt_id
    and public.self_description_attempts.user_id = auth.uid()
));

drop policy if exists self_description_responses_update_own on public.self_description_responses;
create policy self_description_responses_update_own
on public.self_description_responses for update to authenticated
using (user_id = auth.uid() and exists (
  select 1
  from public.self_description_attempts
  where public.self_description_attempts.id = self_description_responses.attempt_id
    and public.self_description_attempts.user_id = auth.uid()
))
with check (user_id = auth.uid() and exists (
  select 1
  from public.self_description_attempts
  where public.self_description_attempts.id = self_description_responses.attempt_id
    and public.self_description_attempts.user_id = auth.uid()
));

drop policy if exists self_description_feedback_read_own on public.self_description_feedback;
create policy self_description_feedback_read_own
on public.self_description_feedback for select to authenticated
using (user_id = auth.uid());

grant select, insert, update on public.self_description_questions to authenticated;
grant select, insert, update on public.self_description_attempts to authenticated;
grant select, insert, update on public.self_description_responses to authenticated;
grant select on public.self_description_feedback to authenticated;

insert into public.self_description_questions (id, category_id, category_name, title, description, writing_guidance, difficulty, display_order, question_type, is_active, is_core)
values
  ('personal-opinion', 'personal-self-assessment', 'Personal Self-Assessment', 'What is your personal opinion about yourself?', 'Describe how you see yourself today, including one trait supported by a real example.', 'Use a real example that shows this clearly. Describe how you see yourself today, including one trait supported by a real example. Keep the response truthful and describe what you did, what happened, and what you learned.', 'medium', 1, 'written', true, true),
  ('personality-description', 'personal-self-assessment', 'Personal Self-Assessment', 'How would you describe your personality?', 'Choose a few balanced traits and show how they appear in your day-to-day behaviour.', 'Use a real example that shows this clearly. Choose a few balanced traits and show how they appear in your day-to-day behaviour. Keep the response truthful and describe what you did, what happened, and what you learned.', 'medium', 2, 'written', true, false),
  ('prominent-qualities', 'personal-self-assessment', 'Personal Self-Assessment', 'What are the most prominent qualities of your personality?', 'Select qualities that other people could observe and connect each to an action.', 'Use a real example that shows this clearly. Select qualities that other people could observe and connect each to an action. Keep the response truthful and describe what you did, what happened, and what you learned.', 'medium', 3, 'written', true, false),
  ('defining-habits', 'personal-self-assessment', 'Personal Self-Assessment', 'What are the habits that define you?', 'Distinguish a repeated habit from an occasional action and mention its effect.', 'Use a real example that shows this clearly. Distinguish a repeated habit from an occasional action and mention its effect. Keep the response truthful and describe what you did, what happened, and what you learned.', 'easy', 4, 'written', true, false),
  ('what-makes-you-different', 'personal-self-assessment', 'Personal Self-Assessment', 'What makes you different from other people?', 'Avoid claiming superiority; explain a particular perspective, interest, or way of working.', 'Use a real example that shows this clearly. Avoid claiming superiority; explain a particular perspective, interest, or way of working. Keep the response truthful and describe what you did, what happened, and what you learned.', 'medium', 5, 'written', true, false),
  ('like-most-about-yourself', 'personal-self-assessment', 'Personal Self-Assessment', 'What do you like most about yourself?', 'Name a quality, explain when it helps, and acknowledge where it still needs balance.', 'Use a real example that shows this clearly. Name a quality, explain when it helps, and acknowledge where it still needs balance. Keep the response truthful and describe what you did, what happened, and what you learned.', 'easy', 6, 'written', true, false),
  ('dislike-about-yourself', 'personal-self-assessment', 'Personal Self-Assessment', 'What do you dislike about yourself?', 'Choose a genuine, manageable limitation and describe what you are doing about it.', 'Use a real example that shows this clearly. Choose a genuine, manageable limitation and describe what you are doing about it. Keep the response truthful and describe what you did, what happened, and what you learned.', 'medium', 7, 'written', true, false),
  ('describe-yourself-to-stranger', 'personal-self-assessment', 'Personal Self-Assessment', 'How would you describe yourself to someone who does not know you?', 'Give a concise picture of your temperament, priorities, and one concrete example.', 'Use a real example that shows this clearly. Give a concise picture of your temperament, priorities, and one concrete example. Keep the response truthful and describe what you did, what happened, and what you learned.', 'easy', 8, 'written', true, false),
  ('important-life-values', 'personal-self-assessment', 'Personal Self-Assessment', 'What are the three most important values in your life?', 'Name three values and show how one influenced a real decision.', 'Use a real example that shows this clearly. Name three values and show how one influenced a real decision. Keep the response truthful and describe what you did, what happened, and what you learned.', 'medium', 9, 'written', true, false),
  ('motivation-to-work-hard', 'personal-self-assessment', 'Personal Self-Assessment', 'What motivates you to work hard?', 'Identify an authentic source of motivation and how it sustains effort when results are slow.', 'Use a real example that shows this clearly. Identify an authentic source of motivation and how it sustains effort when results are slow. Keep the response truthful and describe what you did, what happened, and what you learned.', 'easy', 10, 'written', true, false),
  ('proud-of-yourself', 'personal-self-assessment', 'Personal Self-Assessment', 'What makes you feel proud of yourself?', 'Describe a specific effort or choice and the lesson that matters more than praise.', 'Use a real example that shows this clearly. Describe a specific effort or choice and the lesson that matters more than praise. Keep the response truthful and describe what you did, what happened, and what you learned.', 'easy', 11, 'written', true, false),
  ('personality-change', 'personal-self-assessment', 'Personal Self-Assessment', 'What is one thing about your personality that you want to change?', 'State a specific pattern, its impact, and one practical step you are testing.', 'Use a real example that shows this clearly. State a specific pattern, its impact, and one practical step you are testing. Keep the response truthful and describe what you did, what happened, and what you learned.', 'medium', 12, 'written', true, false),
  ('parents-think', 'parents-and-family', 'Parents and Family', 'What do your parents think about you?', 'Separate what they value from a realistic concern they may have; use details you have actually heard.', 'Use a real example that shows this clearly. Separate what they value from a realistic concern they may have; use details you have actually heard. Keep the response truthful and describe what you did, what happened, and what you learned.', 'medium', 101, 'written', true, true),
  ('father-describes-personality', 'parents-and-family', 'Parents and Family', 'How does your father describe your personality?', 'Use your father’s own likely words only if you have heard them; support the description with an example.', 'Use a real example that shows this clearly. Use your father’s own likely words only if you have heard them; support the description with an example. Keep the response truthful and describe what you did, what happened, and what you learned.', 'medium', 102, 'written', true, false),
  ('mother-describes-personality', 'parents-and-family', 'Parents and Family', 'How does your mother describe your personality?', 'Consider a real observation your mother has made and avoid guessing what she wants to hear.', 'Use a real example that shows this clearly. Consider a real observation your mother has made and avoid guessing what she wants to hear. Keep the response truthful and describe what you did, what happened, and what you learned.', 'medium', 103, 'written', true, false),
  ('parents-appreciate-qualities', 'parents-and-family', 'Parents and Family', 'What qualities do your parents appreciate most in you?', 'Name a quality and the everyday behaviour through which your parents have noticed it.', 'Use a real example that shows this clearly. Name a quality and the everyday behaviour through which your parents have noticed it. Keep the response truthful and describe what you did, what happened, and what you learned.', 'easy', 104, 'written', true, false),
  ('parents-complaints', 'parents-and-family', 'Parents and Family', 'What complaints do your parents have about you?', 'Give a fair, non-defensive example of feedback and explain whether you have acted on it.', 'Use a real example that shows this clearly. Give a fair, non-defensive example of feedback and explain whether you have acted on it. Keep the response truthful and describe what you did, what happened, and what you learned.', 'medium', 105, 'written', true, false),
  ('contribute-to-family', 'parents-and-family', 'Parents and Family', 'How do you contribute to your family?', 'Describe a regular, age-appropriate contribution and how consistently you make it.', 'Use a real example that shows this clearly. Describe a regular, age-appropriate contribution and how consistently you make it. Keep the response truthful and describe what you did, what happened, and what you learned.', 'easy', 106, 'written', true, false),
  ('responsibilities-at-home', 'parents-and-family', 'Parents and Family', 'What responsibilities do you have at home?', 'List real responsibilities and explain how you manage them alongside study or work.', 'Use a real example that shows this clearly. List real responsibilities and explain how you manage them alongside study or work. Keep the response truthful and describe what you did, what happened, and what you learned.', 'easy', 107, 'written', true, false),
  ('family-in-difficult-situations', 'parents-and-family', 'Parents and Family', 'How would your family describe your behaviour during difficult situations?', 'Recall a real family challenge and describe your actions, not a perfect image of yourself.', 'Use a real example that shows this clearly. Recall a real family challenge and describe your actions, not a perfect image of yourself. Keep the response truthful and describe what you did, what happened, and what you learned.', 'hard', 108, 'written', true, false),
  ('best-friends-think', 'friends-and-social-relationships', 'Friends and Social Relationships', 'What do your best friends think about you?', 'Use feedback friends have actually shared and give an example of when it was visible.', 'Use a real example that shows this clearly. Use feedback friends have actually shared and give an example of when it was visible. Keep the response truthful and describe what you did, what happened, and what you learned.', 'medium', 201, 'written', true, true),
  ('closest-friend-description', 'friends-and-social-relationships', 'Friends and Social Relationships', 'How would your closest friend describe your personality?', 'Consider both a valued trait and a small limitation your friend might notice.', 'Use a real example that shows this clearly. Consider both a valued trait and a small limitation your friend might notice. Keep the response truthful and describe what you did, what happened, and what you learned.', 'medium', 202, 'written', true, false),
  ('friends-appreciate', 'friends-and-social-relationships', 'Friends and Social Relationships', 'What qualities do your friends appreciate in you?', 'Describe a quality through a specific way you support or cooperate with friends.', 'Use a real example that shows this clearly. Describe a quality through a specific way you support or cooperate with friends. Keep the response truthful and describe what you did, what happened, and what you learned.', 'easy', 203, 'written', true, false),
  ('friends-notice-weaknesses', 'friends-and-social-relationships', 'Friends and Social Relationships', 'What weaknesses do your friends notice in you?', 'Use a real piece of feedback and say how you respond when it is raised.', 'Use a real example that shows this clearly. Use a real piece of feedback and say how you respond when it is raised. Keep the response truthful and describe what you did, what happened, and what you learned.', 'medium', 204, 'written', true, false),
  ('group-work-behaviour', 'friends-and-social-relationships', 'Friends and Social Relationships', 'How do you behave when working in a group?', 'Explain how you contribute, listen, and adapt when the group has different views.', 'Use a real example that shows this clearly. Explain how you contribute, listen, and adapt when the group has different views. Keep the response truthful and describe what you did, what happened, and what you learned.', 'medium', 205, 'written', true, false),
  ('role-among-friends', 'friends-and-social-relationships', 'Friends and Social Relationships', 'What role do you usually play among your friends?', 'Describe the role that emerges naturally in a real group rather than claiming a title.', 'Use a real example that shows this clearly. Describe the role that emerges naturally in a real group rather than claiming a title. Keep the response truthful and describe what you did, what happened, and what you learned.', 'easy', 206, 'written', true, false),
  ('disagreements-with-friends', 'friends-and-social-relationships', 'Friends and Social Relationships', 'How do you handle disagreements with friends?', 'Give a real or ordinary example showing how you listen, explain, and resolve or accept differences.', 'Use a real example that shows this clearly. Give a real or ordinary example showing how you listen, explain, and resolve or accept differences. Keep the response truthful and describe what you did, what happened, and what you learned.', 'medium', 207, 'written', true, false),
  ('help-friend-in-difficulty', 'friends-and-social-relationships', 'Friends and Social Relationships', 'How do you help a friend who is facing difficulties?', 'Explain how you offer practical support while respecting what your friend wants.', 'Use a real example that shows this clearly. Explain how you offer practical support while respecting what your friend wants. Keep the response truthful and describe what you did, what happened, and what you learned.', 'medium', 208, 'written', true, false),
  ('teachers-think', 'teachers-and-educational-life', 'Teachers and Educational Life', 'What do your teachers think about you?', 'Summarize feedback you have received and connect it to your classroom conduct.', 'Use a real example that shows this clearly. Summarize feedback you have received and connect it to your classroom conduct. Keep the response truthful and describe what you did, what happened, and what you learned.', 'medium', 301, 'written', true, true),
  ('favourite-teacher-description', 'teachers-and-educational-life', 'Teachers and Educational Life', 'How would your favourite teacher describe you?', 'Use a real interaction or comment from that teacher rather than an imagined endorsement.', 'Use a real example that shows this clearly. Use a real interaction or comment from that teacher rather than an imagined endorsement. Keep the response truthful and describe what you did, what happened, and what you learned.', 'easy', 302, 'written', true, false),
  ('teachers-appreciate-qualities', 'teachers-and-educational-life', 'Teachers and Educational Life', 'What qualities do your teachers appreciate in you?', 'Identify a quality teachers have noticed and the work or behaviour that demonstrated it.', 'Use a real example that shows this clearly. Identify a quality teachers have noticed and the work or behaviour that demonstrated it. Keep the response truthful and describe what you did, what happened, and what you learned.', 'easy', 303, 'written', true, false),
  ('teachers-complaints', 'teachers-and-educational-life', 'Teachers and Educational Life', 'What complaints have your teachers made about you?', 'Choose a truthful example, describe its context, and explain any improvement since then.', 'Use a real example that shows this clearly. Choose a truthful example, describe its context, and explain any improvement since then. Keep the response truthful and describe what you did, what happened, and what you learned.', 'medium', 304, 'written', true, false),
  ('classroom-behaviour', 'teachers-and-educational-life', 'Teachers and Educational Life', 'How do you behave in the classroom?', 'Reflect on preparation, participation, listening, and what you do when you lose focus.', 'Use a real example that shows this clearly. Reflect on preparation, participation, listening, and what you do when you lose focus. Keep the response truthful and describe what you did, what happened, and what you learned.', 'easy', 305, 'written', true, false),
  ('respond-to-teacher-criticism', 'teachers-and-educational-life', 'Teachers and Educational Life', 'How do you respond to criticism from teachers?', 'Describe how you distinguish useful feedback from a misunderstanding and what action follows.', 'Use a real example that shows this clearly. Describe how you distinguish useful feedback from a misunderstanding and what action follows. Keep the response truthful and describe what you did, what happened, and what you learned.', 'medium', 306, 'written', true, false),
  ('academic-responsibilities', 'teachers-and-educational-life', 'Teachers and Educational Life', 'What is your attitude towards academic responsibilities?', 'Show how you plan and complete real academic obligations, including a difficulty you manage.', 'Use a real example that shows this clearly. Show how you plan and complete real academic obligations, including a difficulty you manage. Keep the response truthful and describe what you did, what happened, and what you learned.', 'medium', 307, 'written', true, false),
  ('educational-improvements', 'teachers-and-educational-life', 'Teachers and Educational Life', 'What improvements have you made in your educational life?', 'Compare an earlier habit with a specific change and its observable result.', 'Use a real example that shows this clearly. Compare an earlier habit with a specific change and its observable result. Keep the response truthful and describe what you did, what happened, and what you learned.', 'medium', 308, 'written', true, false),
  ('critics-say', 'critics-and-disagreement', 'Critics and People Who Disagree With You', 'What would your critics say about you?', 'Represent a fair criticism you have heard and consider what part may be useful.', 'Use a real example that shows this clearly. Represent a fair criticism you have heard and consider what part may be useful. Keep the response truthful and describe what you did, what happened, and what you learned.', 'hard', 401, 'written', true, true),
  ('person-who-dislikes-you', 'critics-and-disagreement', 'Critics and People Who Disagree With You', 'What might a person who dislikes you say about your personality?', 'Avoid attacking the other person; reflect on a plausible, evidence-based disagreement.', 'Use a real example that shows this clearly. Avoid attacking the other person; reflect on a plausible, evidence-based disagreement. Keep the response truthful and describe what you did, what happened, and what you learned.', 'hard', 402, 'written', true, false),
  ('opponents-notice-weaknesses', 'critics-and-disagreement', 'Critics and People Who Disagree With You', 'What weaknesses might your opponents notice in you?', 'Identify how a real limitation could affect others and how you are addressing it.', 'Use a real example that shows this clearly. Identify how a real limitation could affect others and how you are addressing it. Keep the response truthful and describe what you did, what happened, and what you learned.', 'hard', 403, 'written', true, false),
  ('react-to-criticism', 'critics-and-disagreement', 'Critics and People Who Disagree With You', 'How do you react when someone criticizes you?', 'Describe your first reaction honestly and the deliberate step you take before responding.', 'Use a real example that shows this clearly. Describe your first reaction honestly and the deliberate step you take before responding. Keep the response truthful and describe what you did, what happened, and what you learned.', 'medium', 404, 'written', true, false),
  ('people-who-disagree', 'critics-and-disagreement', 'Critics and People Who Disagree With You', 'How do you deal with people who disagree with your opinions?', 'Explain how you listen, test your reasoning, and disagree respectfully when needed.', 'Use a real example that shows this clearly. Explain how you listen, test your reasoning, and disagree respectfully when needed. Keep the response truthful and describe what you did, what happened, and what you learned.', 'medium', 405, 'written', true, false),
  ('learned-from-negative-feedback', 'critics-and-disagreement', 'Critics and People Who Disagree With You', 'What have you learned from negative feedback?', 'Describe feedback that changed a behaviour or exposed something you had missed.', 'Use a real example that shows this clearly. Describe feedback that changed a behaviour or exposed something you had missed. Keep the response truthful and describe what you did, what happened, and what you learned.', 'medium', 406, 'written', true, false),
  ('greatest-strengths', 'strengths-and-weaknesses', 'Strengths and Weaknesses', 'What are your greatest strengths?', 'Choose strengths supported by repeated behaviour and give a concise example for each.', 'Use a real example that shows this clearly. Choose strengths supported by repeated behaviour and give a concise example for each. Keep the response truthful and describe what you did, what happened, and what you learned.', 'medium', 501, 'written', true, true),
  ('biggest-weaknesses', 'strengths-and-weaknesses', 'Strengths and Weaknesses', 'What are your biggest weaknesses?', 'Be specific and proportionate; explain the effect and a practical improvement step.', 'Use a real example that shows this clearly. Be specific and proportionate; explain the effect and a practical improvement step. Keep the response truthful and describe what you did, what happened, and what you learned.', 'medium', 502, 'written', true, true),
  ('qualities-help-goals', 'strengths-and-weaknesses', 'Strengths and Weaknesses', 'Which of your qualities helps you achieve your goals?', 'Link a real quality to one goal and describe how it helped you make progress.', 'Use a real example that shows this clearly. Link a real quality to one goal and describe how it helped you make progress. Keep the response truthful and describe what you did, what happened, and what you learned.', 'easy', 503, 'written', true, false),
  ('daily-life-weakness', 'strengths-and-weaknesses', 'Strengths and Weaknesses', 'Which weakness creates difficulties in your daily life?', 'Describe a recurring but manageable difficulty and what you are trying to change.', 'Use a real example that shows this clearly. Describe a recurring but manageable difficulty and what you are trying to change. Keep the response truthful and describe what you did, what happened, and what you learned.', 'medium', 504, 'written', true, false),
  ('independent-or-team', 'strengths-and-weaknesses', 'Strengths and Weaknesses', 'Are you more comfortable working independently or in a team?', 'Give a balanced preference and explain when you work effectively in each setting.', 'Use a real example that shows this clearly. Give a balanced preference and explain when you work effectively in each setting. Keep the response truthful and describe what you did, what happened, and what you learned.', 'medium', 505, 'written', true, false),
  ('demonstrate-responsibility', 'strengths-and-weaknesses', 'Strengths and Weaknesses', 'How do you demonstrate responsibility?', 'Use one example where you owned a task, followed through, or corrected a mistake.', 'Use a real example that shows this clearly. Use one example where you owned a task, followed through, or corrected a mistake. Keep the response truthful and describe what you did, what happened, and what you learned.', 'easy', 506, 'written', true, false),
  ('demonstrate-discipline', 'strengths-and-weaknesses', 'Strengths and Weaknesses', 'How do you demonstrate discipline?', 'Describe a repeatable routine or choice, including how you recover when you slip.', 'Use a real example that shows this clearly. Describe a repeatable routine or choice, including how you recover when you slip. Keep the response truthful and describe what you did, what happened, and what you learned.', 'easy', 507, 'written', true, false),
  ('difficult-responsibilities', 'strengths-and-weaknesses', 'Strengths and Weaknesses', 'How do you handle difficult responsibilities?', 'Explain how you clarify the task, plan the work, seek appropriate help, and follow through.', 'Use a real example that shows this clearly. Explain how you clarify the task, plan the work, seek appropriate help, and follow through. Keep the response truthful and describe what you did, what happened, and what you learned.', 'medium', 508, 'written', true, false),
  ('quality-most-proud', 'strengths-and-weaknesses', 'Strengths and Weaknesses', 'Which personal quality are you most proud of?', 'Show the quality in action without presenting yourself as flawless.', 'Use a real example that shows this clearly. Show the quality in action without presenting yourself as flawless. Keep the response truthful and describe what you did, what happened, and what you learned.', 'easy', 509, 'written', true, false),
  ('weakness-overcome', 'strengths-and-weaknesses', 'Strengths and Weaknesses', 'What personal weakness are you currently trying to overcome?', 'State the behaviour, the trigger you have noticed, and a measurable step you are practising.', 'Use a real example that shows this clearly. State the behaviour, the trigger you have noticed, and a measurable step you are practising. Keep the response truthful and describe what you did, what happened, and what you learned.', 'medium', 510, 'written', true, false),
  ('manage-anger', 'strengths-and-weaknesses', 'Strengths and Weaknesses', 'How do you manage your anger?', 'Describe a genuine strategy you use and an instance where it helped or where you still struggle.', 'Use a real example that shows this clearly. Describe a genuine strategy you use and an instance where it helped or where you still struggle. Keep the response truthful and describe what you did, what happened, and what you learned.', 'medium', 511, 'written', true, false),
  ('confidence-challenges', 'strengths-and-weaknesses', 'Strengths and Weaknesses', 'How do you maintain self-confidence during challenging situations?', 'Explain how preparation, perspective, or support helps you act despite uncertainty.', 'Use a real example that shows this clearly. Explain how preparation, perspective, or support helps you act despite uncertainty. Keep the response truthful and describe what you did, what happened, and what you learned.', 'medium', 512, 'written', true, false),
  ('greatest-achievement', 'achievements-and-failures', 'Achievements and Failures', 'What is your greatest achievement?', 'Choose an honest achievement, explain your contribution, and reflect on what it taught you.', 'Use a real example that shows this clearly. Choose an honest achievement, explain your contribution, and reflect on what it taught you. Keep the response truthful and describe what you did, what happened, and what you learned.', 'medium', 601, 'written', true, false),
  ('biggest-failure', 'achievements-and-failures', 'Achievements and Failures', 'What is your biggest failure?', 'Take appropriate responsibility without exaggerating; focus on the lesson and later action.', 'Use a real example that shows this clearly. Take appropriate responsibility without exaggerating; focus on the lesson and later action. Keep the response truthful and describe what you did, what happened, and what you learned.', 'hard', 602, 'written', true, false),
  ('difficult-challenge-overcome', 'achievements-and-failures', 'Achievements and Failures', 'What is the most difficult challenge you have overcome?', 'Set the context, explain your own steps, and be accurate about the outcome.', 'Use a real example that shows this clearly. Set the context, explain your own steps, and be accurate about the outcome. Keep the response truthful and describe what you did, what happened, and what you learned.', 'hard', 603, 'written', true, false),
  ('happiest-moment', 'achievements-and-failures', 'Achievements and Failures', 'What is the happiest moment of your life?', 'Describe what happened and why it mattered to you rather than relying on dramatic language.', 'Use a real example that shows this clearly. Describe what happened and why it mattered to you rather than relying on dramatic language. Keep the response truthful and describe what you did, what happened, and what you learned.', 'easy', 604, 'written', true, false),
  ('saddest-moment', 'achievements-and-failures', 'Achievements and Failures', 'What is the saddest moment of your life?', 'Share only what you are comfortable disclosing and focus on its meaning or impact.', 'Use a real example that shows this clearly. Share only what you are comfortable disclosing and focus on its meaning or impact. Keep the response truthful and describe what you did, what happened, and what you learned.', 'hard', 605, 'written', true, false),
  ('mistake-important-lesson', 'achievements-and-failures', 'Achievements and Failures', 'Which mistake taught you an important lesson?', 'Explain the decision, its consequence, and the change you made afterward.', 'Use a real example that shows this clearly. Explain the decision, its consequence, and the change you made afterward. Keep the response truthful and describe what you did, what happened, and what you learned.', 'medium', 606, 'written', true, false),
  ('achievement-parents-proud', 'achievements-and-failures', 'Achievements and Failures', 'What achievement has made your parents proud?', 'Describe a real accomplishment and the effort or values your family appreciated.', 'Use a real example that shows this clearly. Describe a real accomplishment and the effort or values your family appreciated. Keep the response truthful and describe what you did, what happened, and what you learned.', 'easy', 607, 'written', true, false),
  ('learned-from-failures', 'achievements-and-failures', 'Achievements and Failures', 'What have you learned from your past failures?', 'Identify a pattern or lesson and show how it changed a later attempt.', 'Use a real example that shows this clearly. Identify a pattern or lesson and show how it changed a later attempt. Keep the response truthful and describe what you did, what happened, and what you learned.', 'medium', 608, 'written', true, false),
  ('react-when-angry', 'emotions-and-personal-behaviour', 'Emotions and Personal Behaviour', 'How do you react when you become angry?', 'Describe your usual reaction honestly and the steps you take to avoid harming a discussion.', 'Use a real example that shows this clearly. Describe your usual reaction honestly and the steps you take to avoid harming a discussion. Keep the response truthful and describe what you did, what happened, and what you learned.', 'medium', 701, 'written', true, false),
  ('what-causes-disappointment', 'emotions-and-personal-behaviour', 'Emotions and Personal Behaviour', 'What makes you disappointed?', 'Identify a realistic situation and explain how you recover or adjust expectations.', 'Use a real example that shows this clearly. Identify a realistic situation and explain how you recover or adjust expectations. Keep the response truthful and describe what you did, what happened, and what you learned.', 'easy', 702, 'written', true, false),
  ('behaviour-under-pressure', 'emotions-and-personal-behaviour', 'Emotions and Personal Behaviour', 'How do you behave under pressure?', 'Use a real example and explain both what worked and what you would improve.', 'Use a real example that shows this clearly. Use a real example and explain both what worked and what you would improve. Keep the response truthful and describe what you did, what happened, and what you learned.', 'hard', 703, 'written', true, false),
  ('plans-go-wrong', 'emotions-and-personal-behaviour', 'Emotions and Personal Behaviour', 'How do you respond when things do not go according to your plans?', 'Explain how you reassess priorities and adapt without pretending setbacks never affect you.', 'Use a real example that shows this clearly. Explain how you reassess priorities and adapt without pretending setbacks never affect you. Keep the response truthful and describe what you did, what happened, and what you learned.', 'medium', 704, 'written', true, false),
  ('handle-unexpected-problems', 'emotions-and-personal-behaviour', 'Emotions and Personal Behaviour', 'How do you handle unexpected problems?', 'Describe a situation where you identified the immediate issue and chose a practical next step.', 'Use a real example that shows this clearly. Describe a situation where you identified the immediate issue and chose a practical next step. Keep the response truthful and describe what you did, what happened, and what you learned.', 'medium', 705, 'written', true, false),
  ('mistakes-pointed-out', 'emotions-and-personal-behaviour', 'Emotions and Personal Behaviour', 'How do you react when someone points out your mistakes?', 'Explain how you verify the feedback, accept responsibility when appropriate, and correct the error.', 'Use a real example that shows this clearly. Explain how you verify the feedback, accept responsibility when appropriate, and correct the error. Keep the response truthful and describe what you did, what happened, and what you learned.', 'medium', 706, 'written', true, false),
  ('situations-make-nervous', 'emotions-and-personal-behaviour', 'Emotions and Personal Behaviour', 'What situations make you nervous?', 'Name a genuine situation and the preparation or coping action that helps you participate.', 'Use a real example that shows this clearly. Name a genuine situation and the preparation or coping action that helps you participate. Keep the response truthful and describe what you did, what happened, and what you learned.', 'easy', 707, 'written', true, false),
  ('emotional-control-difficulties', 'emotions-and-personal-behaviour', 'Emotions and Personal Behaviour', 'How do you maintain emotional control during difficult circumstances?', 'Describe an actual self-regulation practice while acknowledging its limits.', 'Use a real example that shows this clearly. Describe an actual self-regulation practice while acknowledging its limits. Keep the response truthful and describe what you did, what happened, and what you learned.', 'hard', 708, 'written', true, false),
  ('future-ambitions', 'ambitions-and-future-development', 'Ambitions and Future Development', 'What are your future ambitions?', 'State a meaningful goal, why it matters, and the next step within your control.', 'Use a real example that shows this clearly. State a meaningful goal, why it matters, and the next step within your control. Keep the response truthful and describe what you did, what happened, and what you learned.', 'easy', 801, 'written', true, false),
  ('qualities-to-develop', 'ambitions-and-future-development', 'Ambitions and Future Development', 'What qualities would you like to develop?', 'Choose qualities relevant to your goals and identify how you will practise them.', 'Use a real example that shows this clearly. Choose qualities relevant to your goals and identify how you will practise them. Keep the response truthful and describe what you did, what happened, and what you learned.', 'easy', 802, 'written', true, true),
  ('person-you-want-to-become', 'ambitions-and-future-development', 'Ambitions and Future Development', 'What kind of person do you want to become?', 'Describe values and behaviours you hope to live by, not only a job title or status.', 'Use a real example that shows this clearly. Describe values and behaviours you hope to live by, not only a job title or status. Keep the response truthful and describe what you did, what happened, and what you learned.', 'medium', 803, 'written', true, false),
  ('personal-qualities-improve', 'ambitions-and-future-development', 'Ambitions and Future Development', 'Which personal qualities do you want to improve?', 'Prioritize one or two qualities and connect each to an observable habit.', 'Use a real example that shows this clearly. Prioritize one or two qualities and connect each to an observable habit. Keep the response truthful and describe what you did, what happened, and what you learned.', 'medium', 804, 'written', true, false),
  ('short-and-long-term-goals', 'ambitions-and-future-development', 'Ambitions and Future Development', 'What are your short-term and long-term goals?', 'Make the goals distinct, realistic, and connected by practical steps.', 'Use a real example that shows this clearly. Make the goals distinct, realistic, and connected by practical steps. Keep the response truthful and describe what you did, what happened, and what you learned.', 'medium', 805, 'written', true, false),
  ('steps-to-improve-yourself', 'ambitions-and-future-development', 'Ambitions and Future Development', 'What steps are you taking to improve yourself?', 'Describe actions already underway, how often you take them, and how you judge progress.', 'Use a real example that shows this clearly. Describe actions already underway, how often you take them, and how you judge progress. Keep the response truthful and describe what you did, what happened, and what you learned.', 'easy', 806, 'written', true, false),
  ('future-responsibilities', 'ambitions-and-future-development', 'Ambitions and Future Development', 'What responsibilities would you like to take on in the future?', 'Name a responsibility you are prepared to work toward and what preparation it requires.', 'Use a real example that shows this clearly. Name a responsibility you are prepared to work toward and what preparation it requires. Keep the response truthful and describe what you did, what happened, and what you learned.', 'medium', 807, 'written', true, false),
  ('overcome-current-weaknesses', 'ambitions-and-future-development', 'Ambitions and Future Development', 'How do you plan to overcome your current weaknesses?', 'Turn one weakness into a specific practice plan with a way to review progress.', 'Use a real example that shows this clearly. Turn one weakness into a specific practice plan with a way to review progress. Keep the response truthful and describe what you did, what happened, and what you learned.', 'medium', 808, 'written', true, false),
  ('family-background', 'personal-background-and-lifestyle', 'Personal Background and Lifestyle', 'Describe your family background.', 'Share relevant facts respectfully and explain the values or responsibilities that shaped you.', 'Use a real example that shows this clearly. Share relevant facts respectfully and explain the values or responsibilities that shaped you. Keep the response truthful and describe what you did, what happened, and what you learned.', 'easy', 901, 'written', true, false),
  ('childhood-description', 'personal-background-and-lifestyle', 'Personal Background and Lifestyle', 'How would you describe your childhood?', 'Use a few honest details and reflect on their influence without overstating causation.', 'Use a real example that shows this clearly. Use a few honest details and reflect on their influence without overstating causation. Keep the response truthful and describe what you did, what happened, and what you learned.', 'medium', 902, 'written', true, false),
  ('educational-journey', 'personal-background-and-lifestyle', 'Personal Background and Lifestyle', 'How would you describe your educational journey?', 'Summarize important transitions, effort, setbacks, and what you learned.', 'Use a real example that shows this clearly. Summarize important transitions, effort, setbacks, and what you learned. Keep the response truthful and describe what you did, what happened, and what you learned.', 'medium', 903, 'written', true, false),
  ('hobbies-and-interests', 'personal-background-and-lifestyle', 'Personal Background and Lifestyle', 'What are your favourite hobbies and interests?', 'Choose real interests and describe what you actually do or learn through them.', 'Use a real example that shows this clearly. Choose real interests and describe what you actually do or learn through them. Keep the response truthful and describe what you did, what happened, and what you learned.', 'easy', 904, 'written', true, false),
  ('free-time', 'personal-background-and-lifestyle', 'Personal Background and Lifestyle', 'How do you spend your free time?', 'Give a realistic picture of a typical week, including recreation and responsibilities.', 'Use a real example that shows this clearly. Give a realistic picture of a typical week, including recreation and responsibilities. Keep the response truthful and describe what you did, what happened, and what you learned.', 'easy', 905, 'written', true, false),
  ('sports-and-physical-activities', 'personal-background-and-lifestyle', 'Personal Background and Lifestyle', 'What sports and physical activities do you enjoy?', 'Mention activities you genuinely participate in and how regularly you do so.', 'Use a real example that shows this clearly. Mention activities you genuinely participate in and how regularly you do so. Keep the response truthful and describe what you did, what happened, and what you learned.', 'easy', 906, 'written', true, false),
  ('relationships-with-relatives', 'personal-background-and-lifestyle', 'Personal Background and Lifestyle', 'How would you describe your relationships with relatives?', 'Describe the way you maintain relationships while respecting family privacy.', 'Use a real example that shows this clearly. Describe the way you maintain relationships while respecting family privacy. Keep the response truthful and describe what you did, what happened, and what you learned.', 'medium', 907, 'written', true, false),
  ('religion-and-morality', 'personal-background-and-lifestyle', 'Personal Background and Lifestyle', 'What role does religion and morality play in your life?', 'Explain how personal principles influence everyday choices without making claims of perfection.', 'Use a real example that shows this clearly. Explain how personal principles influence everyday choices without making claims of perfection. Keep the response truthful and describe what you did, what happened, and what you learned.', 'medium', 908, 'written', true, false),
  ('daily-routine', 'personal-background-and-lifestyle', 'Personal Background and Lifestyle', 'How would you describe your daily routine?', 'Outline an ordinary day accurately, including study, rest, responsibilities, and flexibility.', 'Use a real example that shows this clearly. Outline an ordinary day accurately, including study, rest, responsibilities, and flexibility. Keep the response truthful and describe what you did, what happened, and what you learned.', 'easy', 909, 'written', true, false),
  ('important-life-lessons', 'personal-background-and-lifestyle', 'Personal Background and Lifestyle', 'What are the most important lessons you have learned from your life?', 'Select a lesson from experience and explain how it influences a current choice.', 'Use a real example that shows this clearly. Select a lesson from experience and explain how it influences a current choice. Keep the response truthful and describe what you did, what happened, and what you learned.', 'medium', 910, 'written', true, false)
on conflict (id) do nothing;

commit;

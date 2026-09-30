create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  notification_type text not null check (notification_type in (
    'SYSTEM', 'STUDY_REMINDER', 'NEW_CONTENT', 'MOCK_TEST_AVAILABLE',
    'PAYMENT_SUBMITTED', 'PAYMENT_APPROVED', 'PAYMENT_REJECTED',
    'SUBSCRIPTION_EXPIRING', 'SUBSCRIPTION_EXPIRED', 'ACCOUNT'
  )),
  title text not null check (length(title) between 1 and 120),
  message text not null check (length(message) between 1 and 600),
  action_url text check (
    action_url is null or (
      left(action_url, 1) = '/'
      and left(action_url, 2) <> '//'
      and position('..' in action_url) = 0
      and action_url !~ '[?#\\]'
    )
  ),
  is_read boolean not null default false,
  created_at timestamptz not null default now(),
  read_at timestamptz,
  expires_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  source_key text,
  constraint notifications_read_at_consistent check ((is_read and read_at is not null) or (not is_read and read_at is null))
);

create unique index if not exists notifications_user_source_unique_idx
  on public.notifications (user_id, source_key) where source_key is not null;
create index if not exists notifications_user_created_idx
  on public.notifications (user_id, created_at desc);
create index if not exists notifications_user_unread_idx
  on public.notifications (user_id, created_at desc) where not is_read;
create index if not exists notifications_expiration_idx
  on public.notifications (expires_at) where expires_at is not null;

create table if not exists public.notification_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  study_reminders_enabled boolean not null default false,
  preferred_time time not null default '18:00',
  preferred_days smallint[] not null default array[1, 2, 3, 4, 5]::smallint[],
  timezone_name text not null default 'UTC',
  new_content_enabled boolean not null default true,
  mock_test_notifications_enabled boolean not null default true,
  subscription_notifications_enabled boolean not null default true,
  updated_at timestamptz not null default now(),
  constraint notification_preferences_days_valid check (
    cardinality(preferred_days) between 1 and 7
    and preferred_days <@ array[0, 1, 2, 3, 4, 5, 6]::smallint[]
  ),
  constraint notification_preferences_timezone_length check (length(timezone_name) between 1 and 64)
);

create table if not exists public.notification_campaigns (
  id uuid primary key default gen_random_uuid(),
  notification_type text not null check (notification_type in ('SYSTEM', 'NEW_CONTENT', 'MOCK_TEST_AVAILABLE', 'ACCOUNT')),
  title text not null check (length(title) between 1 and 120),
  message text not null check (length(message) between 1 and 600),
  action_url text,
  audience text not null check (audience in ('ALL', 'FREE', 'PRO', 'PREMIUM')),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  expires_at timestamptz,
  constraint notification_campaigns_expiration check (expires_at is null or expires_at > created_at)
);

alter table public.notifications enable row level security;
alter table public.notification_preferences enable row level security;
alter table public.notification_campaigns enable row level security;

drop policy if exists notifications_read_own on public.notifications;
create policy notifications_read_own on public.notifications
  for select to authenticated
  using (user_id = auth.uid() and (expires_at is null or expires_at > now()));

drop policy if exists notifications_update_own_read_state on public.notifications;
create policy notifications_update_own_read_state on public.notifications
  for update to authenticated
  using (user_id = auth.uid() and (expires_at is null or expires_at > now()))
  with check (user_id = auth.uid());

drop policy if exists notification_preferences_read_own on public.notification_preferences;
create policy notification_preferences_read_own on public.notification_preferences
  for select to authenticated using (user_id = auth.uid());

drop policy if exists notification_campaigns_admin_read on public.notification_campaigns;
create policy notification_campaigns_admin_read on public.notification_campaigns
  for select to authenticated using (public.is_primary_admin());

revoke all on public.notifications from anon, authenticated;
grant select on public.notifications to authenticated;
grant update (is_read, read_at) on public.notifications to authenticated;
revoke all on public.notification_preferences from anon, authenticated;
grant select on public.notification_preferences to authenticated;
revoke all on public.notification_campaigns from anon, authenticated;

create or replace function public.seed_notification_preferences()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notification_preferences (user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

revoke all on function public.seed_notification_preferences() from public;
drop trigger if exists profiles_seed_notification_preferences on public.profiles;
create trigger profiles_seed_notification_preferences
after insert on public.profiles
for each row execute function public.seed_notification_preferences();

insert into public.notification_preferences (user_id)
select profile.id from public.profiles profile
on conflict (user_id) do nothing;

create or replace function public.get_my_notification_page(p_page integer default 1, p_page_size integer default 20)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v_page integer := greatest(coalesce(p_page, 1), 1);
declare v_size integer := least(greatest(coalesce(p_page_size, 20), 1), 20);
declare v_total integer;
declare v_unread integer;
declare v_items jsonb;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select count(*) into v_total from public.notifications
  where user_id = auth.uid() and (expires_at is null or expires_at > now());
  select count(*) into v_unread from public.notifications
  where user_id = auth.uid() and not is_read and (expires_at is null or expires_at > now());

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', page_rows.id,
    'notification_type', page_rows.notification_type,
    'title', page_rows.title,
    'message', page_rows.message,
    'action_url', page_rows.action_url,
    'is_read', page_rows.is_read,
    'created_at', page_rows.created_at,
    'expires_at', page_rows.expires_at
  ) order by page_rows.created_at desc), '[]'::jsonb)
  into v_items
  from (
    select id, notification_type, title, message, action_url, is_read, created_at, expires_at
    from public.notifications
    where user_id = auth.uid() and (expires_at is null or expires_at > now())
    order by created_at desc
    limit v_size offset ((v_page - 1) * v_size)
  ) page_rows;

  return jsonb_build_object(
    'items', v_items, 'page', v_page, 'page_size', v_size,
    'total', v_total, 'unread_count', v_unread, 'has_more', v_total > v_page * v_size
  );
end;
$$;

create or replace function public.get_my_unread_notification_count()
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::integer
  from public.notifications
  where user_id = auth.uid()
    and not is_read
    and (expires_at is null or expires_at > now());
$$;

create or replace function public.mark_notification_read(p_notification_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare v_updated integer;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  update public.notifications
  set is_read = true, read_at = coalesce(read_at, now())
  where id = p_notification_id and user_id = auth.uid()
    and not is_read and (expires_at is null or expires_at > now());
  get diagnostics v_updated = row_count;
  return v_updated > 0;
end;
$$;

create or replace function public.mark_all_notifications_read()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare v_updated integer;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  update public.notifications
  set is_read = true, read_at = now()
  where user_id = auth.uid() and not is_read
    and (expires_at is null or expires_at > now());
  get diagnostics v_updated = row_count;
  return v_updated;
end;
$$;

create or replace function public.get_my_notification_preferences()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v_preferences public.notification_preferences%rowtype;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  insert into public.notification_preferences (user_id)
  values (auth.uid()) on conflict (user_id) do nothing;
  select * into v_preferences from public.notification_preferences where user_id = auth.uid();
  return to_jsonb(v_preferences);
end;
$$;

create or replace function public.update_my_notification_preferences(
  p_study_reminders_enabled boolean,
  p_preferred_time time,
  p_preferred_days smallint[],
  p_timezone_name text,
  p_new_content_enabled boolean,
  p_mock_test_notifications_enabled boolean,
  p_subscription_notifications_enabled boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v_preferences public.notification_preferences%rowtype;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if p_study_reminders_enabled is null or p_preferred_time is null
    or p_new_content_enabled is null or p_mock_test_notifications_enabled is null
    or p_subscription_notifications_enabled is null then
    raise exception 'All notification preferences are required';
  end if;
  if coalesce(cardinality(p_preferred_days), 0) not between 1 and 7
    or not (p_preferred_days <@ array[0, 1, 2, 3, 4, 5, 6]::smallint[]) then
    raise exception 'Select one or more valid reminder days';
  end if;
  if length(coalesce(p_timezone_name, '')) > 64
    or not exists (select 1 from pg_timezone_names where name = p_timezone_name) then
    raise exception 'Select a valid timezone';
  end if;

  insert into public.notification_preferences (
    user_id, study_reminders_enabled, preferred_time, preferred_days,
    timezone_name, new_content_enabled, mock_test_notifications_enabled,
    subscription_notifications_enabled, updated_at
  ) values (
    auth.uid(), p_study_reminders_enabled, p_preferred_time, p_preferred_days,
    p_timezone_name, p_new_content_enabled, p_mock_test_notifications_enabled,
    p_subscription_notifications_enabled, now()
  ) on conflict (user_id) do update set
    study_reminders_enabled = excluded.study_reminders_enabled,
    preferred_time = excluded.preferred_time,
    preferred_days = excluded.preferred_days,
    timezone_name = excluded.timezone_name,
    new_content_enabled = excluded.new_content_enabled,
    mock_test_notifications_enabled = excluded.mock_test_notifications_enabled,
    subscription_notifications_enabled = excluded.subscription_notifications_enabled,
    updated_at = now();

  select * into v_preferences from public.notification_preferences where user_id = auth.uid();
  return to_jsonb(v_preferences);
end;
$$;

create or replace function public.create_admin_notification(
  p_title text,
  p_message text,
  p_notification_type text,
  p_action_url text,
  p_audience text,
  p_expires_at timestamptz default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v_campaign_id uuid;
declare v_slug text;
declare v_recipients integer;
declare v_is_premium boolean;
begin
  if not public.is_primary_admin() then raise exception 'Administrator access required'; end if;
  if length(trim(coalesce(p_title, ''))) not between 1 and 120 then raise exception 'Title must be 1 to 120 characters'; end if;
  if length(trim(coalesce(p_message, ''))) not between 1 and 600 then raise exception 'Message must be 1 to 600 characters'; end if;
  if p_notification_type not in ('SYSTEM', 'NEW_CONTENT', 'MOCK_TEST_AVAILABLE', 'ACCOUNT') then raise exception 'Invalid admin notification type'; end if;
  if p_audience not in ('ALL', 'FREE', 'PRO', 'PREMIUM') then raise exception 'Invalid notification audience'; end if;
  if p_expires_at is not null and p_expires_at <= now() then raise exception 'Expiration must be in the future'; end if;

  if p_action_url is not null then
    if length(p_action_url) > 256 or p_action_url ~ '[?#\\]'
      or position('..' in p_action_url) > 0 or left(p_action_url, 2) = '//' then
      raise exception 'Invalid notification destination';
    end if;
    if p_action_url not in ('/army', '/paf', '/navy', '/issb', '/study-materials', '/current-affairs', '/mock-tests', '/pricing', '/practice', '/dashboard', '/billing') then
      if p_action_url ~ '^/study-materials/[a-z0-9]+(-[a-z0-9]+)*$' then
        v_slug := split_part(p_action_url, '/', 3);
        select is_premium into v_is_premium from public.study_materials where slug = v_slug and is_published = true;
        if not found then raise exception 'Study material destination is not published'; end if;
        if v_is_premium and p_audience in ('ALL', 'FREE') then raise exception 'Premium material notifications must target Pro or Premium users'; end if;
      elsif p_action_url ~ '^/current-affairs/[a-z0-9]+(-[a-z0-9]+)*$' then
        v_slug := split_part(p_action_url, '/', 3);
        if not exists (select 1 from public.current_affairs where slug = v_slug and is_published = true) then raise exception 'Current affairs destination is not published'; end if;
      elsif p_action_url ~ '^/issb/[a-z0-9]+(-[a-z0-9]+)*$' then
        v_slug := split_part(p_action_url, '/', 3);
        if not exists (select 1 from public.issb_modules where slug = v_slug and is_published = true) then raise exception 'ISSB destination is not published'; end if;
      else
        raise exception 'Notification destination is not an available internal route';
      end if;
    end if;
  end if;

  insert into public.notification_campaigns (notification_type, title, message, action_url, audience, created_by, expires_at)
  values (p_notification_type, trim(p_title), trim(p_message), p_action_url, p_audience, auth.uid(), p_expires_at)
  returning id into v_campaign_id;

  insert into public.notifications (user_id, notification_type, title, message, action_url, created_by, expires_at, source_key)
  select profile.id, p_notification_type, trim(p_title), trim(p_message), p_action_url, auth.uid(), p_expires_at, 'campaign:' || v_campaign_id::text
  from public.profiles profile
  left join lateral (
    select plan.slug
    from public.subscriptions subscription
    join public.plans plan on plan.id = subscription.plan_id
    where subscription.user_id = profile.id and subscription.status = 'ACTIVE'
      and (subscription.expires_at is null or subscription.expires_at > now())
    order by subscription.started_at desc limit 1
  ) active_plan on true
  left join public.notification_preferences preferences on preferences.user_id = profile.id
  where (p_audience = 'ALL'
    or (p_audience = 'FREE' and coalesce(active_plan.slug, 'free') = 'free')
    or (p_audience in ('PRO', 'PREMIUM') and active_plan.slug = lower(p_audience)))
    and (p_notification_type not in ('NEW_CONTENT', 'SYSTEM') or coalesce(preferences.new_content_enabled, true))
    and (p_notification_type <> 'MOCK_TEST_AVAILABLE' or coalesce(preferences.mock_test_notifications_enabled, true));
  get diagnostics v_recipients = row_count;
  return jsonb_build_object('id', v_campaign_id, 'recipient_count', v_recipients);
end;
$$;

create or replace function public.get_admin_notification_history()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_primary_admin() then raise exception 'Administrator access required'; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', campaign.id,
      'notification_type', campaign.notification_type,
      'title', campaign.title,
      'message', campaign.message,
      'action_url', campaign.action_url,
      'audience', campaign.audience,
      'created_at', campaign.created_at,
      'expires_at', campaign.expires_at,
      'recipient_count', coalesce(counts.recipient_count, 0),
      'unread_count', coalesce(counts.unread_count, 0)
    ) order by campaign.created_at desc)
    from (select * from public.notification_campaigns order by created_at desc limit 100) campaign
    left join lateral (
      select count(*) as recipient_count, count(*) filter (where not notification.is_read) as unread_count
      from public.notifications notification
      where notification.source_key = 'campaign:' || campaign.id::text
    ) counts on true
  ), '[]'::jsonb);
end;
$$;

create or replace function public.notify_payment_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare v_plan_name text;
declare v_type text;
declare v_title text;
declare v_message text;
declare v_source text;
begin
  select name into v_plan_name from public.plans where id = new.plan_id;
  if tg_op = 'INSERT' then
    if new.payment_method is distinct from 'JAZZCASH_MANUAL' then return new; end if;
    v_type := 'PAYMENT_SUBMITTED';
    v_title := 'Payment submitted';
    v_message := format('Your FaujPrep %s payment has been submitted and is waiting for verification.', coalesce(v_plan_name, 'plan'));
    v_source := 'payment:' || new.id::text || ':submitted';
  elsif new.status is distinct from old.status and new.status = 'APPROVED' then
    v_type := 'PAYMENT_APPROVED';
    v_title := 'Payment approved';
    v_message := format('Your FaujPrep %s payment has been verified. Your plan is now active.', coalesce(v_plan_name, 'plan'));
    v_source := 'payment:' || new.id::text || ':approved';
  elsif new.status is distinct from old.status and new.status = 'REJECTED' then
    v_type := 'PAYMENT_REJECTED';
    v_title := 'Payment rejected';
    v_message := 'Your payment could not be verified. Please review your payment details or contact support.';
    v_source := 'payment:' || new.id::text || ':rejected';
  else
    return new;
  end if;

  insert into public.notifications (user_id, notification_type, title, message, action_url, source_key)
  values (new.user_id, v_type, v_title, v_message, '/billing', v_source)
  on conflict (user_id, source_key) where source_key is not null do nothing;
  return new;
end;
$$;

revoke all on function public.notify_payment_status() from public;
drop trigger if exists payment_transactions_notification on public.payment_transactions;
create trigger payment_transactions_notification
after insert or update of status on public.payment_transactions
for each row execute function public.notify_payment_status();

create or replace function public.notify_published_content()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare v_row jsonb := to_jsonb(new);
declare v_old jsonb;
declare v_published boolean;
declare v_was_published boolean := false;
declare v_id uuid;
declare v_slug text;
declare v_title text;
declare v_message text;
declare v_action_url text;
declare v_type text;
declare v_is_premium boolean := false;
begin
  if tg_table_name = 'mock_tests' then
    v_published := coalesce((v_row->>'is_active')::boolean, false);
  else
    v_published := coalesce((v_row->>'is_published')::boolean, false);
  end if;
  if tg_op = 'UPDATE' then
    v_old := to_jsonb(old);
    if tg_table_name = 'mock_tests' then
      v_was_published := coalesce((v_old->>'is_active')::boolean, false);
    else
      v_was_published := coalesce((v_old->>'is_published')::boolean, false);
    end if;
  end if;
  if not v_published or v_was_published then return new; end if;

  v_id := (v_row->>'id')::uuid;
  v_slug := v_row->>'slug';
  if tg_table_name = 'study_materials' then
    v_type := 'NEW_CONTENT';
    v_title := 'New Study Material';
    v_message := left(format('%s: %s', coalesce(v_row->>'title', 'Study material'), coalesce(v_row->>'description', 'New study material is available on FaujPrep.')), 600);
    v_action_url := case when v_slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' then '/study-materials/' || v_slug else '/study-materials' end;
    v_is_premium := coalesce((v_row->>'is_premium')::boolean, false);
  elsif tg_table_name = 'current_affairs' then
    v_type := 'NEW_CONTENT';
    v_title := 'New Current Affairs';
    v_message := left(format('%s: %s', coalesce(v_row->>'title', 'Current affairs'), coalesce(v_row->>'summary', 'New current affairs have been published on FaujPrep.')), 600);
    v_action_url := case when v_slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' then '/current-affairs/' || v_slug else '/current-affairs' end;
  elsif tg_table_name = 'issb_modules' then
    v_type := 'NEW_CONTENT';
    v_title := 'New ISSB Preparation Module';
    v_message := left(format('%s: %s', coalesce(v_row->>'title', 'ISSB module'), coalesce(v_row->>'description', 'New ISSB preparation content is available.')), 600);
    v_action_url := case when v_slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' then '/issb/' || v_slug else '/issb' end;
  elsif tg_table_name = 'mock_tests' then
    v_type := 'MOCK_TEST_AVAILABLE';
    v_title := 'New Mock Test';
    v_message := left(format('%s is ready in the FaujPrep mock test center.', coalesce(v_row->>'title', 'A new mock test')), 600);
    v_action_url := '/mock-tests';
    v_is_premium := coalesce((v_row->>'is_premium')::boolean, false);
  else
    return new;
  end if;

  insert into public.notifications (user_id, notification_type, title, message, action_url, created_by, source_key)
  select profile.id, v_type, v_title, v_message, v_action_url, auth.uid(), 'content:' || tg_table_name || ':' || v_id::text
  from public.profiles profile
  left join public.notification_preferences preferences on preferences.user_id = profile.id
  left join lateral (
    select plan.slug
    from public.subscriptions subscription
    join public.plans plan on plan.id = subscription.plan_id
    where subscription.user_id = profile.id and subscription.status = 'ACTIVE'
      and (subscription.expires_at is null or subscription.expires_at > now())
    order by subscription.started_at desc
    limit 1
  ) active_plan on true
  where (case when v_type = 'MOCK_TEST_AVAILABLE' then coalesce(preferences.mock_test_notifications_enabled, true) else coalesce(preferences.new_content_enabled, true) end)
    and (not v_is_premium or active_plan.slug in ('pro', 'premium'))
  on conflict (user_id, source_key) where source_key is not null do nothing;
  return new;
end;
$$;

revoke all on function public.notify_published_content() from public;
drop trigger if exists study_materials_publish_notification on public.study_materials;
create trigger study_materials_publish_notification
after insert or update of is_published on public.study_materials
for each row execute function public.notify_published_content();
drop trigger if exists current_affairs_publish_notification on public.current_affairs;
create trigger current_affairs_publish_notification
after insert or update of is_published on public.current_affairs
for each row execute function public.notify_published_content();
drop trigger if exists issb_modules_publish_notification on public.issb_modules;
create trigger issb_modules_publish_notification
after insert or update of is_published on public.issb_modules
for each row execute function public.notify_published_content();
drop trigger if exists mock_tests_publish_notification on public.mock_tests;
create trigger mock_tests_publish_notification
after insert or update of is_active on public.mock_tests
for each row execute function public.notify_published_content();

create index if not exists subscriptions_active_expiration_idx
  on public.subscriptions (expires_at) where status = 'ACTIVE' and expires_at is not null;

create or replace function public.generate_scheduled_notifications(p_batch_size integer default 500)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare v_now timestamptz := now();
declare v_user record;
declare v_local_now timestamp;
declare v_created integer := 0;
declare v_rows integer;
begin
  if p_batch_size is null or p_batch_size not between 1 and 2000 then
    raise exception 'Batch size must be between 1 and 2000';
  end if;

  for v_user in
    select preference.user_id, preference.preferred_time, preference.preferred_days,
      preference.timezone_name, profile.target_exam_id, exam.name as exam_name
    from public.notification_preferences preference
    join public.profiles profile on profile.id = preference.user_id
    left join auth.users auth_user on auth_user.id = profile.id
    left join public.exams exam on exam.id = profile.target_exam_id and exam.is_active = true
    where preference.study_reminders_enabled
      and (auth_user.banned_until is null or auth_user.banned_until <= v_now)
      and extract(dow from (v_now at time zone preference.timezone_name))::smallint = any(preference.preferred_days)
      and (v_now at time zone preference.timezone_name) >= ((v_now at time zone preference.timezone_name)::date + preference.preferred_time)
      and (v_now at time zone preference.timezone_name) < ((v_now at time zone preference.timezone_name)::date + preference.preferred_time + interval '15 minutes')
      and not exists (
        select 1 from public.notifications existing
        where existing.user_id = preference.user_id
          and existing.source_key = 'study-reminder:' || preference.user_id::text || ':' || ((v_now at time zone preference.timezone_name)::date)::text
      )
    order by preference.user_id
    limit p_batch_size
  loop
    v_local_now := v_now at time zone v_user.timezone_name;
    if extract(dow from v_local_now)::smallint = any(v_user.preferred_days)
      and v_local_now >= v_local_now::date + v_user.preferred_time
      and v_local_now < v_local_now::date + v_user.preferred_time + interval '15 minutes' then
      insert into public.notifications (
        user_id, notification_type, title, message, action_url, expires_at, source_key
      ) values (
        v_user.user_id,
        'STUDY_REMINDER',
        'Study reminder',
        case when v_user.exam_name is null then 'Time to continue your FaujPrep preparation.' else format('Continue your preparation for %s.', v_user.exam_name) end,
        '/practice',
        v_now + interval '30 days',
        'study-reminder:' || v_user.user_id::text || ':' || v_local_now::date::text
      ) on conflict (user_id, source_key) where source_key is not null do nothing;
      get diagnostics v_rows = row_count;
      v_created := v_created + v_rows;
    end if;
  end loop;

  insert into public.notifications (user_id, notification_type, title, message, action_url, expires_at, source_key)
  select subscription.user_id,
    'SUBSCRIPTION_EXPIRING',
    format('Your %s plan expires soon', plan.name),
    'Your current plan is approaching its expiration date.',
    '/billing',
    subscription.expires_at + interval '30 days',
    'subscription:' || subscription.id::text || ':expiring:' || subscription.expires_at::text
  from (
    select source.id, source.user_id, source.plan_id, source.expires_at
    from public.subscriptions source
    left join public.notification_preferences preference on preference.user_id = source.user_id
    where source.status = 'ACTIVE'
      and source.expires_at > v_now
      and source.expires_at <= v_now + interval '24 hours'
      and coalesce(preference.subscription_notifications_enabled, true)
      and not exists (
        select 1 from public.notifications existing
        where existing.user_id = source.user_id
          and existing.source_key = 'subscription:' || source.id::text || ':expiring:' || source.expires_at::text
      )
    order by source.expires_at
    limit p_batch_size
  ) subscription
  join public.plans plan on plan.id = subscription.plan_id
  on conflict (user_id, source_key) where source_key is not null do nothing;
  get diagnostics v_rows = row_count;
  v_created := v_created + v_rows;

  insert into public.notifications (user_id, notification_type, title, message, action_url, expires_at, source_key)
  select subscription.user_id,
    'SUBSCRIPTION_EXPIRED',
    format('Your %s plan has expired', plan.name),
    'Your account has returned to Free access.',
    '/billing',
    v_now + interval '30 days',
    'subscription:' || subscription.id::text || ':expired:' || subscription.expires_at::text
  from (
    select source.id, source.user_id, source.plan_id, source.expires_at
    from public.subscriptions source
    left join public.notification_preferences preference on preference.user_id = source.user_id
    where source.status = 'ACTIVE'
      and source.expires_at is not null
      and source.expires_at <= v_now
      and coalesce(preference.subscription_notifications_enabled, true)
      and not exists (
        select 1 from public.notifications existing
        where existing.user_id = source.user_id
          and existing.source_key = 'subscription:' || source.id::text || ':expired:' || source.expires_at::text
      )
    order by source.expires_at
    limit p_batch_size
  ) subscription
  join public.plans plan on plan.id = subscription.plan_id
  on conflict (user_id, source_key) where source_key is not null do nothing;
  get diagnostics v_rows = row_count;
  v_created := v_created + v_rows;
  return v_created;
end;
$$;

revoke all on function public.generate_scheduled_notifications(integer) from public, anon, authenticated;
grant execute on function public.generate_scheduled_notifications(integer) to service_role;

revoke all on function public.seed_notification_preferences() from public, anon, authenticated;
revoke all on function public.get_my_notification_page(integer, integer) from public, anon;
revoke all on function public.get_my_unread_notification_count() from public, anon;
revoke all on function public.mark_notification_read(uuid) from public, anon;
revoke all on function public.mark_all_notifications_read() from public, anon;
revoke all on function public.get_my_notification_preferences() from public, anon;
revoke all on function public.update_my_notification_preferences(boolean, time, smallint[], text, boolean, boolean, boolean) from public, anon;
revoke all on function public.create_admin_notification(text, text, text, text, text, timestamptz) from public, anon;
revoke all on function public.get_admin_notification_history() from public, anon;

grant execute on function public.get_my_notification_page(integer, integer) to authenticated;
grant execute on function public.get_my_unread_notification_count() to authenticated;
grant execute on function public.mark_notification_read(uuid) to authenticated;
grant execute on function public.mark_all_notifications_read() to authenticated;
grant execute on function public.get_my_notification_preferences() to authenticated;
grant execute on function public.update_my_notification_preferences(boolean, time, smallint[], text, boolean, boolean, boolean) to authenticated;
grant execute on function public.create_admin_notification(text, text, text, text, text, timestamptz) to authenticated;
grant execute on function public.get_admin_notification_history() to authenticated;
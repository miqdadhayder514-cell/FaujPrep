insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'payment-screenshots',
  'payment-screenshots',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists users_upload_own_payment_screenshots on storage.objects;
create policy users_upload_own_payment_screenshots
on storage.objects for insert to authenticated
with check (
  bucket_id = 'payment-screenshots'
  and split_part(name, '/', 1) = auth.uid()::text
);

drop policy if exists admins_read_payment_screenshots on storage.objects;
create policy admins_read_payment_screenshots
on storage.objects for select to authenticated
using (
  bucket_id = 'payment-screenshots'
  and public.is_editor_or_admin()
);

create or replace function public.submit_manual_payment_proof(
  p_plan_slug text,
  p_sender_name text,
  p_sender_phone text,
  p_transaction_reference text,
  p_payment_date date,
  p_payment_time time,
  p_payment_screenshot_url text,
  p_notes text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v_user_id uuid := auth.uid();
declare v_plan public.plans%rowtype;
declare v_payment_id uuid;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  if trim(coalesce(p_sender_name, '')) = '' then
    raise exception 'Sender name is required';
  end if;

  if trim(coalesce(p_sender_phone, '')) = '' then
    raise exception 'JazzCash mobile number is required';
  end if;

  if p_payment_date is null then
    raise exception 'Payment date is required';
  end if;

  if trim(coalesce(p_payment_screenshot_url, '')) = '' then
    raise exception 'Payment screenshot is required';
  end if;

  if not exists (
    select 1
    from storage.objects
    where bucket_id = 'payment-screenshots'
      and name = trim(p_payment_screenshot_url)
      and split_part(name, '/', 1) = v_user_id::text
  ) then
    raise exception 'Upload a valid payment screenshot before submitting';
  end if;

  select * into v_plan
  from public.plans
  where slug = p_plan_slug and is_active = true;

  if not found then
    raise exception 'Invalid plan selection';
  end if;

  insert into public.payment_transactions (
    user_id,
    plan_id,
    amount_pkr,
    currency,
    payment_method,
    sender_name,
    sender_phone,
    transaction_reference,
    payment_date,
    payment_time,
    payment_screenshot_url,
    notes,
    status,
    created_at,
    updated_at
  ) values (
    v_user_id,
    v_plan.id,
    v_plan.price_pkr,
    'PKR',
    'JAZZCASH_MANUAL',
    trim(p_sender_name),
    trim(p_sender_phone),
    null,
    p_payment_date,
    p_payment_time,
    trim(p_payment_screenshot_url),
    p_notes,
    'PENDING',
    now(),
    now()
  ) returning id into v_payment_id;

  return jsonb_build_object(
    'id', v_payment_id,
    'status', 'PENDING',
    'plan_slug', v_plan.slug,
    'amount_pkr', v_plan.price_pkr,
    'message', 'Payment submitted successfully. Your payment is pending verification and premium access will be activated after admin approval.'
  );
end;
$$;

grant execute on function public.submit_manual_payment_proof(text, text, text, text, date, time, text, text) to authenticated;
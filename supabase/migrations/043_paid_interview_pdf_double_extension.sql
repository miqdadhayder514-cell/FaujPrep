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
        or (
          purchase.test_slug = 'pma-long-course-159-interview-fully-cracked'
          and p_object_name in (
            'pma-long-course-159-interview-fully-cracked.pdf',
            'pma-long-course-159-interview-fully-cracked.pdf.pdf'
          )
        )
      )
  );
$$;

revoke all on function public.can_download_paid_note(text) from public, anon;
grant execute on function public.can_download_paid_note(text) to authenticated;

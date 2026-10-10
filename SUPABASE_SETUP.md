# Supabase setup

1. Create a Supabase project.
2. In the Supabase SQL Editor, run `supabase/migrations/001_phase2_schema.sql`.
3. Run `supabase/migrations/002_validation.sql` and confirm the counts returned by the validation query.
4. Copy `.env.example` to `.env.local` and add the project URL and anon key:

```text
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

5. Restart Vite with `npm run dev`.
6. Enable anonymous sign-ins in Supabase Authentication settings for public practice and payment sessions. Keep email/password sign-in enabled for the existing primary administrator, require email confirmation, and disable public email/password sign-ups.

Candidate progress, billing, and payment records use a persistent anonymous session stored in the current browser. Clearing browser storage or switching browsers creates a separate visitor identity. The only password login in FaujPrep is the admin login, restricted to the confirmed `miqdadhayder514@gmail.com` account.

Only the publishable anon key belongs in `.env.local`. Never put a service-role key in this frontend project.

### Uploading private paid-note PDFs

Paid PDFs must be uploaded to the private `paid-notes` Storage bucket before approved candidates can view them. For the Crack Interview PDF, upload `interview/PMA_Long_Course_159_Interview fully Cracked.pdf` using this exact object name:

```text
pma-long-course-159-interview-fully-cracked.pdf
```

Alternatively, run the targeted uploader from `my-app` with `SUPABASE_URL` and a current `SUPABASE_SERVICE_ROLE_KEY` available only in your local process environment:

```powershell
npm run upload:paid-notes -- --product=pma-long-course-159-interview-fully-cracked
```

Never put the service-role key in `.env.local`, commit it, or share it in chat. The uploader reads the source PDF from the repository's `interview` folder for this product; other paid notes continue to use the `Notes` folder.

When variables are absent, FaujPrep shows an explicit database setup notice. It does not pretend that authentication, live content, or progress tracking are connected.

## Analytics

Apply the Supabase migrations in numeric order through `023_prevent_duplicate_manual_payment_rows.sql`. Migration 015 promotes the existing, email-confirmed `miqdadhayder514@gmail.com` profile to `ADMIN` and restricts admin database helpers, UI entry points, and analytics to that account. Other `ADMIN` and `EDITOR` profiles will no longer have admin access. Migration 021 adds the first full mock test with its 200 ordered questions and source figures; migration 022 fixes the admin analytics revenue aggregate; migration 023 prevents duplicate manual-payment rows. Event history starts when migration 014 is deployed, while practice, mock-test, subscription, and payment totals also use their existing source tables.

The browser only receives the publishable anon key. Analytics writes go through the validated event RPC, and reports are returned as admin-checked aggregates rather than raw event rows.

### Scheduled reminders

Migration 016 provides `public.generate_scheduled_notifications(integer)` for service-role/cron execution but does not schedule it. To automate reminders and subscription expiry notices, enable Supabase Cron (`pg_cron`) and schedule this every 15 minutes in the Supabase SQL Editor:

```sql
select cron.schedule(
	'faujprep-scheduled-notifications',
	'*/15 * * * *',
	$$select public.generate_scheduled_notifications(500);$$
);
```

Until that deployment step is configured, preferences are saved and the function is ready, but study reminders and scheduled subscription notices will not be generated automatically. Payment and published-content notifications are trigger-driven and do not depend on Cron.

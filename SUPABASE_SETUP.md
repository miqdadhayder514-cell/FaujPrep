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
6. Enable email authentication in Supabase Authentication settings if email confirmation is desired.

Only the publishable anon key belongs in `.env.local`. Never put a service-role key in this frontend project.

When variables are absent, FaujPrep shows an explicit database setup notice. It does not pretend that authentication, live content, or progress tracking are connected.

## Analytics

Apply the Supabase migrations in numeric order through `016_notifications_and_study_reminders.sql`. Migration 015 promotes the existing, email-confirmed `miqdadhayder514@gmail.com` profile to `ADMIN` and restricts admin database helpers, UI entry points, and analytics to that account. Other `ADMIN` and `EDITOR` profiles will no longer have admin access. Event history starts when migration 014 is deployed, while practice, mock-test, subscription, and payment totals also use their existing source tables.

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

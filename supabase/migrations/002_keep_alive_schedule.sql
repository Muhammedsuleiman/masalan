-- =============================================================================
-- MASALAN BUSINESS ENTERPRISE — keep-alive schedule
--
-- Schedules a daily invocation of the `keep_alive` Edge Function so the
-- Supabase Free Plan project generates legitimate activity every day.
--
-- The Edge Function (supabase/functions/keep_alive/index.ts) performs a
-- harmless READ-ONLY query (`select id limit 1` from `businesses`). It never
-- creates or modifies business data.
--
-- Requirements (both are supported extensions on the hosted Supabase plan):
--   * pg_cron  — the recurring job scheduler
--   * pg_net   — lets Postgres issue HTTP requests
--
-- Apply via Supabase Dashboard -> SQL Editor (paste & run), or:
--   supabase link --project-ref gxrnlrogpmlagzmwlwjp
--   supabase db push
--
-- Safe to run more than once. To remove the schedule later:
--   select cron.unschedule('masalan-keep-alive-daily');
-- =============================================================================

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Remove any previous version of the job so re-runs are idempotent.
select cron.unschedule('masalan-keep-alive-daily')
where exists (
  select 1 from cron.job where jobname = 'masalan-keep-alive-daily'
);

-- Run once per day at 04:00 UTC.
-- The function has verify_jwt = false, so no apikey/authorization header is
-- required and no key is stored in the database.
select cron.schedule(
  'masalan-keep-alive-daily',
  '0 4 * * *',
  $$
  select
    net.http_post(
      url := 'https://gxrnlrogpmlagzmwlwjp.supabase.co/functions/v1/keep_alive',
      headers := jsonb_build_object('Content-Type', 'application/json'),
      body := jsonb_build_object('source', 'cron', 'at', now()),
      timeout_milliseconds := 10000
    ) as request_id;
  $$
);

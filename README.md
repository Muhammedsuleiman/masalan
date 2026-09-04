# Masalan Business Enterprise

Frontend + Supabase backend for Masalan Bakery Limited and Masalan Water Factory.

## Supabase Keep-Alive

### Why it exists

The Supabase Free Plan pauses projects that are considered inactive, evaluated
over a rolling 7-day window. This keep-alive generates one lightweight,
legitimate request to the project every day so it is not treated as inactive —
even when nobody is logged in and nobody has opened the website.

> **Important limitation:** A keep-alive does not *guarantee* Supabase will
> never pause the project. If Supabase changes its inactivity policy, this
> mechanism may no longer be sufficient. The application is designed to keep
> working normally even if the keep-alive is removed.

### How often it runs

Once per day at **04:00 UTC** (cron expression `0 4 * * *`).

### Where the code is located

| File | Purpose |
| --- | --- |
| `supabase/functions/keep_alive/index.ts` | The Edge Function. Server-side, read-only. |
| `supabase/config.toml` | Function config (`verify_jwt = false` so the cron job needs no JWT). |
| `supabase/migrations/002_keep_alive_schedule.sql` | Creates the daily pg_cron schedule. |

### What the function does

1. Starts (triggered by the pg_cron job via `pg_net`).
2. Makes one harmless **read-only** query: `select id from businesses limit 1`.
3. Logs success or failure to the function logs.
4. Returns a small JSON status (`ok: true` + timestamp). No sensitive data.

It **never** creates fake sales, payments, customers or expenses, and it never
modifies financial records, products, users or balances.

### Security

- The service-role key is used **only** inside the Edge Function, where Supabase
  injects it as the server-side `SUPABASE_SERVICE_ROLE_KEY` env variable.
- It is never placed in React, never exposed to the browser, and never committed.
- The frontend continues to use only the existing Supabase publishable key.
- No extra secrets need to be created — the two env variables the function uses
  (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`) are injected automatically by
  the Supabase platform.

### How to deploy it

Requires the Supabase CLI (not installed on this machine — see below).

```bash
supabase link --project-ref gxrnlrogpmlagzmwlwjp
supabase functions deploy keep_alive
supabase db push
```

### How to test it manually

After deploying the function, call it directly:

```bash
curl -X POST https://gxrnlrogpmlagzmwlwjp.supabase.co/functions/v1/keep_alive
```

Expected response: `{"ok":true,"at":"<timestamp>"}`.

### How to check its logs

In the Supabase Dashboard: **Edge Functions → keep_alive → Logs**.
Successful runs log `[keep_alive] <timestamp> OK probe_rows=…`. Failures log
`FAILED` or `ERROR` with a reason.

You can also check the schedule itself in the Dashboard: **Integrations →
Cron → Jobs** (job name `masalan-keep-alive-daily`), or run:

```sql
select * from cron.job where jobname = 'masalan-keep-alive-daily';
select * from cron.job_run_details order by start_time desc limit 5;
```

### How the scheduled invocation works

1. `pg_cron` fires the job `masalan-keep-alive-daily` daily at 04:00 UTC.
2. `pg_net` sends an HTTP `POST` to `/functions/v1/keep_alive`.
3. The Edge Function runs the read-only health probe and logs the result.
4. `pg_net` records the request in `net._http_response` for auditing.

Both `pg_cron` and `pg_net` are Supabase-supported extensions and must be
enabled. The migration runs `create extension if not exists …` for both, so it
takes care of this automatically when applied via the SQL Editor or `db push`.

### Steps still required (manual Supabase Dashboard)

1. Install the Supabase CLI, or use the Dashboard SQL Editor:
   - Deploy the Edge Function (CLI: `supabase functions deploy keep_alive`).
   - Apply `supabase/migrations/002_keep_alive_schedule.sql` (SQL Editor, or
     `supabase db push`).
2. Verify the function responds to a manual `curl`.
3. Confirm the cron job appears under **Integrations → Cron → Jobs**.

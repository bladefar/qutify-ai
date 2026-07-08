# Applying migrations

## Option A — Supabase Dashboard (recommended)

1. Open your project in the [Supabase Dashboard](https://supabase.com/dashboard)
2. Go to **SQL Editor** → **New query**
3. Paste the contents of `supabase/migrations/20250708120000_customers_products.sql`
4. Click **Run**

## Option B — Supabase CLI

```bash
# Install CLI: https://supabase.com/docs/guides/cli
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

## Verify

After applying, confirm in **Table Editor** that `customers` and `products` exist, and check **Authentication → Policies** for the four RLS policies on each table.

## Environment

Copy `.env.example` to `.env.local` and add your project URL and anon key from **Project Settings → API**.

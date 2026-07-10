# Quotify AI — Setup Guide (beginner-friendly)

Follow these steps **in order**. Takes about 5 minutes.

---

## Step 1: Create the database tables

This is a one-time copy-paste in your Supabase dashboard.

1. Open: **https://supabase.com/dashboard/project/qtfdhqevnvfhkimswkpc/sql/new**
2. Open the file `supabase/migrations/20250708120000_customers_products.sql` in this project
3. **Select all** the SQL (Cmd+A) and **copy** it (Cmd+C)
4. **Paste** into the Supabase SQL Editor
5. Click the green **Run** button (bottom right)
6. You should see **Success. No rows returned**

**Verify:** Go to **Table Editor** in the left sidebar — you should see `customers` and `products` tables.

---

## Step 2: Turn off email confirmation (for easy testing)

1. Open: **https://supabase.com/dashboard/project/qtfdhqevnvfhkimswkpc/auth/providers**
2. Click **Email**
3. Turn **OFF** “Confirm email”
4. Click **Save**

Now you can sign up and use the app immediately without checking email.

---

## Step 3: Run the app

In your terminal, from the project folder:

```bash
npm run dev
```

Open **http://localhost:3000** in your browser.

---

## Step 4: Create an account & test

1. Go to **http://localhost:3000/register**
2. Enter any email + password (6+ chars)
3. You’ll land on the dashboard
4. Click **Customers** in the sidebar
5. Click **Add customer** — fill in a name and save

If that works, you’re all set!

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| “relation customers does not exist” | Repeat Step 1 (migration not run) |
| Can’t sign up / invalid API key | Check `.env.local` has your Supabase URL + publishable key |
| Redirect loop on login | Restart dev server after changing `.env.local` |
| Email confirmation required | Repeat Step 2 |

---

## Your Supabase project links

- **Dashboard:** https://supabase.com/dashboard/project/qtfdhqevnvfhkimswkpc
- **SQL Editor:** https://supabase.com/dashboard/project/qtfdhqevnvfhkimswkpc/sql/new
- **Table Editor:** https://supabase.com/dashboard/project/qtfdhqevnvfhkimswkpc/editor

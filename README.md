# LedgerPulse — CA Workspace Manager

A private web app for a CA / accounting firm that keeps clients, employees, tasks and team communication in one place.

| Area | What it does |
| --- | --- |
| **Dashboard** | Clients, employees, pending, in-progress, due-today and overdue counts. Status donut, workload-by-employee chart, completions over the last 14 days, a "needs attention" deadline list, your reminders and recent activity. Employees see their own numbers. |
| **Clients** | Name, **constitution type** (Individual, Proprietorship, Partnership, LLP, Pvt Ltd, Public Ltd, OPC, HUF, Trust, Society, AOP/BOI), **GSTIN** (validated, with PAN and state filled in automatically), PAN, email, mobile, address, the employee who handles the client, notes, and **any number of partners / directors / trustees**, each with their own email and mobile. Search, filters, CSV export, and a client page that shows its open tasks and communication history. |
| **Employees** (admin) | Create logins, set designation, mobile and joining date, give admin access, reset passwords, and deactivate or reactivate accounts. Shows open and overdue tasks per person. |
| **Tasks** | Assign to employees with client, category (GST, Income Tax, TDS, Audit, ROC…), period, priority, due date and **recurrence** (monthly, quarterly, half-yearly, yearly). Completing a recurring task creates the next one automatically. Kanban board with drag and drop, or a list view. Filter by status, employee, client, priority, category and due date. Each task has comments, a full activity history and a CSV export. |
| **Inbox** | 1-to-1 **team messages**, **client communication logs** (call, meeting, email, WhatsApp, notice, visit, with follow-up dates), personal **reminders**, and **notifications** (assigned to you, status changed, new comment, new message). |
| **Security** | Passwords are hashed with bcrypt. Sessions use a signed, httpOnly cookie. Every action checks permissions on the server. Employees see only their own tasks. Login attempts are rate-limited, and pages are hidden from search engines. |

Built with Next.js 16, React 19, Tailwind CSS 4, Prisma 6 and PostgreSQL. It works on desktop and mobile.

---

## 1. Accounts you need (all free)

You need three free accounts: **GitHub** (to hold the code), **Neon** (the database) and **Vercel** (to host the website).

### a) GitHub: holds the code
You already have one. Create a **private** repository for this project:
1. Go to https://github.com/new
2. Repository name: `ca-workspace`. Choose **Private**. **Don't** tick "Add a README".
3. Click **Create repository**.

### b) Neon: the PostgreSQL database
1. Go to https://neon.tech and click **Sign up**. Choose **Continue with GitHub**, which is easiest.
2. Create a project. Name: `ca-workspace`. Region: **Asia Pacific (Singapore)**, which is closest to India. Postgres version: the default.
3. On the project dashboard, click **Connect**:
   - Turn **Connection pooling ON** and copy the string. This is your `DATABASE_URL`.
   - Turn **Connection pooling OFF** and copy the string. This is your `DIRECT_URL`.
   - Both look like `postgresql://neondb_owner:xxxx@ep-xxxx.ap-southeast-1.aws.neon.tech/neondb?sslmode=require`. The pooled one has `-pooler` in the host.

> **Prefer Supabase?** That works too. Go to https://supabase.com, create a New project (region: Mumbai), then open Project Settings → Database → Connection string. Use the **Transaction pooler** (port 6543) URL with `?pgbouncer=true` added as `DATABASE_URL`, and the **Session / Direct** (port 5432) URL as `DIRECT_URL`.

### c) Vercel: hosts the website
1. Go to https://vercel.com/signup and choose **Continue with GitHub**. The free **Hobby** plan is enough.
2. When asked, allow Vercel to access your `ca-workspace` repository.

---

## 2. The `.env` file (your credentials)

Copy `.env.example` to `.env` and fill it in:

```env
DATABASE_URL="<Neon pooled connection string>"
DIRECT_URL="<Neon direct connection string>"
AUTH_SECRET="<long random text: run  openssl rand -base64 32>"
FIRM_NAME="LedgerPulse"
FIRM_TAGLINE="CA Workspace Manager"
SEED_ADMIN_NAME="Your Name"
SEED_ADMIN_EMAIL="admin@yourfirm.in"
SEED_ADMIN_PASSWORD="ChooseAStrongPassword"
SEED_DEMO="false"
```

- `AUTH_SECRET`: if you don't have `openssl`, use any random 40+ character string, for example from https://generate-secret.vercel.app/32.
- `SEED_DEMO="true"` loads sample clients and tasks to try the app. Employee demo logins are `rahul@cafirm.in`, `priya@cafirm.in` and `arjun@cafirm.in`, all with password `Employee@123`. Use `"false"` for your real data.
- `.env` is listed in `.gitignore`, so it never goes to GitHub.

---

## 3. Run it on your computer (optional)

Install **Node.js 20 or newer** from https://nodejs.org, then:

```bash
npm install
```

```bash
npm run db:push
```

```bash
npm run db:seed
```

```bash
npm run dev
```

Open http://localhost:3000 and sign in with `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`.

`db:push` creates the tables, and `db:seed` creates your admin login (plus demo data if `SEED_DEMO="true"`).

---

## 4. Put it online (Vercel)

1. Push this code to your private GitHub repo:

   ```bash
   git remote add origin https://github.com/<your-username>/ca-workspace.git
   ```

   ```bash
   git push -u origin main
   ```

2. In Vercel, click **Add New… → Project**, pick `ca-workspace`, then **Import**.
3. Open **Environment Variables** and add:
   `DATABASE_URL`, `DIRECT_URL`, `AUTH_SECRET`, `FIRM_NAME`, `FIRM_TAGLINE`,
   plus your first admin login: `SEED_ADMIN_NAME`, `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`.
4. Click **Deploy**. Every build automatically:
   - creates or updates the database tables (`prisma db push`; it refuses changes that would delete data),
   - turns on row level security for every table, so Supabase's public Data API can't read them,
   - creates the admin login if it doesn't exist yet. It never changes an existing password.
5. Open your link (e.g. `https://ca-workspace-xxxx.vercel.app`), sign in with the admin email and password, and change the password under **My profile**.
6. Optional: add your own domain (e.g. `work.yourfirm.in`) in Vercel under Project → Settings → Domains.

No commands on your computer are needed. (Running `npm run db:push` / `npm run db:seed` locally still works if you prefer.)

From then on, every push to `main` redeploys automatically.

---

## 5. Day-to-day use

1. **Admin** opens **Employees → New employee**, creates logins, and shares the email and initial password with each person.
2. Add clients in **Clients → New client**. Typing the GSTIN fills in the PAN and state, and partners can be added as needed.
3. Assign work in **Tasks → New task**. For monthly GSTR-3B, quarterly TDS and similar jobs, set **Repeats**. When a task is marked Completed, next period's task appears automatically.
4. Employees sign in, see **My Tasks**, drag cards or change status, and post comments. The admin is notified.
5. Log every client call, meeting or notice in **Inbox → Client logs**. Use **Team messages** for internal questions and **Reminders** for personal to-dos.
6. Use **Export** on the Clients and Tasks pages to download an Excel-ready CSV.

**Forgotten password:** an admin resets it in Employees (🔑 icon). If the only admin is locked out, change `SEED_ADMIN_PASSWORD` in `.env`, delete that user in `npm run db:studio`, then run `npm run db:seed` again.

---

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the local dev server |
| `npm run build` / `npm start` | Production build / serve |
| `npm run lint` | Type-check |
| `npm run db:push` | Create or update database tables from `prisma/schema.prisma` |
| `npm run db:seed` | Create the first admin (plus demo data if `SEED_DEMO=true`) |
| `npm run db:studio` | Browse and edit the database in your browser |

## Project layout

```
prisma/schema.prisma      database tables
prisma/seed.ts            first admin + demo data
src/app/(app)/            signed-in pages: dashboard, tasks, clients, employees, inbox, profile
src/app/actions/          server actions (all writes and permission checks)
src/app/api/export/       CSV exports
src/app/login/            sign-in page
src/components/           shared UI (sidebar, board, forms, charts)
src/lib/                  auth, db, formatting, GSTIN validation, filters
```

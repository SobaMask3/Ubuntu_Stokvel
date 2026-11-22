# Ubuntu Stokvel portal

Members-only site for the stokvel: a savings goal with a wave progress bar, a record of every
payment with its proof of payment, a who-has-paid list per month, and cycles you can restart
with a higher contribution.

Stack: Next.js 14 · Supabase (login, database, file storage) · Vercel. All free tiers.

## How payments are counted

A member's payments in a cycle are added up and fill months in order.

| Member pays | At R250/month it covers |
|---|---|
| R750 on 1 Oct | Oct, Nov, Dec (Nov and Dec show as *Paid in advance*) |
| R150 | Part of the next unpaid month (shows *R150 of R250*) |
| R500 late in Nov, nothing before | Oct and Nov (oldest month first) |
| More than the whole cycle | The extra becomes credit and moves to the next cycle |

The rules live in `lib/allocation.ts`; `npm test` runs the examples above.

## Set it up (about 20 minutes)

| Step | Where | What to do |
|---|---|---|
| 1 | supabase.com | Create a project. Region: **South Africa (Cape Town)** if offered. |
| 2 | Supabase › SQL Editor | Paste all of `supabase/migrations/001_init.sql` and run it. |
| 3 | Supabase › Authentication › Sign In / Providers | Turn **off** "Allow new users to sign up" so only invited people get in. |
| 4 | Supabase › Authentication › URL Configuration | Site URL: your Vercel address (e.g. `https://ubuntu-stokvel.vercel.app`). Add `http://localhost:3000/**` to Redirect URLs for testing. |
| 5 | Supabase › Authentication › Emails | Edit two templates so links come to the site (see below). |
| 6 | Supabase › Authentication › Users | **Invite user** for each of the 6 members. |
| 7 | Supabase › SQL Editor | Open `supabase/migrations/002_first_leader.sql`, put in the leader's email and phone, run it. The leader then gives the Treasurer *Admin* access on the **Members & roles** page. |
| 8 | Your computer | `cp .env.example .env.local`, fill in the two values from Supabase › Project Settings › API, then `npm install` and `npm run dev`. |
| 9 | vercel.com | Import the repo, add the same two environment variables, deploy. |
| 10 | The site | Log in as an admin › **Cycle & goal** › start Cycle 1 (first month, 6 months, R250). Then record the payments already made. |

### Email templates (step 5)

**Invite user** template, replace the link with:
```
<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=invite">Accept the invite and set your password</a>
```
**Reset password** template:
```
<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery">Set a new password</a>
```

## Who can do what

| | Member | Admin (e.g. Treasurer) | Leader |
|---|---|---|---|
| See group total, wave bar, who has paid, contribution grid | ✓ | ✓ | ✓ |
| See own payments and own proof of payment | ✓ | ✓ | ✓ |
| See other members' proof of payment | | ✓ | ✓ |
| Record a payment and upload proof | | ✓ | ✓ |
| Remove a wrong payment, adjust the goal, run cycles | | ✓ | ✓ |
| Give or remove roles, edit names, titles and phone numbers, deactivate a member | | | ✓ |

Phone numbers are visible to all logged-in members, like a group contact list.
The leader can't remove their own leader role. To hand over, they make someone else leader first.

These rules are enforced by the database (row-level security), not only by hiding buttons.

## After the 6 months

1. Meet and agree on what the money is for and the new contribution.
2. Admin › **Cycle & goal** › *Start the next cycle*: set the new monthly amount (e.g. R350).
3. The old cycle closes, the new goal is calculated (members × amount × months) and any
   advance credit moves across automatically. Old cycles stay viewable under *All cycles*.

## Privacy

Don't store ID numbers or bank account numbers here. Keep those on the signed paper forms with the
Secretary. Proof-of-payment files are private; links to them expire after an hour.

## Files

| Path | What it is |
|---|---|
| `supabase/migrations/001_init.sql` | Tables, security rules, proof storage, the start-next-cycle function |
| `lib/allocation.ts` | How payments turn into months covered |
| `components/WaveBar.tsx` | The animated wave progress bar |
| `components/RecordPaymentForm.tsx` | Upload proof + record payment, with a preview of the months it covers |
| `app/(portal)/page.tsx` | Overview: goal, who has paid, your standing, contribution grid |
| `app/(portal)/payments/page.tsx` | Record payments, payment history |
| `app/(portal)/cycle/page.tsx` | Edit the cycle, start the next one |
| `app/(portal)/members/page.tsx` | Leader-only page: roles, titles, phone numbers |
| `supabase/migrations/002_first_leader.sql` | Makes the first leader (fill in email and phone) |

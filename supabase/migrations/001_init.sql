-- Ubuntu Stokvel portal: schema, row-level security and proof-of-payment storage.
-- Run once in Supabase: SQL Editor > New query > paste > Run.

-- ---------- Members ----------
-- leader: assigns roles and manages members (and can do everything an admin can)
-- admin:  records payments, adjusts the goal, runs cycles (e.g. the Treasurer)
-- member: views the group progress and their own payments
create type public.member_role as enum ('leader', 'admin', 'member');

create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text not null,
  full_name   text not null default '',
  title       text not null default 'Member',      -- Chairperson, Treasurer, Secretary, Member
  role        public.member_role not null default 'member',
  phone       text,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

-- Every invited user gets a profile automatically.
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)));
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'leader') and active);
$$;

create function public.is_leader() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'leader' and active);
$$;

create function public.is_member() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and active);
$$;

-- ---------- Cycles (e.g. 6 months at R250) ----------
create table public.cycles (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  start_month     date not null check (extract(day from start_month) = 1),
  months          int  not null check (months between 1 and 36),
  monthly_amount  numeric(10,2) not null check (monthly_amount > 0),
  goal_amount     numeric(12,2) not null check (goal_amount > 0),
  purpose         text not null default '',
  status          text not null default 'active' check (status in ('active', 'closed')),
  created_at      timestamptz not null default now()
);
create unique index one_active_cycle on public.cycles ((status)) where status = 'active';

-- ---------- Payments ----------
-- One row per deposit. A member's payments in a cycle are added up and fill months
-- in order, so R750 at R250/month covers months 1-3. See lib/allocation.ts.
create table public.payments (
  id            uuid primary key default gen_random_uuid(),
  cycle_id      uuid not null references public.cycles (id) on delete restrict,
  member_id     uuid not null references public.profiles (id) on delete restrict,
  amount        numeric(10,2) not null check (amount > 0),
  paid_on       date not null,
  reference     text not null default '',
  pop_path      text,                      -- null only for credit carried over from a previous cycle
  note          text not null default '',
  recorded_by   uuid references public.profiles (id),
  created_at    timestamptz not null default now()
);
create index payments_cycle_member on public.payments (cycle_id, member_id, paid_on);

-- ---------- Row-level security ----------
alter table public.profiles enable row level security;
alter table public.cycles   enable row level security;
alter table public.payments enable row level security;

create policy "members see members"   on public.profiles for select using (public.is_member());
create policy "leader manages members" on public.profiles for update using (public.is_leader()) with check (public.is_leader());

create policy "members see cycles"    on public.cycles for select using (public.is_member());
create policy "admins add cycles"     on public.cycles for insert with check (public.is_admin());
create policy "admins edit cycles"    on public.cycles for update using (public.is_admin());

-- Everyone can see amounts (needed for the group progress and the who-paid list).
-- The proof-of-payment files themselves are protected separately in storage below.
create policy "members see payments"  on public.payments for select using (public.is_member());
create policy "admins add payments"   on public.payments for insert with check (public.is_admin());
create policy "admins edit payments"  on public.payments for update using (public.is_admin());
create policy "admins delete payments" on public.payments for delete using (public.is_admin());

-- Members may update only their own phone number.
create function public.update_my_phone(p_phone text) returns void
language sql security definer set search_path = public as $$
  update public.profiles set phone = p_phone where id = auth.uid();
$$;

-- ---------- Proof-of-payment storage ----------
-- Files are stored as  <member_id>/<cycle_id>/<random>-<filename>
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('proofs', 'proofs', false, 5242880, array['image/jpeg','image/png','image/webp','image/heic','application/pdf']);

create policy "admins upload proofs" on storage.objects for insert
  with check (bucket_id = 'proofs' and public.is_admin());
create policy "admins delete proofs" on storage.objects for delete
  using (bucket_id = 'proofs' and public.is_admin());
create policy "admins and owner read proofs" on storage.objects for select
  using (bucket_id = 'proofs' and (public.is_admin() or (storage.foldername(name))[1] = auth.uid()::text));

-- ---------- Close the current cycle and start the next one ----------
-- Any money paid beyond the end of the old cycle moves across as credit.
create function public.start_next_cycle(
  p_name text, p_start_month date, p_months int, p_monthly_amount numeric, p_goal_amount numeric
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  old public.cycles;
  new_id uuid;
begin
  if not public.is_admin() then raise exception 'Only admins can start a cycle'; end if;

  select * into old from public.cycles where status = 'active' for update;
  if found then
    update public.cycles set status = 'closed' where id = old.id;
  end if;

  insert into public.cycles (name, start_month, months, monthly_amount, goal_amount)
  values (p_name, date_trunc('month', p_start_month)::date, p_months, p_monthly_amount, p_goal_amount)
  returning id into new_id;

  if old.id is not null then
    insert into public.payments (cycle_id, member_id, amount, paid_on, note, recorded_by)
    select new_id, member_id, total - old.months * old.monthly_amount, date_trunc('month', p_start_month)::date,
           'Credit carried over from ' || old.name, auth.uid()
    from (select member_id, sum(amount) as total from public.payments where cycle_id = old.id group by member_id) t
    where total > old.months * old.monthly_amount;
  end if;

  return new_id;
end $$;

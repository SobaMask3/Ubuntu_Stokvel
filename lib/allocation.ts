// How payments turn into months covered.
// A member's payments in a cycle are added up and fill months in order.
// Example: R750 at R250/month covers months 1, 2 and 3. Money beyond the
// last month of the cycle is credit that moves to the next cycle.

export type Cycle = {
  id: string;
  name: string;
  start_month: string; // YYYY-MM-01
  months: number;
  monthly_amount: number;
  goal_amount: number;
  purpose: string;
  status: 'active' | 'closed';
};

export type Payment = {
  id: string;
  cycle_id: string;
  member_id: string;
  amount: number;
  paid_on: string; // YYYY-MM-DD
  created_at?: string;
};

export type CellKind = 'paid' | 'ahead' | 'partial' | 'due' | 'overdue' | 'upcoming';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export function addMonths(key: string, n: number): string {
  const [y, m] = key.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + n, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

/** Month keys (YYYY-MM) for every month in the cycle. */
export function monthsOf(c: Pick<Cycle, 'start_month' | 'months'>): string[] {
  const first = c.start_month.slice(0, 7);
  return Array.from({ length: c.months }, (_, i) => addMonths(first, i));
}

export function monthLabel(key: string, long = false): string {
  const [y, m] = key.split('-').map(Number);
  return `${(long ? LONG : MONTHS)[m - 1]} ${y}`;
}
export function shortMonth(key: string): string {
  const [y, m] = key.split('-').map(Number);
  return `${MONTHS[m - 1]} ’${String(y).slice(2)}`;
}

/** Current month in South Africa, as YYYY-MM. */
export function currentMonthKey(now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Johannesburg', year: 'numeric', month: '2-digit' }).formatToParts(now);
  const y = parts.find((p) => p.type === 'year')!.value;
  const m = parts.find((p) => p.type === 'month')!.value;
  return `${y}-${m}`;
}
export function todayISO(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Johannesburg' }).format(now);
}

export const rand = (n: number) => 'R' + Math.round(n).toLocaleString('en-US');

export type Standing = { total: number; full: number; remainder: number; credit: number };

/** Totals for one member. Pass `before` (YYYY-MM-DD) to count only payments made before that date. */
export function standing(c: Cycle, payments: Payment[], memberId: string, before?: string): Standing {
  const total = payments
    .filter((p) => p.cycle_id === c.id && p.member_id === memberId && (!before || p.paid_on < before))
    .reduce((a, p) => a + Number(p.amount), 0);
  const full = Math.floor(round2(total / c.monthly_amount));
  const capped = Math.min(full, c.months);
  return {
    total,
    full: capped,
    remainder: full >= c.months ? 0 : round2(total - full * c.monthly_amount),
    credit: Math.max(0, round2(total - c.months * c.monthly_amount)),
  };
}

/** Status of one member for month index i. */
export function cellStatus(c: Cycle, payments: Payment[], memberId: string, i: number, nowKey: string): { kind: CellKind; remainder?: number } {
  const key = monthsOf(c)[i];
  const st = standing(c, payments, memberId);
  if (i < st.full) {
    const before = standing(c, payments, memberId, `${key}-01`);
    return { kind: before.full > i ? 'ahead' : 'paid' };
  }
  if (i === st.full && st.remainder > 0) return { kind: 'partial', remainder: st.remainder };
  if (key < nowKey) return { kind: 'overdue' };
  if (key === nowKey) return { kind: 'due' };
  return { kind: 'upcoming' };
}

export type Slice = { month: string; amount: number; complete: boolean } | { month: null; amount: number; complete: true };

/** Which months a new amount fills, given what the member already paid this cycle. month=null means credit. */
export function allocate(c: Cycle, alreadyPaid: number, amount: number): Slice[] {
  const months = monthsOf(c);
  const out: Slice[] = [];
  let from = alreadyPaid;
  let left = amount;
  for (let i = 0; i < c.months && left > 0.004; i++) {
    const end = (i + 1) * c.monthly_amount;
    if (from >= end) continue;
    const take = Math.min(end - from, left);
    out.push({ month: months[i], amount: round2(take), complete: from + take >= end - 0.004 });
    left = round2(left - take);
    from += take;
  }
  if (left > 0.004) out.push({ month: null, amount: left, complete: true });
  return out;
}

/** Order payments the way they were made, so "which months did this payment cover" is stable. */
export function chronological(payments: Payment[]): Payment[] {
  return [...payments].sort((a, b) => a.paid_on.localeCompare(b.paid_on) || (a.created_at ?? '').localeCompare(b.created_at ?? '') || a.id.localeCompare(b.id));
}

/** For each payment, the months it covered. */
export function coverageByPayment(c: Cycle, payments: Payment[]): Map<string, Slice[]> {
  const running = new Map<string, number>();
  const result = new Map<string, Slice[]>();
  for (const p of chronological(payments.filter((p) => p.cycle_id === c.id))) {
    const prior = running.get(p.member_id) ?? 0;
    result.set(p.id, allocate(c, prior, Number(p.amount)));
    running.set(p.member_id, prior + Number(p.amount));
  }
  return result;
}

/** Index of the current month inside the cycle, clamped to the cycle. */
export function nowIndex(c: Cycle, nowKey: string): number {
  const months = monthsOf(c);
  const i = months.indexOf(nowKey);
  if (i >= 0) return i;
  return nowKey < months[0] ? 0 : months.length - 1;
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

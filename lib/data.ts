import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import type { Cycle, Payment } from '@/lib/allocation';

export type Profile = { id: string; email: string; full_name: string; title: string; role: 'leader' | 'admin' | 'member'; phone: string | null; active: boolean };
export type PaymentRow = Payment & { reference: string; pop_path: string | null; note: string; recorded_by: string | null; created_at: string };

const num = <T extends Record<string, unknown>>(row: T, keys: (keyof T)[]) => {
  const out = { ...row };
  keys.forEach((k) => ((out as Record<string, unknown>)[k as string] = Number(row[k])));
  return out;
};

/** Loads the signed-in member, all active members and every cycle. Redirects to login if needed. */
export async function loadSession() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const [{ data: me }, { data: members }, { data: cycles }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('profiles').select('*').eq('active', true).order('full_name'),
    supabase.from('cycles').select('*').order('start_month', { ascending: false }),
  ]);
  if (!me || !me.active) redirect('/login?inactive=1');

  return {
    supabase,
    me: me as Profile,
    isAdmin: me.role === 'admin' || me.role === 'leader',
    isLeader: me.role === 'leader',
    members: (members ?? []) as Profile[],
    cycles: (cycles ?? []).map((c) => num(c, ['monthly_amount', 'goal_amount', 'months'])) as Cycle[],
  };
}

export async function loadPayments(cycleId: string): Promise<PaymentRow[]> {
  const supabase = createClient();
  const { data } = await supabase.from('payments').select('*').eq('cycle_id', cycleId).order('paid_on', { ascending: false }).order('created_at', { ascending: false });
  return (data ?? []).map((p) => num(p, ['amount'])) as PaymentRow[];
}

/** Picks the cycle from ?cycle=..., otherwise the active one, otherwise the newest. */
export function pickCycle(cycles: Cycle[], id?: string): Cycle | undefined {
  return cycles.find((c) => c.id === id) ?? cycles.find((c) => c.status === 'active') ?? cycles[0];
}

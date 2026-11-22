'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

type Result = { error?: string; ok?: string };

async function requireRole(allowed: string[], message: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase, error: 'Your session has expired. Log in again.' };
  const { data } = await supabase.from('profiles').select('role, active').eq('id', user.id).single();
  if (!data || !allowed.includes(data.role) || !data.active) return { supabase, error: message };
  return { supabase, userId: user.id };
}
const requireAdmin = () => requireRole(['admin', 'leader'], 'Only admins can do this.');
const requireLeader = () => requireRole(['leader'], 'Only the leader can change roles and member details.');

const done = (ok: string): Result => {
  revalidatePath('/', 'layout');
  return { ok };
};

export async function savePayment(input: { memberId: string; cycleId: string; amount: number; paidOn: string; reference: string; popPath: string }): Promise<Result> {
  const { supabase, error, userId } = await requireAdmin();
  if (error) return { error };
  if (!(input.amount > 0)) return { error: 'Enter the amount that was paid.' };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.paidOn)) return { error: 'Choose the date the money was paid.' };
  if (!input.popPath) return { error: 'Upload the proof of payment before saving.' };

  const { error: dbError } = await supabase.from('payments').insert({
    cycle_id: input.cycleId,
    member_id: input.memberId,
    amount: input.amount,
    paid_on: input.paidOn,
    reference: input.reference.slice(0, 80),
    pop_path: input.popPath,
    recorded_by: userId,
  });
  if (dbError) {
    await supabase.storage.from('proofs').remove([input.popPath]);
    return { error: 'The payment was not saved: ' + dbError.message };
  }
  return done('Payment recorded');
}

export async function deletePayment(id: string): Promise<Result> {
  const { supabase, error } = await requireAdmin();
  if (error) return { error };
  const { data: row } = await supabase.from('payments').select('pop_path').eq('id', id).single();
  const { error: dbError } = await supabase.from('payments').delete().eq('id', id);
  if (dbError) return { error: dbError.message };
  if (row?.pop_path) await supabase.storage.from('proofs').remove([row.pop_path]);
  return done('Payment removed');
}

export async function updateGoal(cycleId: string, goal: number): Promise<Result> {
  const { supabase, error } = await requireAdmin();
  if (error) return { error };
  if (!(goal > 0)) return { error: 'The goal must be more than R0.' };
  const { error: dbError } = await supabase.from('cycles').update({ goal_amount: goal }).eq('id', cycleId);
  if (dbError) return { error: dbError.message };
  return done('Goal updated');
}

export async function updateCycle(_: Result, form: FormData): Promise<Result> {
  const { supabase, error } = await requireAdmin();
  if (error) return { error };
  const months = Number(form.get('months'));
  const amount = Number(form.get('monthly_amount'));
  const start = String(form.get('start_month') ?? '');
  if (!(months >= 1 && months <= 36)) return { error: 'Number of months must be between 1 and 36.' };
  if (!(amount > 0)) return { error: 'Monthly contribution must be more than R0.' };
  if (!/^\d{4}-\d{2}$/.test(start)) return { error: 'Choose the first month of the cycle.' };
  const { error: dbError } = await supabase
    .from('cycles')
    .update({
      name: String(form.get('name') || 'Cycle'),
      start_month: `${start}-01`,
      months,
      monthly_amount: amount,
      purpose: String(form.get('purpose') ?? '').slice(0, 200),
    })
    .eq('id', String(form.get('id')));
  if (dbError) return { error: dbError.message };
  return done('Cycle saved');
}

export async function startNextCycle(_: Result, form: FormData): Promise<Result> {
  const { supabase, error } = await requireAdmin();
  if (error) return { error };
  const months = Number(form.get('months'));
  const amount = Number(form.get('monthly_amount'));
  const start = String(form.get('start_month') ?? '');
  if (!(months >= 1 && months <= 36) || !(amount > 0) || !/^\d{4}-\d{2}$/.test(start)) return { error: 'Fill in the start month, number of months and contribution.' };
  const { count } = await supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('active', true);
  const { error: dbError } = await supabase.rpc('start_next_cycle', {
    p_name: String(form.get('name') || 'New cycle'),
    p_start_month: `${start}-01`,
    p_months: months,
    p_monthly_amount: amount,
    p_goal_amount: amount * months * (count ?? 1),
  });
  if (dbError) return { error: dbError.message };
  revalidatePath('/', 'layout');
  redirect('/');
}

export async function updateMember(_: Result, form: FormData): Promise<Result> {
  const { supabase, error, userId } = await requireLeader();
  if (error) return { error };
  const id = String(form.get('id'));
  const r = String(form.get('role'));
  const role = r === 'leader' || r === 'admin' ? r : 'member';
  const active = form.get('active') === 'on';
  if (id === userId && (role !== 'leader' || !active)) return { error: 'Make someone else the leader first, then they can change your access.' };
  const phone = String(form.get('phone') ?? '').replace(/[^\d+ ]/g, '').trim().slice(0, 20);
  const { error: dbError } = await supabase
    .from('profiles')
    .update({ full_name: String(form.get('full_name') ?? '').slice(0, 80), title: String(form.get('title') ?? 'Member').slice(0, 40), phone: phone || null, role, active })
    .eq('id', id);
  if (dbError) return { error: dbError.message };
  return done('Member saved');
}

export async function signOut() {
  const supabase = createClient();
  await supabase.auth.signOut();
  redirect('/login');
}

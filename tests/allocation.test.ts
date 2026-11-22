import { test } from 'node:test';
import assert from 'node:assert/strict';
import { allocate, cellStatus, coverageByPayment, standing, monthsOf, type Cycle, type Payment } from '../lib/allocation';

const c: Cycle = { id: 'c1', name: 'Cycle 1', start_month: '2026-10-01', months: 6, monthly_amount: 250, goal_amount: 9000, purpose: '', status: 'active' };
const p = (id: string, member: string, amount: number, paid_on: string): Payment => ({ id, cycle_id: 'c1', member_id: member, amount, paid_on });

test('cycle months', () => {
  assert.deepEqual(monthsOf(c), ['2026-10', '2026-11', '2026-12', '2027-01', '2027-02', '2027-03']);
});

test('R750 in the first month covers three months, two of them in advance', () => {
  const pays = [p('a', 'sibo', 750, '2026-10-01')];
  assert.equal(standing(c, pays, 'sibo').full, 3);
  assert.equal(cellStatus(c, pays, 'sibo', 0, '2026-11').kind, 'paid');
  assert.equal(cellStatus(c, pays, 'sibo', 1, '2026-11').kind, 'ahead');
  assert.equal(cellStatus(c, pays, 'sibo', 2, '2026-11').kind, 'ahead');
  assert.equal(cellStatus(c, pays, 'sibo', 3, '2026-11').kind, 'upcoming');
});

test('part payment and overdue', () => {
  const pays = [p('a', 'x', 250, '2026-10-02'), p('b', 'x', 150, '2026-11-02')];
  assert.deepEqual(cellStatus(c, pays, 'x', 1, '2026-11'), { kind: 'partial', remainder: 150 });
  assert.equal(cellStatus(c, [], 'y', 0, '2026-11').kind, 'overdue');
  assert.equal(cellStatus(c, [], 'y', 1, '2026-11').kind, 'due');
});

test('late payment fills the oldest month first', () => {
  const pays = [p('a', 'x', 500, '2026-11-20')];
  assert.equal(cellStatus(c, pays, 'x', 0, '2026-11').kind, 'paid');
  assert.equal(cellStatus(c, pays, 'x', 1, '2026-11').kind, 'paid');
});

test('allocation of a new payment after an advance', () => {
  const slices = allocate(c, 750, 500);
  assert.deepEqual(slices.map((s) => s.month), ['2027-01', '2027-02']);
  const odd = allocate(c, 100, 300);
  assert.deepEqual(odd, [
    { month: '2026-10', amount: 150, complete: true },
    { month: '2026-11', amount: 150, complete: false },
  ]);
});

test('money beyond the cycle becomes credit', () => {
  const pays = [p('a', 'x', 1600, '2026-10-01')];
  const st = standing(c, pays, 'x');
  assert.equal(st.full, 6);
  assert.equal(st.credit, 100);
  assert.deepEqual(allocate(c, 0, 1600).at(-1), { month: null, amount: 100, complete: true });
});

test('coverage per payment follows the order payments were made', () => {
  const pays = [p('b', 'x', 250, '2026-11-01'), p('a', 'x', 750, '2026-10-01')];
  const cov = coverageByPayment(c, pays);
  assert.deepEqual(cov.get('a')!.map((s) => s.month), ['2026-10', '2026-11', '2026-12']);
  assert.deepEqual(cov.get('b')!.map((s) => s.month), ['2027-01']);
});

import Link from 'next/link';
import { redirect } from 'next/navigation';
import { CurrentCycleForm, NextCycleForm } from '@/components/CycleForms';
import { loadPayments, loadSession } from '@/lib/data';
import { addMonths, currentMonthKey, monthLabel, monthsOf, rand, standing } from '@/lib/allocation';

export default async function CyclePage() {
  const { isAdmin, members, cycles } = await loadSession();
  if (!isAdmin) redirect('/');
  const current = cycles.find((c) => c.status === 'active');
  const totals = await Promise.all(cycles.map(async (c) => ({ c, pays: await loadPayments(c.id) })));
  const curPays = totals.find((t) => t.c.id === current?.id)?.pays ?? [];
  const carry = current ? members.reduce((a, m) => a + standing(current, curPays, m.id).credit, 0) : 0;

  return (
    <div className="stack">
      {current && (
        <section className="panel" aria-labelledby="cur-h">
          <div className="panel-head"><h2 id="cur-h">Current cycle</h2><span className="pill good">Active</span></div>
          <CurrentCycleForm cycle={current} />
        </section>
      )}

      <section className="panel" aria-labelledby="next-h">
        <div className="panel-head">
          <h2 id="next-h">{current ? 'Start the next cycle' : 'Start the first cycle'}</h2>
          <span className="muted" style={{ fontSize: '.85rem' }}>{current ? 'Use this after the group agrees on new contributions' : 'Set the monthly contribution and how long the cycle runs'}</span>
        </div>
        <NextCycleForm
          current={current}
          memberCount={members.length}
          carryCredit={carry}
          defaultName={`Cycle ${cycles.length + 1}`}
          defaultStart={current ? addMonths(current.start_month.slice(0, 7), current.months) : currentMonthKey()}
        />
      </section>

      {cycles.length > 0 && (
        <section className="panel" aria-labelledby="hist-h">
          <div className="panel-head"><h2 id="hist-h">All cycles</h2></div>
          <div className="scroll">
            <table>
              <thead><tr><th>Cycle</th><th>Months</th><th>Monthly</th><th>Goal</th><th>Collected</th><th>Status</th><th /></tr></thead>
              <tbody>
                {totals.map(({ c, pays }) => {
                  const ms = monthsOf(c);
                  return (
                    <tr key={c.id}>
                      <td>{c.name}</td>
                      <td>{monthLabel(ms[0])} to {monthLabel(ms.at(-1)!)}</td>
                      <td className="num">{rand(c.monthly_amount)}</td>
                      <td className="num">{rand(c.goal_amount)}</td>
                      <td className="num">{rand(pays.reduce((a, p) => a + p.amount, 0))}</td>
                      <td>{c.status === 'active' ? <span className="pill good">Active</span> : <span className="pill idle">Closed</span>}</td>
                      <td><Link className="btn small" href={`/?cycle=${c.id}`}>Open</Link></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}

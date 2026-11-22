import Link from 'next/link';
import { WaveBar } from '@/components/WaveBar';
import { GoalEditor } from '@/components/GoalEditor';
import { loadPayments, loadSession, pickCycle } from '@/lib/data';
import { cellStatus, currentMonthKey, monthLabel, monthsOf, nowIndex, rand, shortMonth, standing, type CellKind } from '@/lib/allocation';

const PILL: Record<CellKind, (r?: number, amt?: number) => JSX.Element> = {
  paid: () => <span className="pill good">Paid</span>,
  ahead: () => <span className="pill ahead">Paid in advance</span>,
  partial: (r, amt) => <span className="pill warn">{rand(r!)} of {rand(amt!)}</span>,
  due: () => <span className="pill warn">Not paid yet</span>,
  overdue: () => <span className="pill bad">Overdue</span>,
  upcoming: () => <span className="pill idle">Not due yet</span>,
};
const CELL_TEXT: Record<CellKind, string> = { paid: 'Paid', ahead: 'Advance', partial: '', due: 'Due', overdue: 'Overdue', upcoming: '—' };
const ORDER: Record<CellKind, number> = { ahead: 0, paid: 0, partial: 1, due: 2, overdue: 2, upcoming: 3 };

export default async function Overview({ searchParams }: { searchParams: { cycle?: string; m?: string } }) {
  const { me, isAdmin, members, cycles } = await loadSession();
  const c = pickCycle(cycles, searchParams.cycle);

  if (!c) {
    return (
      <section className="panel">
        <h2>No cycle yet</h2>
        <p className="muted">{isAdmin ? <>Set up the first cycle under <Link href="/cycle">Cycle &amp; goal</Link>.</> : 'The Treasurer has not set up the first cycle yet.'}</p>
      </section>
    );
  }

  const payments = await loadPayments(c.id);
  const now = currentMonthKey();
  const months = monthsOf(c);
  const ni = nowIndex(c, now);
  const active = c.status === 'active';
  const monthIdx = Math.max(0, Math.min(months.length - 1, searchParams.m !== undefined ? Number(searchParams.m) || 0 : ni));
  const n = members.length;
  const saved = payments.reduce((a, p) => a + p.amount, 0);
  const expected = Math.min(c.goal_amount, (ni + 1) * c.monthly_amount * n);
  const diff = saved - expected;
  const credit = members.reduce((a, m) => a + standing(c, payments, m.id).credit, 0);
  const qs = (m: number) => `/?${new URLSearchParams({ ...(searchParams.cycle ? { cycle: searchParams.cycle } : {}), m: String(m) })}`;

  const rows = members
    .map((m) => ({ m, s: cellStatus(c, payments, m.id, monthIdx, now), st: standing(c, payments, m.id) }))
    .sort((a, b) => ORDER[a.s.kind] - ORDER[b.s.kind]);
  const paidN = rows.filter((r) => r.s.kind === 'paid' || r.s.kind === 'ahead').length;

  const mine = standing(c, payments, me.id);
  const owing = Math.max(0, (ni + 1) * c.monthly_amount - mine.total);

  return (
    <div className="stack">
      <section className="panel" aria-labelledby="goal-h">
        <div className="goal-top">
          <div>
            <div className="eyebrow">{c.name} · {monthLabel(months[0])} to {monthLabel(months.at(-1)!)} · {rand(c.monthly_amount)} each per month · {n} members</div>
            <h2 id="goal-h" style={{ margin: '6px 0 10px' }}>Saved so far</h2>
            <div className="big num">{rand(saved)} <small>of {rand(c.goal_amount)} goal</small></div>
          </div>
          <div className="row-actions">
            {!active ? <span className="pill idle">Closed cycle</span>
              : diff >= 0 ? <span className="pill good">On track{diff > 0 ? ` · ${rand(diff)} ahead` : ''}</span>
              : <span className="pill warn">{rand(-diff)} behind schedule</span>}
          </div>
        </div>
        <WaveBar value={saved} goal={c.goal_amount} />
        <div className="ticks" aria-hidden="true">
          {months.map((m, i) => {
            const v = (i + 1) * c.monthly_amount * n;
            if (v > c.goal_amount * 1.001) return null;
            return <span key={m} className={`tick ${i === ni && active ? 'now' : ''}`} style={{ left: `${Math.min(97, (v / c.goal_amount) * 100)}%` }}>{shortMonth(m)}</span>;
          })}
        </div>
        <div className="goal-meta">
          <span>Expected by end of {monthLabel(months[ni])}: <b className="num">{rand(expected)}</b></span>
          <span>Still to collect: <b className="num">{rand(Math.max(0, c.goal_amount - saved))}</b></span>
          <span>Money for: <b>{c.purpose || 'To be decided at the end-of-cycle meeting'}</b></span>
          {credit > 0 && <span>Credit for next cycle: <b className="num">{rand(credit)}</b></span>}
        </div>
        {isAdmin && active && (
          <div style={{ marginTop: 14 }}>
            <GoalEditor cycleId={c.id} goal={c.goal_amount} suggested={c.monthly_amount * c.months * n} breakdown={`${n} × ${rand(c.monthly_amount)} × ${c.months}`} />
          </div>
        )}
      </section>

      <div className="two">
        <section className="panel" aria-labelledby="month-h">
          <div className="panel-head">
            <h2 id="month-h">Who has paid</h2>
            <div className="month-nav">
              <Link href={qs(monthIdx - 1)} aria-label="Previous month" aria-disabled={monthIdx === 0} scroll={false}>‹</Link>
              <strong>{monthLabel(months[monthIdx], true)}</strong>
              <Link href={qs(monthIdx + 1)} aria-label="Next month" aria-disabled={monthIdx === months.length - 1} scroll={false}>›</Link>
            </div>
          </div>
          <div className="count-row">
            <span><b className="num">{paidN}</b> of {n} paid</span>
            <span className="muted">{rand(paidN * c.monthly_amount)} of {rand(n * c.monthly_amount)} for the month</span>
          </div>
          <ul className="who">
            {rows.map(({ m, s, st }) => (
              <li key={m.id}>
                <span className="av">{m.full_name.slice(0, 2).toUpperCase()}</span>
                <span>{m.full_name}<span className="sub">{m.title} · {st.full ? `Covered to ${monthLabel(months[st.full - 1])}` : 'No months covered yet'}</span></span>
                {PILL[s.kind](s.remainder, c.monthly_amount)}
              </li>
            ))}
          </ul>
        </section>

        <section className="panel me-card" aria-labelledby="me-h">
          <div className="panel-head" style={{ margin: 0 }}><h2 id="me-h">Your standing</h2><span className="muted">{me.full_name}</span></div>
          <div>
            <div className="me-stat"><span>Paid this cycle</span><b className="num">{rand(mine.total)} <span className="muted" style={{ fontWeight: 400 }}>of {rand(c.monthly_amount * c.months)}</span></b></div>
            <div className="me-stat"><span>Months covered</span><b className="num">{mine.full} of {c.months}</b></div>
            <div className="me-stat"><span>Covered up to</span><b>{mine.full ? monthLabel(months[mine.full - 1], true) : '—'}</b></div>
            <div className="me-stat"><span>Next month to pay</span><b>{mine.full < c.months ? monthLabel(months[mine.full], true) : 'Nothing, the whole cycle is paid'}</b></div>
            <div className="me-stat"><span>Owed right now</span>{owing && active ? <span className="pill warn">{rand(owing)}</span> : <span className="pill good">Nothing</span>}</div>
          </div>
        </section>
      </div>

      <section className="panel" aria-labelledby="grid-h">
        <div className="panel-head"><h2 id="grid-h">Contributions by month</h2><span className="muted" style={{ fontSize: '.85rem' }}>Payments fill months in order. Extra money covers the next months.</span></div>
        <div className="scroll">
          <table className="grid">
            <thead><tr><th>Member</th>{months.map((m, i) => <th key={m} className={`mcol ${i === ni && active ? 'now' : ''}`}>{shortMonth(m)}</th>)}<th>Total</th></tr></thead>
            <tbody>
              {members.map((m) => {
                const st = standing(c, payments, m.id);
                return (
                  <tr key={m.id}>
                    <td>{m.full_name}</td>
                    {months.map((k, i) => {
                      const s = cellStatus(c, payments, m.id, i, now);
                      return <td key={k} className="cell"><span className={`dot ${s.kind}`}>{s.kind === 'partial' ? `${rand(s.remainder!)} of ${rand(c.monthly_amount)}` : CELL_TEXT[s.kind]}</span></td>;
                    })}
                    <td className="num">{rand(st.total)}{st.credit > 0 && <> <span className="pill ahead">+{rand(st.credit)} credit</span></>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="legend">
          <span><i style={{ background: 'var(--good-bg)', border: '1px solid var(--good)' }} />Paid</span>
          <span><i style={{ background: 'var(--ahead-bg)', border: '1px solid var(--ahead)' }} />Paid in advance</span>
          <span><i style={{ background: 'var(--warn-bg)', border: '1px solid var(--warn)' }} />Part paid / due now</span>
          <span><i style={{ background: 'var(--bad-bg)', border: '1px solid var(--bad)' }} />Overdue</span>
          <span><i style={{ border: '1px dashed var(--line)' }} />Not due yet</span>
        </div>
      </section>
    </div>
  );
}

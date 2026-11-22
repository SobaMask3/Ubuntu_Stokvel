import Link from 'next/link';
import { RecordPaymentForm } from '@/components/RecordPaymentForm';
import { DeletePayment } from '@/components/DeletePayment';
import { loadPayments, loadSession, pickCycle } from '@/lib/data';
import { coverageByPayment, rand, shortMonth } from '@/lib/allocation';

export default async function PaymentsPage({ searchParams }: { searchParams: { cycle?: string; member?: string } }) {
  const { supabase, me, isAdmin, members, cycles } = await loadSession();
  const c = pickCycle(cycles, searchParams.cycle);
  if (!c) return <section className="panel"><h2>No cycle yet</h2></section>;

  const all = await loadPayments(c.id);
  const coverage = coverageByPayment(c, all);
  const filter = isAdmin ? searchParams.member : me.id;
  const list = filter ? all.filter((p) => p.member_id === filter) : all;
  const nameOf = (id: string | null) => members.find((m) => m.id === id)?.full_name ?? '—';

  // Signed links to the proof files. Storage rules only allow admins, or the member who paid.
  const paths = list.map((p) => p.pop_path).filter(Boolean) as string[];
  const { data: signed } = paths.length ? await supabase.storage.from('proofs').createSignedUrls(paths, 60 * 60) : { data: [] };
  const urlFor = new Map<string, string>();
  (signed ?? []).forEach((s) => { if (s.path && s.signedUrl) urlFor.set(s.path, s.signedUrl); });

  const paidSoFar: Record<string, number> = {};
  all.forEach((p) => (paidSoFar[p.member_id] = (paidSoFar[p.member_id] ?? 0) + p.amount));

  return (
    <div className="stack">
      {isAdmin && c.status === 'active' && (
        <section className="panel" aria-labelledby="rec-h">
          <div className="panel-head"><h2 id="rec-h">Record a payment</h2><span className="muted" style={{ fontSize: '.85rem' }}>Upload the proof of payment from the bank or EFT slip</span></div>
          <RecordPaymentForm cycle={c} members={members.map((m) => ({ id: m.id, full_name: m.full_name }))} paidSoFar={paidSoFar} />
        </section>
      )}

      <section className="panel" aria-labelledby="log-h">
        <div className="panel-head">
          <h2 id="log-h">{isAdmin ? 'Payment history' : 'Your payments'} · {c.name}</h2>
          {isAdmin && (
            <div className="row-actions" style={{ fontSize: '.85rem' }}>
              <Link href={`/payments?cycle=${c.id}`} aria-current={!filter ? 'page' : undefined}>All</Link>
              {members.map((m) => <Link key={m.id} href={`/payments?cycle=${c.id}&member=${m.id}`} style={{ fontWeight: filter === m.id ? 600 : 400 }}>{m.full_name}</Link>)}
            </div>
          )}
        </div>
        <div className="scroll">
          <table>
            <thead><tr><th>Date paid</th><th>Member</th><th>Amount</th><th>Months it covers</th><th>Proof</th><th>Recorded by</th>{isAdmin && <th />}</tr></thead>
            <tbody>
              {list.length === 0 && <tr><td colSpan={7} className="empty">No payments recorded yet.</td></tr>}
              {list.map((p) => (
                <tr key={p.id}>
                  <td className="num">{p.paid_on}</td>
                  <td>{nameOf(p.member_id)}</td>
                  <td className="num">{rand(p.amount)}</td>
                  <td>
                    <span style={{ display: 'inline-flex', gap: 4, flexWrap: 'wrap' }}>
                      {(coverage.get(p.id) ?? []).map((s, i) => s.month === null
                        ? <span key={i} className="chip">{rand(s.amount)} credit</span>
                        : <span key={i} className={`chip ${s.complete ? '' : 'part'}`}>{shortMonth(s.month)}{!s.complete && ` · ${rand(s.amount)}`}</span>)}
                    </span>
                  </td>
                  <td>{p.pop_path ? (urlFor.get(p.pop_path) ? <a className="btn small" href={urlFor.get(p.pop_path)} target="_blank" rel="noreferrer">View</a> : <span className="muted">Private</span>) : <span className="muted">{p.note || 'Carried over'}</span>}</td>
                  <td className="muted">{nameOf(p.recorded_by)}</td>
                  {isAdmin && <td><DeletePayment id={p.id} /></td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

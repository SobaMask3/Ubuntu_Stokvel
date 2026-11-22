import { redirect } from 'next/navigation';
import { MemberRow } from '@/components/MemberRow';
import { loadSession, type Profile } from '@/lib/data';

export default async function MembersPage() {
  const { supabase, isLeader } = await loadSession();
  if (!isLeader) redirect('/');
  const { data } = await supabase.from('profiles').select('*').order('full_name');
  const all = (data ?? []) as Profile[];

  return (
    <section className="panel" aria-labelledby="mem-h">
      <div className="panel-head">
        <h2 id="mem-h">Members &amp; roles</h2>
        <span className="muted" style={{ fontSize: '.85rem' }}>Invite new members from Supabase: Authentication › Users › Invite user</span>
      </div>
      <p className="muted" style={{ fontSize: '.88rem', marginTop: 0 }}>
        Leader: assigns roles and edits member details. Admin: records payments and proof of payment, adjusts the goal, runs cycles (give this to the Treasurer). Member: sees the group progress and their own payments. Inactive members cannot log in and are left out of the goal and the who-paid list.
      </p>
      {all.map((m) => <MemberRow key={m.id} m={m} />)}
    </section>
  );
}

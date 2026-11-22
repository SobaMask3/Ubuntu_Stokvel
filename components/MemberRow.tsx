'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { updateMember } from '@/app/actions';
import type { Profile } from '@/lib/data';

function Save() {
  const { pending } = useFormStatus();
  return <button className="btn small" disabled={pending}>{pending ? 'Saving…' : 'Save'}</button>;
}

export function MemberRow({ m }: { m: Profile }) {
  const [state, action] = useFormState(updateMember, {});
  return (
    <form action={action} className="member-row">
      <input type="hidden" name="id" value={m.id} />
      <label className="field">Name<input name="full_name" defaultValue={m.full_name} /><span style={{ fontSize: '.75rem' }}>{m.email}</span></label>
      <label className="field">Title<input name="title" defaultValue={m.title} placeholder="Treasurer" /></label>
      <label className="field">Phone<input name="phone" type="tel" defaultValue={m.phone ?? ''} placeholder="082 123 4567" /></label>
      <label className="field">Access
        <select name="role" defaultValue={m.role}><option value="member">Member</option><option value="admin">Admin</option><option value="leader">Leader</option></select>
      </label>
      <label className="check"><input type="checkbox" name="active" defaultChecked={m.active} /> Active</label>
      <div className="row-actions" style={{ paddingBottom: 6 }}><Save />{state.error && <span className="err">{state.error}</span>}{state.ok && <span className="ok">{state.ok}</span>}</div>
    </form>
  );
}

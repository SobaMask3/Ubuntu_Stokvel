import { Brand } from '@/components/Brand';
import { Tabs } from '@/components/Tabs';
import { loadSession } from '@/lib/data';
import { signOut } from '@/app/actions';

export const dynamic = 'force-dynamic';

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const { me, isAdmin, isLeader } = await loadSession();
  return (
    <div className="page">
      <header className="top">
        <Brand />
        <form action={signOut} className="viewas">
          <span className="muted">{me.full_name} · {me.title}{isLeader ? ' · Leader' : isAdmin ? ' · Admin' : ''}</span>
          <button className="btn small">Log out</button>
        </form>
      </header>
      <Tabs isAdmin={isAdmin} isLeader={isLeader} />
      {children}
    </div>
  );
}

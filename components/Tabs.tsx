'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function Tabs({ isAdmin, isLeader }: { isAdmin: boolean; isLeader: boolean }) {
  const path = usePathname();
  const tabs = [
    { href: '/', label: 'Overview' },
    { href: '/payments', label: 'Payments' },
    ...(isAdmin ? [{ href: '/cycle', label: 'Cycle & goal' }] : []),
    ...(isLeader ? [{ href: '/members', label: 'Members & roles' }] : []),
  ];
  return (
    <nav className="tabs">
      {tabs.map((t) => (
        <Link key={t.href} href={t.href} aria-current={path === t.href ? 'page' : undefined}>{t.label}</Link>
      ))}
    </nav>
  );
}

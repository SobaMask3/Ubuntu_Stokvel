import Link from 'next/link';
export default function NotFound() {
  return <main className="auth"><section className="panel"><h2>Page not found</h2><p><Link href="/">Back to the overview</Link></p></section></main>;
}

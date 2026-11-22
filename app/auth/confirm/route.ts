import { NextResponse, type NextRequest } from 'next/server';
import type { EmailOtpType } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';

// Invite and password-reset emails land here. Invited members are sent on to set a password.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const token_hash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;
  const code = searchParams.get('code');
  const next = type === 'invite' || type === 'recovery' ? '/account/password' : searchParams.get('next') ?? '/';
  const supabase = createClient();

  const { error } = token_hash && type
    ? await supabase.auth.verifyOtp({ type, token_hash })
    : code
      ? await supabase.auth.exchangeCodeForSession(code)
      : { error: new Error('Missing token') };

  if (error) return NextResponse.redirect(`${origin}/login`);
  return NextResponse.redirect(`${origin}${next.startsWith('/') ? next : '/'}`);
}

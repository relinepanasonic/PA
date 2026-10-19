import { NextResponse } from 'next/server';
import { googleClient } from '@/lib/google-calendar';

export async function GET(request: Request) {
  const origin = new URL(request.url).origin;
  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authUrl.searchParams.append('client_id', googleClient().id!);
  authUrl.searchParams.append('redirect_uri', `${origin}/api/google-calendar/callback`);
  authUrl.searchParams.append('response_type', 'code');
  authUrl.searchParams.append('scope', 'https://www.googleapis.com/auth/calendar.events');
  authUrl.searchParams.append('access_type', 'offline');
  authUrl.searchParams.append('prompt', 'consent');
  return NextResponse.redirect(authUrl.toString());
}

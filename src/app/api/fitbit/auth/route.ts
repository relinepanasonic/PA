import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const clientId = process.env.FITBIT_CLIENT_ID;
  const origin = new URL(request.url).origin;
  const redirectUri = `${origin}/api/fitbit/callback`;

  const authUrl = new URL('https://www.fitbit.com/oauth2/authorize');
  authUrl.searchParams.append('client_id', clientId!);
  authUrl.searchParams.append('redirect_uri', redirectUri);
  authUrl.searchParams.append('response_type', 'code');
  authUrl.searchParams.append('scope', 'activity heartrate sleep profile');
  authUrl.searchParams.append('prompt', 'consent');

  return NextResponse.redirect(authUrl.toString());
}

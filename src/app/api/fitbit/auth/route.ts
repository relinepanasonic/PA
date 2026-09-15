import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const clientId = process.env.FITBIT_CLIENT_ID;
  const origin = new URL(request.url).origin;
  const redirectUri = `${origin}/api/fitbit/callback`;
  
  // Google Health Connect / Fitness API scopes
  const scopes = [
    'https://www.googleapis.com/auth/fitness.activity.read',
    'https://www.googleapis.com/auth/fitness.body.read',
    'https://www.googleapis.com/auth/fitness.heart_rate.read',
    'https://www.googleapis.com/auth/fitness.sleep.read'
  ].join(' ');

  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authUrl.searchParams.append('client_id', clientId!);
  authUrl.searchParams.append('redirect_uri', redirectUri);
  authUrl.searchParams.append('response_type', 'code');
  authUrl.searchParams.append('scope', scopes);
  authUrl.searchParams.append('access_type', 'offline');
  authUrl.searchParams.append('prompt', 'consent'); // Force consent to get refresh token

  return NextResponse.redirect(authUrl.toString());
}

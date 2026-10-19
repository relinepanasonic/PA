import { NextResponse } from 'next/server';

// Fitbit Web API shuts down 2026-10-30. This now uses the Google Health API,
// which authenticates through a Google Cloud OAuth client (same env var names).
export async function GET(request: Request) {
  const clientId = process.env.FITBIT_CLIENT_ID;
  const origin = new URL(request.url).origin;
  const redirectUri = `${origin}/api/fitbit/callback`;

  const scopes = [
    'activity_and_fitness',
    'health_metrics_and_measurements',
    'sleep',
  ].map((s) => `https://www.googleapis.com/auth/googlehealth.${s}.readonly`).join(' ');

  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authUrl.searchParams.append('client_id', clientId!);
  authUrl.searchParams.append('redirect_uri', redirectUri);
  authUrl.searchParams.append('response_type', 'code');
  authUrl.searchParams.append('scope', scopes);
  authUrl.searchParams.append('access_type', 'offline');
  authUrl.searchParams.append('prompt', 'consent');

  return NextResponse.redirect(authUrl.toString());
}

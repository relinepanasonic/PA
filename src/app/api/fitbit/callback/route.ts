import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  if (error) {
    return NextResponse.redirect(new URL('/?error=' + error, request.url));
  }

  if (!code) {
    return NextResponse.redirect(new URL('/?error=no_code', request.url));
  }

  const clientId = process.env.FITBIT_CLIENT_ID;
  const clientSecret = process.env.FITBIT_CLIENT_SECRET;
  const redirectUri = 'http://localhost:3000/api/fitbit/callback';

  try {
    // Exchange code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId!,
        client_secret: clientSecret!,
        code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
      }),
    });

    const tokenData = await tokenResponse.json();

    if (tokenData.error) {
      console.error('Token error:', tokenData);
      return NextResponse.redirect(new URL('/?error=token_exchange_failed', request.url));
    }

    // Save tokens in Supabase
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000).toISOString();
      
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          fitbit_access_token: tokenData.access_token,
          fitbit_refresh_token: tokenData.refresh_token,
          fitbit_token_expires_at: expiresAt,
        })
        .eq('id', user.id);

      if (updateError) {
        console.error('Failed to save tokens to profile:', updateError);
      }
    }

    // Redirect back to the dashboard health tab
    return NextResponse.redirect(new URL('/?tab=health&fitbit=connected', request.url));
  } catch (err) {
    console.error('Callback error:', err);
    return NextResponse.redirect(new URL('/?error=server_error', request.url));
  }
}

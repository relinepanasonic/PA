import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { googleClient } from '@/lib/google-calendar';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');
  const back = (q: string) => NextResponse.redirect(new URL('/ai-office?' + q, request.url));
  if (error) return back('gcal_error=' + encodeURIComponent(error));
  if (!code) return back('gcal_error=no_code');

  const c = googleClient();
  try {
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: c.id!, client_secret: c.secret!, code,
        grant_type: 'authorization_code', redirect_uri: `${origin}/api/google-calendar/callback`,
      }),
    });
    const t = await tokenResponse.json();
    if (t.error) {
      console.error('Calendar token error:', t);
      return back('gcal_error=' + encodeURIComponent('token: ' + (t.error_description || t.error)));
    }
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { error: upErr } = await supabase.from('profiles').update({
        gcal_access_token: t.access_token,
        gcal_refresh_token: t.refresh_token,
        gcal_token_expires_at: new Date(Date.now() + t.expires_in * 1000).toISOString(),
      }).eq('id', user.id);
      if (upErr) {
        console.error('Failed to save calendar tokens:', upErr);
        return back('gcal_error=' + encodeURIComponent('save: ' + upErr.message));
      }
    } else {
      return back('gcal_error=not_logged_in');
    }
    return back('gcal=connected');
  } catch (err) {
    console.error('Calendar callback error:', err);
    return back('gcal_error=server_error');
  }
}

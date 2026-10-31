import { NextResponse } from 'next/server';
import OAuthClient from 'intuit-oauth';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic'; // <--- Add this line

  // ... rest of your code
export async function GET(request: Request) {
  const oauthClient = new OAuthClient({
    clientId: process.env.INTUIT_CLIENT_ID!,
    clientSecret: process.env.INTUIT_CLIENT_SECRET!,
    environment: (process.env.INTUIT_ENVIRONMENT || 'sandbox') as 'sandbox' | 'production',
    redirectUri: process.env.INTUIT_REDIRECT_URI!,
  });

  try {
    const parseUri = request.url;
    const authResponse = await oauthClient.createToken(parseUri);
    const token = authResponse.getJson();
    const realmId = oauthClient.getToken().realmId;

    // Save tokens to Supabase 'integrations' table for background cron jobs
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { error: dbError } = await supabase.from('integrations').upsert({
      provider: 'quickbooks',
      realm_id: realmId,
      access_token: token.access_token,
      refresh_token: token.refresh_token,
      expires_at: new Date(Date.now() + token.expires_in * 1000).toISOString(),
    }, { onConflict: 'realm_id' });

    if (dbError) {
      console.error('Failed to save QuickBooks integration token to Supabase:', dbError.message);
    }

    // Redirect back to dashboard
    const response = NextResponse.redirect(new URL('/?qbd_connected=true', request.url));

    // Store access_token, refresh_token, and realmId in secure HttpOnly cookies
    const isProd = process.env.NODE_ENV === 'production';

    response.cookies.set('qbd_access_token', token.access_token, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      path: '/',
      maxAge: token.expires_in, // 3600 seconds (1 hour)
    });

    response.cookies.set('qbd_refresh_token', token.refresh_token, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      path: '/',
      maxAge: 100 * 24 * 60 * 60, // Refresh tokens last up to 100 days
    });

    response.cookies.set('qbd_realm_id', realmId, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      path: '/',
    });

    return response;
  } catch (error: any) {
    console.error('QuickBooks callback error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
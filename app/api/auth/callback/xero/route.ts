import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: Request) {
  try {
    // Safely evaluate request URL only when the request actually hits the server at runtime
    const incomingUrl = request.url;
    const urlObj = new URL(incomingUrl, 'http://localhost'); // fallback base to prevent static parser evaluation crashes
    const code = urlObj.searchParams.get('code');

    if (!code) {
      console.error('Xero Callback Error: Authorization code missing from URL');
      return NextResponse.json({ error: 'Authorization code missing' }, { status: 400 });
    }

    const clientId = process.env.XERO_CLIENT_ID;
    const clientSecret = process.env.XERO_CLIENT_SECRET;
    const redirectUri = process.env.XERO_REDIRECT_URI;

    if (!clientId || !clientSecret || !redirectUri) {
      console.error('Xero Callback Error: Missing environment variables');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    // 1. Exchange authorization code for tokens
    const tokenResponse = await fetch('https://identity.xero.com/connect/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
      }),
    });

    const tokens = await tokenResponse.json();

    if (!tokenResponse.ok) {
      console.error('Xero Token Exchange Failed:', tokens);
      return NextResponse.json({ error: 'Failed to exchange token', details: tokens }, { status: 400 });
    }

    // 2. Fetch connected Xero tenants/organisations
    const connectionsResponse = await fetch('https://api.xero.com/connections', {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
        'Content-Type': 'application/json',
      },
    });

    const connections = await connectionsResponse.json();
    
    if (!connections || connections.length === 0) {
      console.error('Xero Connections Error: No active tenants found');
      return NextResponse.json({ error: 'No Xero organizations found for this account' }, { status: 400 });
    }

    const tenantId = connections[0].tenantId;
    console.log('Successfully retrieved Xero Tenant ID:', tenantId);

    // 3. Save tokens to Supabase xero_connections table
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

    const { error: dbError } = await supabase
      .from('xero_connections')
      .upsert({
        user_id: 'default-user',
        tenant_id: tenantId,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: expiresAt,
      }, { onConflict: 'tenant_id' });

    if (dbError) {
      console.error('Supabase Database Upsert Error:', dbError);
      return NextResponse.json({ error: 'Failed to save connection to database', details: dbError }, { status: 500 });
    }

    console.log('Successfully saved Xero connection to Supabase!');

    // 4. Redirect back to your app dashboard with a success flag
    const redirectUrl = new URL('/dashboard?success=xero_connected', incomingUrl);
    return NextResponse.redirect(redirectUrl);

  } catch (err: any) {
    console.error('Unexpected error in Xero callback route:', err);
    return NextResponse.json({ error: 'Internal server error', details: err.message }, { status: 500 });
  }
}
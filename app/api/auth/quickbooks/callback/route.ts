import { NextResponse } from 'next/server';
import OAuthClient from 'intuit-oauth';

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

    // Create the response redirecting back to the dashboard
    const response = NextResponse.redirect(new URL('/?qbd_connected=true', request.url));

    // Store tokens and realmId securely in HttpOnly cookies for subsequent sync requests
    response.cookies.set('qbd_access_token', token.access_token, { httpOnly: true, path: '/' });
    response.cookies.set('qbd_realm_id', realmId, { httpOnly: true, path: '/' });

    return response;
  } catch (error: any) {
    console.error('QuickBooks callback error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
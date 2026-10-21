import { NextResponse } from 'next/server';
import OAuthClient from 'intuit-oauth';

export async function GET() {
  const oauthClient = new OAuthClient({
    clientId: process.env.INTUIT_CLIENT_ID!,
    clientSecret: process.env.INTUIT_CLIENT_SECRET!,
    environment: (process.env.INTUIT_ENVIRONMENT || 'sandbox') as 'sandbox' | 'production',
    redirectUri: process.env.INTUIT_REDIRECT_URI!,
  });

  const authUri = oauthClient.authorizeUri({
    scope: [OAuthClient.scopes.Accounting, OAuthClient.scopes.OpenId],
    state: 'intuit-test-state',
  });

  return NextResponse.redirect(authUri);
}
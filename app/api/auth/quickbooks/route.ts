import OAuthClient from 'intuit-oauth';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const redirectUri = process.env.INTUIT_REDIRECT_URI || `${url.protocol}//${url.host}/api/auth/quickbooks/callback`;

  const oauthClient = new OAuthClient({
    clientId: process.env.INTUIT_CLIENT_ID!,
    clientSecret: process.env.INTUIT_CLIENT_SECRET!,
environment: (process.env.INTUIT_ENVIRONMENT || 'sandbox') as 'sandbox' | 'production',    redirectUri: redirectUri,
  });

  const authUri = oauthClient.authorizeUri({
    scope: [OAuthClient.scopes.Accounting],
    state: 'payping-state',
  });

  return Response.redirect(authUri);
}
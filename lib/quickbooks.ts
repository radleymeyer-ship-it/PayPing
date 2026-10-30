import OAuthClient from 'intuit-oauth';
import { cookies } from 'next/headers';

export function getIntuitClient() {
  return new OAuthClient({
    clientId: process.env.INTUIT_CLIENT_ID!,
    clientSecret: process.env.INTUIT_CLIENT_SECRET!,
    environment: (process.env.INTUIT_ENVIRONMENT || 'sandbox') as 'sandbox' | 'production',
    redirectUri: process.env.INTUIT_REDIRECT_URI!,
  });
}

export async function getValidAccessToken() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('qbd_access_token')?.value;
  const refreshToken = cookieStore.get('qbd_refresh_token')?.value;
  const realmId = cookieStore.get('qbd_realm_id')?.value;

  if (!refreshToken || !realmId) {
    throw new Error('QuickBooks authentication required');
  }

  // If access token is still valid, return it along with realmId
  if (accessToken) {
    return { accessToken, realmId };
  }

  // Access token expired; refresh using the stored refresh_token
  const oauthClient = getIntuitClient();
  const authResponse = await oauthClient.refreshUsingToken(refreshToken);
  const newToken = authResponse.getJson();

  // Optionally update cookies or Supabase with new tokens
  return {
    accessToken: newToken.access_token as string,
    realmId,
  };
}
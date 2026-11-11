import { NextResponse } from 'next/server';

export async function GET() {
  const clientId = process.env.XERO_CLIENT_ID;
  const redirectUri = process.env.XERO_REDIRECT_URI || 'https://pay-ping-git-main-radleymeyer-6315.vercel.app/api/auth/callback/xero';
  const scopes = [
  'openid',
  'profile',
  'email',
  'offline_access',
  'accounting.settings',
  'accounting.contacts',
  'accounting.payments',
  'accounting.invoices',
  'accounting.banktransactions',
  'accounting.manualjournals'
].join(' ');
  
  if (!clientId) {
    return NextResponse.json({ error: 'XERO_CLIENT_ID environment variable is missing' }, { status: 500 });
  }

  const xeroAuthUrl = `https://login.xero.com/identity/connect/authorize?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scopes)}&state=123`;

  return NextResponse.redirect(xeroAuthUrl);
}
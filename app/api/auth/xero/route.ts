import { NextResponse } from 'next/server';

export async function GET() {
  const clientId = process.env.XERO_CLIENT_ID;
  const redirectUri = process.env.XERO_REDIRECT_URI || 'http://localhost:3000/api/auth/callback/xero';
  const scopes = [
  'openid',
  'profile',
  'email',
  'offline_access',
  'app.connections',
  'accounting.settings',
  'accounting.contacts',
  'accounting.attachments',
  'accounting.payments',
  'accounting.invoices',
  'accounting.banktransactions',
  'accounting.manualjournals',
  'accounting.reports.read',
  'payroll.employees',
  'payroll.payruns',
  'payroll.payslip',
  'payroll.settings',
  'payroll.timesheets',
  'files',
  'assets',
  'projects'
].join(' ');
  
  if (!clientId) {
    return NextResponse.json({ error: 'XERO_CLIENT_ID environment variable is missing' }, { status: 500 });
  }

  const xeroAuthUrl = `https://login.xero.com/identity/connect/authorize?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scopes)}&state=123`;

  return NextResponse.redirect(xeroAuthUrl);
}
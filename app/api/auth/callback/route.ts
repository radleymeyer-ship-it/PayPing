import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');

  if (!code) {
    return NextResponse.redirect(new URL('/?xero_connected=false', request.url));
  }

  // Redirect back to your dashboard with success flag
  return NextResponse.redirect(new URL('/?xero_connected=true', request.url));
}
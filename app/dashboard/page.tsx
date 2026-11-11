import { Suspense } from 'react';
import Link from 'next/link';

async function DashboardContent({
  searchParams,
}: {
  searchParams: Promise<{ success?: string }>;
}) {
  const params = await searchParams;
  const isConnected = params.success === 'xero_connected';

  return (
    <main className="p-8 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">GlamHub Studio Dashboard</h1>
        <Link 
          href="/" 
          className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-4 py-2 rounded-lg font-medium transition"
        >
          ← Return to Main Page
        </Link>
      </div>
      
      {isConnected && (
        <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg mb-6 shadow-sm">
          <p className="font-semibold">Successfully connected to Xero!</p>
          <p className="text-sm">Your OAuth 2.0 authentication tokens have been securely saved to Supabase.</p>
        </div>
      )}

      <div className="bg-white border rounded-xl p-6 shadow-sm">
        <h2 className="text-xl font-semibold mb-2">Xero Integration Status</h2>
        <p className="text-gray-600 mb-4">
          Your automated invoice and contact management system is linked and active.
        </p>
        <div className="flex gap-4">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
            ● Connected
          </span>
        </div>
      </div>
    </main>
  );
}

export default function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string }>;
}) {
  return (
    <Suspense fallback={<div className="p-8">Loading dashboard...</div>}>
      <DashboardContent searchParams={searchParams} />
    </Suspense>
  );
}
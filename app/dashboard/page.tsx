import { Suspense } from 'react';

function DashboardContent({
  searchParams,
}: {
  searchParams: { success?: string };
}) {
  const isConnected = searchParams.success === 'xero_connected';

  return (
    <main className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-4">GlamHub Studio Dashboard</h1>
      
      {isConnected && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-6">
          Successfully connected to Xero! Your authentication tokens have been securely stored.
        </div>
      )}

      <p className="text-gray-600">
        Your automated invoice and contact management system is ready.
      </p>
    </main>
  );
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string }>;
}) {
  const params = await searchParams;

  return (
    <Suspense fallback={<div className="p-8">Loading dashboard...</div>}>
      <DashboardContent searchParams={params} />
    </Suspense>
  );
}
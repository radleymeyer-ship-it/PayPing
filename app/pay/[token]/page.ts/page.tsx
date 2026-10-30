import { createClient } from '@supabase/supabase-js';
import { notFound } from 'next/navigation';
import { formatCurrency } from '@/lib/currency';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface PageProps {
  params: Promise<{ token: string }>;
}

export default async function ClientPaymentPortal({ params }: PageProps) {
  const { token } = await params;

  // Fetch invoice by stripe_invoice_id or a unique magic token
  const { data: invoice, error } = await supabase
    .from('invoices')
    .select('*')
    .eq('stripe_invoice_id', token)
    .single();

  if (error || !invoice) {
    notFound();
  }

  const isPaid = invoice.status === 'paid';

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
        
        {/* Header / Brand */}
        <div className="text-center mb-6">
          <h1 className="text-xl font-bold text-gray-900">PayPing Secure Portal</h1>
          <p className="text-sm text-gray-500">Invoice Payment Summary</p>
        </div>

        {/* Invoice Info Card */}
        <div className="bg-gray-50 rounded-xl p-4 mb-6 space-y-3 border border-gray-100">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Customer</span>
            <span className="font-medium text-gray-900">{invoice.customer_name}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Due Date</span>
            <span className="font-medium text-gray-900">{new Date(invoice.due_date).toLocaleDateString()}</span>
          </div>
          <div className="border-t border-gray-200 pt-3 flex justify-between items-center">
            <span className="font-semibold text-gray-700">Amount Due</span>
            <span className="text-2xl font-extrabold text-indigo-600">
              {formatCurrency(invoice.amount_due, invoice.currency)}
            </span>
          </div>
        </div>

        {/* Status / Action */}
        {isPaid ? (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
            <p className="text-green-800 font-semibold text-sm">✓ This invoice has been successfully paid.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {invoice.hosted_invoice_url ? (
              <a
                href={invoice.hosted_invoice_url}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 px-4 rounded-xl transition duration-200 flex items-center justify-center shadow-lg shadow-indigo-100"
              >
                Pay Now with Stripe
              </a>
            ) : (
              <p className="text-center text-sm text-red-500">Payment link currently unavailable.</p>
            )}
            <p className="text-xs text-center text-gray-400 mt-4">
              Secured by Stripe & PayPing Global Billing
            </p>
          </div>
        )}

      </div>
    </main>
  );
}
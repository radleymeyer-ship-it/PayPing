import { createElement, Suspense, use } from 'react';
import { createClient } from '@supabase/supabase-js';
import { formatCurrency } from '@/lib/currency';

export const instant = false;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function PaymentContent({ params }: { params: Promise<{ token: string }> }) {
  const resolvedParams = use(params);
  return createElement(PaymentDetails, { token: resolvedParams.token });
}

async function PaymentDetails({ token }: { token: string }) {
  const { data: invoice, error } = await supabase
    .from('invoices')
    .select('*')
    .eq('magic_link_token', token)
    .single();

  if (error || !invoice) {
    return createElement(
      'div',
      { className: 'max-w-md text-center' },
      createElement('h1', { className: 'text-2xl font-bold text-gray-800' }, 'Invalid or Expired Link'),
      createElement(
        'p',
        { className: 'mt-2 text-gray-600' },
        'This payment link is no longer valid or has already been paid.'
      )
    );
  }

  return createElement(
    'div',
    { className: 'w-full max-w-lg bg-white p-8 rounded-xl shadow-sm border border-gray-100' },
    createElement('h1', { className: 'text-xl font-semibold text-gray-900' }, 'Invoice Payment'),
    createElement('p', { className: 'text-sm text-gray-500 mt-1' }, `Invoice #${invoice.invoice_number}`),
    createElement(
      'div',
      { className: 'my-6 py-6 border-t border-b border-gray-100 flex justify-between items-center' },
      createElement('span', { className: 'text-gray-600 font-medium' }, 'Total Due'),
      createElement(
        'span',
        { className: 'text-2xl font-bold text-gray-900' },
        formatCurrency(Number(invoice.amount_due || 0), invoice.currency || 'USD')
      )
    ),
    invoice.status === 'paid'
      ? createElement(
          'div',
          { className: 'bg-green-50 text-green-700 p-4 rounded-lg text-center font-medium' },
          'This invoice has already been paid. Thank you!'
        )
      : createElement(
          'form',
          { action: '/api/stripe/create-checkout-session', method: 'POST' },
          createElement('input', { type: 'hidden', name: 'invoice_id', value: String(invoice.id) }),
          createElement(
            'button',
            {
              type: 'submit',
              className: 'w-full bg-black text-white py-3 rounded-lg font-medium hover:bg-gray-800 transition',
            },
            'Pay Now with Stripe'
          )
        )
  );
}

export default function PaymentPage({ params }: { params: Promise<{ token: string }> }) {
  return createElement(
    'main',
    { className: 'flex min-h-screen items-center justify-center p-6 bg-gray-50' },
    createElement(
      Suspense,
      { fallback: createElement('div', { className: 'text-gray-500' }, 'Loading invoice...') },
      createElement(PaymentContent, { params })
    )
  );
}
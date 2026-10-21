import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { supabase } from '@/lib/supabase';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_dummy', {
  apiVersion: '2023-10-16' as any,
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  let event: Stripe.Event;

  try {
    if (!signature || !webhookSecret) {
      // Direct parsing fallback for local testing without signature header
      event = JSON.parse(body);
    } else {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    }
  } catch (err: any) {
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  // Process key invoice lifecycle events
  switch (event.type) {
    case 'invoice.created':
    case 'invoice.updated':
    case 'invoice.finalized': {
      const invoice = event.data.object as Stripe.Invoice;

      await supabase.from('invoices').upsert({
        stripe_invoice_id: invoice.id,
        customer_name: invoice.customer_name || invoice.customer_email || 'Valued Customer',
        customer_email: invoice.customer_email || 'customer@example.com',
        amount_due: invoice.amount_due,
        currency: invoice.currency || 'usd',
        status: invoice.status === 'paid' ? 'paid' : 'unpaid',
        due_date: invoice.due_date
          ? new Date(invoice.due_date * 1000).toISOString()
          : new Date().toISOString(),
        hosted_invoice_url: invoice.hosted_invoice_url || '',
      });
      break;
    }

    case 'invoice.payment_succeeded': {
      const invoice = event.data.object as Stripe.Invoice;

      // Automatically update payment status in Supabase when paid
      await supabase
        .from('invoices')
        .update({ status: 'paid' })
        .eq('stripe_invoice_id', invoice.id);

      break;
    }

    default:
      console.log(`Unhandled event type: ${event.type}`);
  }

  return NextResponse.json({ received: true });
}
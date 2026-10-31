import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const eventNotifications = body.eventNotifications || [];

    for (const notification of eventNotifications) {
      const realmId = notification.realmId; // QuickBooks company ID
      const entities = notification.dataChangeEvent?.entities || [];

      for (const entity of entities) {
        if (entity.name === 'Invoice') {
          const qbInvoiceId = entity.id;
          const operation = entity.operation; // Create, Update, Delete

          if (operation === 'Update' || operation === 'Create') {
            // 1. Fetch the latest invoice details from QuickBooks API using stored tokens for this realmId
            const { data: integration } = await supabase
              .from('integrations')
              .select('*')
              .eq('realm_id', realmId)
              .single();

            if (!integration) continue;

            // Call QuickBooks API to get the current invoice balance / status
            const qbResponse = await fetch(
              `https://sandbox-quickbooks.api.intuit.com/v3/company/${realmId}/invoice/${qbInvoiceId}`,
              {
                headers: {
                  'Authorization': `Bearer ${integration.access_token}`,
                  'Accept': 'application/json',
                },
              }
            );

            const qbData = await qbResponse.json();
            const qbInvoice = qbData.Invoice;

            if (qbInvoice) {
              // If Balance is 0, it's fully paid!
              const isPaid = qbInvoice.Balance === 0;
              const newStatus = isPaid ? 'paid' : 'sent';

              // 2. Automatically update Supabase
              await supabase
                .from('invoices')
                .update({ 
                  status: newStatus,
                  amount_due: qbInvoice.Balance 
                })
                .eq('stripe_invoice_id', qbInvoiceId); // or match your qb_invoice_id column
            }
          }
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('QuickBooks Webhook Error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
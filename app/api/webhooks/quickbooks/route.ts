import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // QuickBooks sends event notifications containing entity changes (e.g., Invoice)
    const eventNotifications = body.eventNotifications || [];

    for (const notification of eventNotifications) {
      const realmId = notification.realmId; // QuickBooks company ID
      const entities = notification.dataChangeEvent?.entities || [];

      for (const entity of entities) {
        if (entity.name === 'Invoice') {
          const invoiceId = entity.id;
          const operation = entity.operation; // Create, Update, Delete

          if (operation === 'Delete') {
            await supabase.from('invoices').delete().eq('qb_invoice_id', invoiceId);
          } else {
            // Fetch the updated invoice details from QuickBooks API using your stored OAuth tokens
            // and upsert them into your Supabase 'invoices' table automatically!
            console.log(`QuickBooks invoice ${invoiceId} was ${operation}ed. Syncing...`);
          }
        }
      }
    }

    return NextResponse.json({ status: 'success' });
  } catch (err: any) {
    console.error('QuickBooks Webhook Error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
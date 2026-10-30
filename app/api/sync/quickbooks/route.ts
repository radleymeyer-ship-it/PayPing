import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getValidAccessToken } from '@/lib/quickbooks';

export async function POST() {
  try {
    
    const { accessToken, realmId } = await getValidAccessToken();

    console.log("=== QUICKBOOKS SYNC DEBUG ===");
    console.log("Access Token:", accessToken ? "FOUND" : "MISSING");
    console.log("Realm ID:", realmId || "MISSING");

    if (!accessToken || !realmId) {
      return NextResponse.json(
        { success: false, error: 'QuickBooks is not connected or tokens expired.' },
        { status: 401 }
      );
    }

    // Query invoices from Intuit Sandbox
    const query = encodeURIComponent("select * from Invoice MAXRESULTS 10");
    const qbUrl = `https://sandbox-quickbooks.api.intuit.com/v3/company/${realmId}/query?query=${query}`;

    const qbRes = await fetch(qbUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json',
      },
    });

    const qbData = await qbRes.json();

    if (qbData.Fault) {
      console.error("QuickBooks API Fault:", qbData.Fault);
      return NextResponse.json(
        { success: false, error: qbData.Fault.Error[0]?.Message || 'QuickBooks API error' },
        { status: 400 }
      );
    }

    const invoicesData = qbData.QueryResponse?.Invoice || [];

    const formattedInvoices = invoicesData.map((inv: any) => ({
      stripe_invoice_id: inv.DocNumber || `QB-${inv.Id}`,
      customer_name: inv.CustomerRef?.name || 'QuickBooks Customer',
      customer_email: inv.BillEmail?.Address || 'billing@example.com',
      amount_due: Math.round(Number(inv.TotalAmt || 0) * 100),
      currency: 'usd',
      status: 'unpaid',
      due_date: inv.DueDate || new Date().toISOString(),
      hosted_invoice_url: inv.CustomerMemo?.Value || 'https://sandbox.quickbooks.com', // Safe fallback for not-null constraint
    }));

    // Supabase initialization with environment check
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error("Missing Supabase environment variables!");
      return NextResponse.json({ success: false, error: "Missing Supabase API keys in .env" }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    if (formattedInvoices.length > 0) {
      const { error: dbError } = await supabase
        .from('invoices')
        .upsert(formattedInvoices, { onConflict: 'stripe_invoice_id' });

      if (dbError) {
        console.error("Supabase Upsert Error:", dbError);
        return NextResponse.json({ success: false, error: `Supabase error: ${dbError.message}` }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true, count: formattedInvoices.length, data: formattedInvoices });
  } catch (err: any) {
    console.error('QuickBooks Sync Exception:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
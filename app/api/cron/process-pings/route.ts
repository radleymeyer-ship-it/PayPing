import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { Resend } from 'resend';

export async function GET(request: Request) {
  try {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: 'RESEND_API_KEY is missing in .env.local' },
        { status: 500 }
      );
    }

    const resend = new Resend(apiKey);

    // 1. Fetch unpaid invoices from Supabase
    const { data: invoices, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('status', 'unpaid');

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    if (!invoices || invoices.length === 0) {
      return NextResponse.json({ success: true, message: 'No unpaid invoices found to process.' });
    }

    const today = new Date();
    const results = [];

    for (const invoice of invoices) {
      const dueDate = new Date(invoice.due_date);
      const diffTime = today.getTime() - dueDate.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays >= 3) {
        try {
          const emailResponse = await resend.emails.send({
            from: 'PayPing Reminders <onboarding@resend.dev>',
            to: [invoice.customer_email],
            subject: `Automated Reminder: Invoice ${invoice.stripe_invoice_id} is overdue`,
            html: `
              <div style="font-family: sans-serif; padding: 20px; color: #333;">
                <h2>Hi ${invoice.customer_name},</h2>
                <p>This is an automated reminder that invoice <strong>${invoice.stripe_invoice_id}</strong> for <strong>$${(invoice.amount_due / 100).toFixed(2)}</strong> was due on ${dueDate.toLocaleDateString()}.</p>
                <div style="margin: 20px 0;">
                  <a href="${invoice.hosted_invoice_url || 'https://stripe.com'}" style="background-color: #2563eb; color: #ffffff; padding: 10px 18px; border-radius: 6px; text-decoration: none; font-weight: bold; display: inline-block;">
                    Pay Invoice Now
                  </a>
                </div>
                <p style="font-size: 12px; color: #666;">Sent automatically via PayPing Sequence Engine.</p>
              </div>
            `,
          });

          results.push({ invoiceId: invoice.stripe_invoice_id, status: 'sent', daysOverdue: diffDays, response: emailResponse });
        } catch (emailErr: any) {
          results.push({ invoiceId: invoice.stripe_invoice_id, status: 'failed', error: emailErr.message });
        }
      }
    }

    return NextResponse.json({
      success: true,
      processedCount: invoices.length,
      dispatches: results,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
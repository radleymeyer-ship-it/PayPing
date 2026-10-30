import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js';
import twilio from 'twilio';

const resend = new Resend(process.env.RESEND_API_KEY);
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

export async function POST(request: Request) {
  try {
    const { invoiceId } = await request.json();

    // 1. Fetch the specific invoice
    const { data: invoice, error: invError } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', invoiceId)
      .single();

    if (invError || !invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    // 2. Calculate days overdue
    const today = new Date();
    const dueDate = new Date(invoice.due_date);
    const diffTime = today.getTime() - dueDate.getTime();
    const daysOverdue = Math.max(1, Math.floor(diffTime / (1000 * 60 * 60 * 24)));

    // 3. Fetch matching active cadence step (or fallback to step 1)
    let { data: step } = await supabase
      .from('cadence_steps')
      .select('*')
      .eq('day_trigger', daysOverdue)
      .eq('is_active', true)
      .single();

    if (!step) {
      const { data: firstStep } = await supabase
        .from('cadence_steps')
        .select('*')
        .eq('is_active', true)
        .order('day_trigger', { ascending: true })
        .limit(1)
        .single();

      step = firstStep;
    }

    if (!step) {
      return NextResponse.json({ error: 'No active cadence steps found' }, { status: 400 });
    }

    // 4. Dynamic Variable Replacement
    const renderTemplate = (str: string) =>
      (str || '')
        .replace(/\{\{customer_name\}\}/g, invoice.customer_name || 'Valued Customer')
        .replace(/\{\{invoice_id\}\}/g, invoice.stripe_invoice_id || invoice.id)
        .replace(/\{\{amount\}\}/g, `$${((invoice.amount_due || invoice.amount || 0) / 100).toFixed(2)}`)
        .replace(/\{\{due_date\}\}/g, invoice.due_date)
        .replace(/\{\{payment_link\}\}/g, invoice.payment_link || '#');

    const subject = renderTemplate(step.subject_template);
    const bodyText = renderTemplate(step.message_body);

    const results: Record<string, any> = {};

    // 5. Send Email via Resend
    if (invoice.customer_email) {
      results.email = await resend.emails.send({
        from: 'PayPing Reminders <onboarding@resend.dev>',
        to: invoice.customer_email,
        subject: subject,
        html: `<div style="font-family: sans-serif; white-space: pre-wrap; line-height: 1.5;">${bodyText}</div>`,
      });
    }

    // 6. Send WhatsApp via Twilio (Direct Text)
    if (invoice.customer_phone) {
      try {
        const phone = invoice.customer_phone.startsWith('+') 
          ? invoice.customer_phone 
          : `+${invoice.customer_phone}`;

        console.log('Attempting to send WhatsApp to:', phone);

        results.whatsapp = await twilioClient.messages.create({
          from: process.env.TWILIO_WHATSAPP_NUMBER,
          to: `whatsapp:${phone}`,
          body: bodyText,
        });

        console.log('WhatsApp sent successfully:', results.whatsapp.sid);
      } catch (twilioErr: any) {
        console.error('Twilio Error Details:', twilioErr.message);
        results.whatsapp_error = twilioErr.message;
      }
    } else {
      console.log('Skipping WhatsApp: No customer_phone found for invoice');
    }

    return NextResponse.json({ success: true, results });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
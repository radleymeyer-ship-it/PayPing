import { NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  try {
    const { to, customerName, invoiceId, amount, dueDate, paymentUrl } = await request.json();

    const data = await resend.emails.send({
      from: 'PayPing Reminders <onboarding@resend.dev>',
      to: [to],
      subject: `Friendly Reminder: Invoice ${invoiceId} is due`,
      html: `
        <div style="font-family: sans-serif; padding: 20px; color: #333;">
          <h2>Hi ${customerName},</h2>
          <p>This is a friendly automated reminder that invoice <strong>${invoiceId}</strong> for <strong>$${(amount / 100).toFixed(2)}</strong> was due on ${new Date(dueDate).toLocaleDateString()}.</p>
          <div style="margin: 20px 0;">
            <a href="${paymentUrl}" style="background-color: #2563eb; color: #ffffff; padding: 10px 18px; border-radius: 6px; text-decoration: none; font-weight: bold; display: inline-block;">
              Pay Invoice Now
            </a>
          </div>
          <p style="font-size: 12px; color: #666;">Sent automatically via PayPing.</p>
        </div>
      `,
    });

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
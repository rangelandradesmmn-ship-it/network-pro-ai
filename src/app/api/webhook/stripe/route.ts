import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
});

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export async function POST(req: Request) {
  const body = await req.text();
  const sig = req.headers.get('stripe-signature') as string;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    if (!webhookSecret) {
      // Fallback para desenvolvimento se não houver segredo do webhook (inseguro para prod)
      event = JSON.parse(body);
    } else {
      event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
    }
  } catch (err: any) {
    console.error(`Webhook Error: ${err.message}`);
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  // Handle the checkout.session.completed event
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    
    // Retrieve the user ID from metadata
    const userId = session.metadata?.userId;

    if (userId) {
      console.log(`Payment successful for user ${userId}. Approving commissions...`);
      
      // Update the user's pending commissions to APPROVED!
      const { error } = await supabaseAdmin
        .from('financial_ledger')
        .update({ status: 'APPROVED' })
        .eq('from_user_id', userId)
        .eq('status', 'PENDING');
        
      if (error) {
        console.error('Error approving user payments:', error);
      } else {
        console.log(`Successfully approved payments for user ${userId}`);
      }
    }
  }

  return NextResponse.json({ received: true });
}

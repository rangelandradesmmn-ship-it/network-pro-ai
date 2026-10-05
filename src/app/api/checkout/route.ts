import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
});

export async function POST(request: Request) {
  try {
    const { userId, userEmail, userName, tenantId } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const priceAmount = process.env.NEXT_PUBLIC_ACTIVATION_PRICE ? parseInt(process.env.NEXT_PUBLIC_ACTIVATION_PRICE) : 5000; // Default R$ 50.00

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card', 'pix'],
      customer_email: userEmail || undefined,
      line_items: [
        {
          price_data: {
            currency: 'brl',
            product_data: {
              name: 'Ativação Network Pro AI',
              description: `Ativação na rede de matrizes para o usuário ${userName || ''}`,
            },
            unit_amount: priceAmount,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://network-pro-ai.vercel.app'}/dashboard?payment=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://network-pro-ai.vercel.app'}/dashboard?payment=cancelled`,
      metadata: {
        userId: userId,
        tenantId: tenantId || ''
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error('Checkout error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

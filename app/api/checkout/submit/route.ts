import { NextResponse } from "next/server";
import Stripe from "stripe";

export const runtime = "nodejs";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

type ReqBody = {
  paymentIntentId?: string;
};

export async function POST(req: Request) {
  const body = (await req.json()) as ReqBody;
  const paymentIntentId = body.paymentIntentId?.trim();

  if (!paymentIntentId) {
    return NextResponse.json({ error: "Missing paymentIntentId" }, { status: 400 });
  }

  const intent = await stripe.paymentIntents.retrieve(paymentIntentId);

  return NextResponse.json(
    {
      id: intent.id,
      status: intent.status,
      amount: intent.amount,
      currency: intent.currency,
    },
    { status: 200 }
  );
}








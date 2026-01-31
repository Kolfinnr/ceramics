import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";

export const runtime = "nodejs";

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








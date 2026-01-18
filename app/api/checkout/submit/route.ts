import { handleStripeWebhook } from "@/lib/stripe-webhook";

export const runtime = "nodejs"; // good for Stripe webhook reliability

export async function POST(req: Request) {
  return handleStripeWebhook(req);
}








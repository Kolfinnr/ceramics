import { handleStripeWebhook } from "@/lib/stripe-webhook";

export const runtime = "nodejs";

export async function POST(req: Request) {
  return handleStripeWebhook(req);
}

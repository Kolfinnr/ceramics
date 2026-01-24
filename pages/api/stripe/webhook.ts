import type { NextApiRequest, NextApiResponse } from "next";
import { handleStripeWebhookPayload } from "@/lib/stripe-webhook";

export const config = {
  api: {
    bodyParser: false,
  },
};

async function readRawBody(req: NextApiRequest): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks).toString("utf8");
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.status(405).send("Method Not Allowed");
    return;
  }

  const rawBody = await readRawBody(req);
  const signature = req.headers["stripe-signature"];
  const signatureValue = Array.isArray(signature) ? signature[0] : signature ?? null;
  const result = await handleStripeWebhookPayload(rawBody, signatureValue);
  res.status(result.status).json(result.body);
}

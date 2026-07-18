import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { getRazorpayEnvironment } from "@/lib/razorpay/env";

export function verifyRazorpayCheckoutSignature({
  providerPaymentId,
  storedProviderSubscriptionId,
  signature,
}: {
  providerPaymentId: string;
  storedProviderSubscriptionId: string;
  signature: string;
}) {
  if (!/^[a-f0-9]{64}$/i.test(signature)) return false;

  const expected = createHmac(
    "sha256",
    getRazorpayEnvironment().RAZORPAY_KEY_SECRET
  )
    .update(`${providerPaymentId}|${storedProviderSubscriptionId}`)
    .digest("hex");

  return timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(signature, "hex"));
}

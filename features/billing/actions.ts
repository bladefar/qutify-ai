"use server";

import { revalidatePath } from "next/cache";
import {
  checkoutCallbackSchema,
  checkoutPlanSchema,
} from "@/features/billing/schemas";
import {
  cancelRazorpaySubscription,
  createRazorpaySubscription,
  getRazorpayPublicKeyId,
  RazorpayRequestError,
} from "@/lib/razorpay/client";
import { verifyRazorpayCheckoutSignature } from "@/lib/razorpay/signature";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type CreateCheckoutResult =
  | {
      success: true;
      checkout: {
        subscriptionRecordId: string;
        providerSubscriptionId: string;
        publicKeyId: string;
      };
    }
  | { success: false; error: string };

export type VerifyCheckoutResult =
  | { success: true; message: string }
  | { success: false; error: string };

async function requireAuthenticatedUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) throw new Error("Please sign in to continue.");
  return { supabase, user };
}

function friendlyCheckoutError(error: unknown) {
  if (error instanceof RazorpayRequestError) return error.message;
  if (error instanceof Error) {
    if (error.message.includes("already")) return error.message;
    if (error.message.includes("Too many checkout attempts")) {
      return "Too many checkout attempts. Please wait an hour and try again.";
    }
    if (error.message.includes("Pro plan is not available")) {
      return "The Pro plan is temporarily unavailable.";
    }
  }
  return "We could not start checkout. Please try again.";
}

export async function createSubscriptionCheckout(
  rawPlanCode: string
): Promise<CreateCheckoutResult> {
  const parsedPlan = checkoutPlanSchema.safeParse(rawPlanCode);
  if (!parsedPlan.success) {
    return { success: false, error: "Please choose a valid Pro plan." };
  }

  let attemptId: string | null = null;

  try {
    const { supabase, user } = await requireAuthenticatedUser();
    // Validate the trusted persistence client before any external provider
    // request so a missing backend credential cannot create an orphaned
    // Razorpay subscription.
    const admin = createAdminClient();

    // A dismissed Checkout can safely reopen the same server-created provider
    // subscription. Never create a second provider subscription while the
    // first one is still in a non-terminal state.
    const { data: existingSubscription, error: existingError } = await supabase
      .from("user_subscriptions")
      .select("id, provider_subscription_id, status")
      .eq("user_id", user.id)
      .eq("checkout_plan_code", parsedPlan.data)
      .in("status", [
        "created",
        "authenticated",
        "pending",
        "active",
        "halted",
        "paused",
      ])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingError) throw existingError;
    if (existingSubscription?.status === "created") {
      return {
        success: true,
        checkout: {
          subscriptionRecordId: existingSubscription.id,
          providerSubscriptionId:
            existingSubscription.provider_subscription_id,
          publicKeyId: getRazorpayPublicKeyId(),
        },
      };
    }
    if (existingSubscription) {
      return {
        success: false,
        error:
          existingSubscription.status === "active"
            ? "Your Pro subscription is already active."
            : "Your subscription payment is already being confirmed.",
      };
    }

    const { data: reservation, error: reservationError } = await supabase.rpc(
      "reserve_razorpay_subscription_checkout",
      { p_checkout_plan_code: parsedPlan.data }
    );

    if (reservationError || typeof reservation !== "string") {
      throw new Error(reservationError?.message ?? "Checkout reservation failed");
    }
    attemptId = reservation;

    const providerSubscription = await createRazorpaySubscription({
      checkoutPlanCode: parsedPlan.data,
      userId: user.id,
    });
    const { data: subscriptionRecordId, error: recordError } = await admin.rpc(
      "record_razorpay_subscription_created",
      {
        p_user_id: user.id,
        p_attempt_id: attemptId,
        p_provider_subscription_id: providerSubscription.id,
      }
    );

    if (recordError || typeof subscriptionRecordId !== "string") {
      try {
        await cancelRazorpaySubscription(providerSubscription.id);
      } catch {
        // A later reconciliation job should detect a rare provider-side orphan.
      }
      throw new Error(recordError?.message ?? "Subscription record failed");
    }

    revalidatePath("/dashboard/billing");
    return {
      success: true,
      checkout: {
        subscriptionRecordId,
        providerSubscriptionId: providerSubscription.id,
        publicKeyId: getRazorpayPublicKeyId(),
      },
    };
  } catch (error) {
    if (attemptId) {
      try {
        const { supabase } = await requireAuthenticatedUser();
        await supabase.rpc("fail_razorpay_subscription_checkout", {
          p_attempt_id: attemptId,
        });
      } catch {
        // The reservation expires automatically after ten minutes.
      }
    }
    return { success: false, error: friendlyCheckoutError(error) };
  }
}

export async function verifySubscriptionCheckout(
  rawCallback: unknown
): Promise<VerifyCheckoutResult> {
  const parsed = checkoutCallbackSchema.safeParse(rawCallback);
  if (!parsed.success) {
    return { success: false, error: "The checkout response was invalid." };
  }

  try {
    const { supabase, user } = await requireAuthenticatedUser();
    const { data: subscription, error: subscriptionError } = await supabase
      .from("user_subscriptions")
      .select("id, provider_subscription_id, status")
      .eq("id", parsed.data.subscriptionRecordId)
      .eq("user_id", user.id)
      .eq("provider", "razorpay")
      .maybeSingle();

    if (subscriptionError || !subscription) {
      return { success: false, error: "Subscription checkout was not found." };
    }

    // Never build the signature payload from the browser-returned subscription
    // ID. It must match the ID previously stored from the server-created API
    // response, and the stored value is the canonical signature input.
    if (
      parsed.data.razorpaySubscriptionId !==
      subscription.provider_subscription_id
    ) {
      return { success: false, error: "Subscription verification failed." };
    }

    const signatureIsValid = verifyRazorpayCheckoutSignature({
      providerPaymentId: parsed.data.razorpayPaymentId,
      storedProviderSubscriptionId: subscription.provider_subscription_id,
      signature: parsed.data.razorpaySignature,
    });

    if (!signatureIsValid) {
      return { success: false, error: "Subscription verification failed." };
    }

    const admin = createAdminClient();
    const { error: updateError } = await admin.rpc(
      "mark_razorpay_checkout_authenticated",
      {
        p_user_id: user.id,
        p_subscription_id: subscription.id,
        p_provider_payment_id: parsed.data.razorpayPaymentId,
      }
    );

    if (updateError) throw updateError;

    revalidatePath("/dashboard/billing");
    return {
      success: true,
      message: "Payment received; confirming subscription.",
    };
  } catch {
    return {
      success: false,
      error: "We could not confirm the checkout response. Please contact support.",
    };
  }
}

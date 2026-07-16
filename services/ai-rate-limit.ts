import "server-only";

import {
  finalizeAiGenerationUsage,
  refundAiGenerationUsage,
  reserveAiGenerationUsage,
} from "@/services/usage";

function getRetryMessage(
  resetAt: string,
  label: string,
  canUpgrade: boolean
) {
  const millisecondsRemaining = new Date(resetAt).getTime() - Date.now();
  const minutesRemaining = Math.max(
    1,
    Math.ceil(millisecondsRemaining / 60_000)
  );

  return `${label} Try again in about ${minutesRemaining} minute${
    minutesRemaining === 1 ? "" : "s"
  }${canUpgrade ? ", or upgrade to Pro for higher limits." : "."}`;
}

export async function reserveAiGenerationQuota() {
  const quota = await reserveAiGenerationUsage();

  if (!quota.allowed) {
    const planName = quota.planCode === "pro" ? "Pro" : "Free";
    const canUpgrade = quota.planCode !== "pro";

    if (quota.monthlyRemaining === 0) {
      throw new Error(
        getRetryMessage(
          quota.monthlyResetAt,
          `${planName}'s monthly AI limit (${quota.monthlyLimit}) has been reached.`,
          canUpgrade
        )
      );
    }

    throw new Error(
      getRetryMessage(
        quota.hourlyResetAt ?? quota.monthlyResetAt,
        `${planName}'s hourly AI limit (${quota.hourlyLimit ?? 0}) has been reached.`,
        canUpgrade
      )
    );
  }

  if (!quota.reservationId) {
    throw new Error("AI quote generation is temporarily unavailable");
  }

  return {
    reservationId: quota.reservationId,
    monthlyRemaining: quota.monthlyRemaining,
    hourlyRemaining: quota.hourlyRemaining,
  };
}

export async function finalizeAiGenerationQuota(reservationId: string) {
  return finalizeAiGenerationUsage(reservationId);
}

export async function refundAiGenerationQuota(reservationId: string) {
  return refundAiGenerationUsage(reservationId);
}

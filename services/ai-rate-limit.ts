import "server-only";

import { createClient } from "@/lib/supabase/server";

type AiGenerationQuota = {
  allowed: boolean;
  remaining: number;
  reset_at: string;
};

function getRetryMessage(resetAt: string) {
  const millisecondsRemaining = new Date(resetAt).getTime() - Date.now();
  const minutesRemaining = Math.max(
    1,
    Math.ceil(millisecondsRemaining / 60_000)
  );

  return `AI quote limit reached. Try again in about ${minutesRemaining} minute${
    minutesRemaining === 1 ? "" : "s"
  }.`;
}

export async function consumeAiGenerationQuota() {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("consume_ai_quote_generation");

  if (error) {
    throw new Error("AI quote generation is temporarily unavailable");
  }

  const quota = (Array.isArray(data) ? data[0] : data) as
    | AiGenerationQuota
    | null;

  if (!quota) {
    throw new Error("AI quote generation is temporarily unavailable");
  }

  if (!quota.allowed) {
    throw new Error(getRetryMessage(quota.reset_at));
  }

  return {
    remaining: Number(quota.remaining),
    resetAt: quota.reset_at,
  };
}


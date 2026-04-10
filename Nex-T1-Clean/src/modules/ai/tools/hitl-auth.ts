type HitlAuthResult = { userId: string } | { error: { state: "output-error"; errorText: string } };

export const resolveHitlUser = async (
  missingUserMessage: string,
): Promise<HitlAuthResult> => {
  const { createClient } = await import("@/server/services/supabase/server");
  const supabase = await createClient();
  if (!supabase) {
    return { error: { state: "output-error", errorText: "Supabase client is not configured" } };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: { state: "output-error", errorText: missingUserMessage } };
  }

  return { userId: user.id };
};

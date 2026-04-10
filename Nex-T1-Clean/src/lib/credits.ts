type NumericLike = number | string | null | undefined;

type CreditPayload = Record<string, UntypedJson>;

export type CreditSummary = {
  remaining: number | null;
  used: number | null;
  limit: number | null;
  monthlyRemaining: number | null;
  overageCredits: number | null;
  reset: string | null;
  plan: string | null;
};

const createEmptyCreditSummary = (): CreditSummary => ({
  remaining: null,
  used: null,
  limit: null,
  monthlyRemaining: null,
  overageCredits: null,
  reset: null,
  plan: null,
});

// Try the more general profile endpoint first to avoid 401 noise on
// `/api/nex/me/usage` during bootstrap/race conditions.
const CREDIT_ENDPOINTS = ["/api/credits", "/api/nex/me", "/api/nex/me/usage"] as const;
const creditEndpointAvailability = new Map<string, boolean>();

const normalizeNumber = (value: NumericLike): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const readNested = (source: CreditPayload | undefined, path: string[]): UntypedJson => {
  if (!source) {
    return undefined;
  }
  return path.reduce<UntypedJson>((current, key) => {
    if (current && typeof current === "object" && key in (current as Record<string, UntypedJson>)) {
      return (current as Record<string, UntypedJson>)[key];
    }
    return undefined;
  }, source);
};

const extractCreditTotals = (payload: CreditPayload | CreditPayload[] | undefined): CreditSummary | null => {
  if (!payload) {
    return null;
  }

  const candidates: CreditPayload[] = Array.isArray(payload) ? payload : [payload];

  for (const candidate of candidates) {
    if (!candidate || typeof candidate !== "object") {
      continue;
    }

    const potentialNumbers: Array<[string[], string]> = [
      [["remaining"], "remaining"],
      [["limit"], "limit"],
      [["used"], "used"],
      [["credits", "remaining"], "remaining"],
      [["credits", "balance"], "remaining"],
      [["usage", "credits", "remaining"], "remaining"],
      [["usage", "creditsRemaining"], "remaining"],
      [["remainingCredits"], "remaining"],
      [["plan", "remainingCredits"], "remaining"],
      [["plan", "credits", "remaining"], "remaining"],
      [["limits", "credits", "remaining"], "remaining"],
      [["credits", "limit"], "limit"],
      [["limits", "credits", "limit"], "limit"],
      [["usage", "credits", "limit"], "limit"],
      [["usage", "credits", "used"], "used"],
      [["credits", "used"], "used"],
      [["usage", "creditsUsed"], "used"],
      [["usedCredits"], "used"],
      [["monthlyRemaining"], "monthlyRemaining"],
      [["credits", "monthlyRemaining"], "monthlyRemaining"],
      [["usage", "credits", "monthlyRemaining"], "monthlyRemaining"],
      [["overageCredits"], "overageCredits"],
      [["credits", "overageCredits"], "overageCredits"],
      [["usage", "credits", "overageCredits"], "overageCredits"],
    ];

    const summary = createEmptyCreditSummary();

    for (const [path, target] of potentialNumbers) {
      const raw = readNested(candidate, path);
      const value = normalizeNumber(raw as NumericLike);
      if (value === null) {
        continue;
      }
      if (target === "remaining" && summary.remaining === null) {
        summary.remaining = value;
      } else if (target === "limit" && summary.limit === null) {
        summary.limit = value;
      } else if (target === "used" && summary.used === null) {
        summary.used = value;
      } else if (
        target === "monthlyRemaining" &&
        summary.monthlyRemaining === null
      ) {
        summary.monthlyRemaining = value;
      } else if (
        target === "overageCredits" &&
        summary.overageCredits === null
      ) {
        summary.overageCredits = value;
      }
    }

    const resetCandidate = readNested(candidate, ["reset"]);
    if (typeof resetCandidate === "string" && resetCandidate.trim().length > 0) {
      summary.reset = resetCandidate;
    }

    const planCandidate = readNested(candidate, ["plan"]);
    if (typeof planCandidate === "string" && planCandidate.trim().length > 0) {
      summary.plan = planCandidate;
    }

    if (
      summary.monthlyRemaining === null &&
      summary.limit !== null &&
      summary.used !== null
    ) {
      const { limit, used } = summary;
      summary.monthlyRemaining = Math.max(limit - used, 0);
    }

    if (
      summary.overageCredits === null &&
      summary.remaining !== null &&
      summary.monthlyRemaining !== null
    ) {
      const { remaining, monthlyRemaining } = summary;
      summary.overageCredits = Math.max(
        remaining - monthlyRemaining,
        0,
      );
    }

    if (summary.remaining !== null || summary.used !== null || summary.limit !== null) {
      return summary;
    }
  }

  return null;
};

const parseCreditsResponse = async (response: Response): Promise<CreditSummary | null> => {
  const json = await response.json().catch(() => undefined);
  if (!json || typeof json !== "object") {
    return null;
  }

  // Some APIs wrap payloads in a `data` or `result` field.
  const containers = [json as CreditPayload];
  if ("data" in json) {
    containers.push((json as Record<string, UntypedJson>).data as CreditPayload);
  }
  if ("result" in json) {
    containers.push((json as Record<string, UntypedJson>).result as CreditPayload);
  }

  for (const container of containers) {
    const summary = extractCreditTotals(container);
    if (summary) {
      return summary;
    }
  }

  return null;
};

type LoadCreditsOptions = {
  signal?: AbortSignal;
  accessToken?: string | null;
};

export async function loadCreditBalance(options: LoadCreditsOptions = {}): Promise<CreditSummary> {
  const { signal, accessToken } = options;

  for (const path of CREDIT_ENDPOINTS) {
    if (creditEndpointAvailability.get(path) === false) {
      continue;
    }
    try {
      const res = await fetch(path, {
        method: "GET",
        credentials: "include",
        headers: {
          Accept: "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        signal,
      });
      if (res.status === 404) {
        creditEndpointAvailability.set(path, false);
        continue;
      }
      if (res.status === 401) {
        return createEmptyCreditSummary();
      }
      if (!res.ok) {
        continue;
      }
      creditEndpointAvailability.set(path, true);
      const summary = await parseCreditsResponse(res);
      if (summary) {
        return summary;
      }
    } catch (error) {
      if ((error as Error)?.name === "AbortError") {
        throw error;
      }
      continue;
    }
  }

  return createEmptyCreditSummary();
}

const CREDIT_MUTATION_TARGETS: Record<"deduct" | "add", readonly string[]> = {
  deduct: [
    "/api/nex/me/credits/deduct",
    "/api/nex/me/credits/consume",
  ],
  add: [
    "/api/nex/me/credits/refund",
    "/api/nex/me/credits/add",
  ],
};

const postCreditMutation = async (
  type: "deduct" | "add",
  payload: { userId: string; amount: number },
): Promise<CreditSummary | null> => {
  const targets = CREDIT_MUTATION_TARGETS[type];

  for (const endpoint of targets) {
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        if (res.status >= 500) {
          continue;
        }
        const errorPayload = await res.json().catch(() => undefined);
        const message =
          typeof errorPayload === "object" && errorPayload && "error" in errorPayload
            ? String((errorPayload as Record<string, UntypedJson>).error)
            : res.statusText || "Credit operation failed";
        throw new Error(message);
      }

      const summary = await parseCreditsResponse(res);
      if (summary) {
        return summary;
      }
      return null;
    } catch (error) {
      if ((error as Error)?.name === "AbortError") {
        throw error;
      }
      if (!(error instanceof Error)) {
        continue;
      }
      if (targets.indexOf(endpoint) === targets.length - 1) {
        throw error;
      }
    }
  }

  return null;
};

export async function deductCreditsRemote(userId: string, amount: number): Promise<CreditSummary | null> {
  return postCreditMutation("deduct", { userId, amount });
}

export async function addCreditsRemote(userId: string, amount: number): Promise<CreditSummary | null> {
  return postCreditMutation("add", { userId, amount });
}

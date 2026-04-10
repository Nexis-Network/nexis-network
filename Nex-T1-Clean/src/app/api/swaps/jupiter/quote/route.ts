import { connection, NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getJupiterQuote } from "@/server/services/jupiter/client";

const querySchema = z.object({
  inputMint: z.string().min(32, "Invalid input mint"),
  outputMint: z.string().min(32, "Invalid output mint"),
  amount: z.string().regex(/^\d+$/, "Amount must be base-unit integer string"),
  slippageBps: z.coerce.number().int().min(0).max(10000).optional().default(50),
  swapMode: z.enum(["ExactIn", "ExactOut"]).optional(),
});

export async function GET(request: NextRequest) {
  await connection();
  const params = Object.fromEntries(request.nextUrl.searchParams);
  const parsed = querySchema.safeParse(params);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: { message: parsed.error.issues[0]?.message ?? "Invalid parameters" } },
      { status: 400 },
    );
  }

  try {
    const quote = await getJupiterQuote({
      inputMint: parsed.data.inputMint,
      outputMint: parsed.data.outputMint,
      amount: parsed.data.amount,
      slippageBps: parsed.data.slippageBps,
      swapMode: parsed.data.swapMode,
    });

    return NextResponse.json({ success: true, data: quote });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Jupiter quote failed";
    return NextResponse.json(
      { success: false, error: { message } },
      { status: 502 },
    );
  }
}

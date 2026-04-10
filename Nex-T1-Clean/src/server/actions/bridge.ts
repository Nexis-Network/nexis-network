"use server";

export async function getLiFiQuoteAction(params: {
  fromChain: string; // Chain ID or Key (Li.Fi uses ID e.g. 1, 137)
  toChain: string;
  fromToken: string;
  toToken: string;
  fromAmount: string;
  fromAddress: string;
}) {
  const url = new URL("https://li.quest/v1/quote");
  url.searchParams.append("fromChain", params.fromChain);
  url.searchParams.append("toChain", params.toChain);
  url.searchParams.append("fromToken", params.fromToken);
  url.searchParams.append("toToken", params.toToken);
  url.searchParams.append("fromAmount", params.fromAmount);
  url.searchParams.append("fromAddress", params.fromAddress);

  try {
    const res = await fetch(url.toString(), {
      method: "GET",
      headers: {
        "Accept": "application/json"
      }
    });

    if (!res.ok) {
        const errorText = await res.text();
        return { success: false, error: `Li.Fi Error: ${res.status} - ${errorText}` };
    }

    const data = await res.json();
    return { success: true, data };

  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Bridge quote failed" };
  }
}

export async function getLiFiChainsAction() {
  try {
      const res = await fetch("https://li.quest/v1/chains");
      const data = await res.json();
      return { success: true, data: data.chains };
  } catch {
      return { success: false, error: "Failed to fetch chains" };
  }
}

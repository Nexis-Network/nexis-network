import { listDeveloperBillingPlans } from "@/server/services/developer-api/plan-registry";
import { listPublicProducts } from "@/server/services/developer-api/product-registry";

import { publicJsonResponse } from "@/app/api/v1/_shared/public-api-response";

export async function GET() {
  return publicJsonResponse({
    data: listPublicProducts().map((product) => ({
      id: product.id,
      label: product.label,
      summary: product.summary,
      upstreamModel: product.upstreamModel,
      minimumCredits: product.minimumCredits,
      toolBaseline: product.toolBaseline,
      endpoint: product.docs.aliasEndpoint,
    })),
    plans: listDeveloperBillingPlans(),
  });
}

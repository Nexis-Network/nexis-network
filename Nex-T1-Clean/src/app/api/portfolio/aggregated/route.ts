import { apiResponse } from "@/lib/api-platform";
import { withAuth } from "@/server/security/with-auth";
import { PortfolioService } from "@/server/services/portfolio-service";


export async function GET(request: Request) {
  const auth = await withAuth(request);
  if (!auth.ok) {
    return auth.response;
  }
  if (!auth.session) {
    return apiResponse.unauthorized();
  }

  try {
    const portfolio = await PortfolioService.getAggregatedPortfolio(auth.session.user.id);
    return apiResponse.success(portfolio);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch aggregated portfolio";
    return apiResponse.error("PORTFOLIO_FETCH_FAILED", message, 500);
  }
}

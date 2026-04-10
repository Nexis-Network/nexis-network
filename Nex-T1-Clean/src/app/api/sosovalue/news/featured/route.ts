import { connection } from "next/server";

import { z } from "zod";
import { apiResponse } from "@/lib/api-platform";

import { getSosovalueFeaturedNews, SosovalueApiError, SosovalueHttpError } from "@/server/market/sosovalue";


const querySchema = z.object({
  pageNum: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
  categoryList: z.string().trim().optional(),
});

export async function GET(req: Request) {
  await connection();
  const url = new URL(req.url);
  const parsed = querySchema.safeParse(Object.fromEntries(url.searchParams.entries()));

  if (!parsed.success) {
    return apiResponse.validationError(parsed.error);
  }

  try {
    const result = await getSosovalueFeaturedNews(parsed.data);
    const response = apiResponse.success({ success: true, data: result });
    response.headers.set("Cache-Control", "public, s-maxage=120, stale-while-revalidate=120");
    return response;
  } catch (error) {
    const status =
      error instanceof SosovalueHttpError
        ? error.status
        : error instanceof SosovalueApiError
          ? 502
          : 500;
    const message = error instanceof Error ? error.message : "Unable to load SoSoValue featured news";
    return apiResponse.error("SOSOVALUE_ERROR", message, status);
  }
}



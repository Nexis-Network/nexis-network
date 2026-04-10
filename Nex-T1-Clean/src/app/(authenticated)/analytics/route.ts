import { NextResponse } from "next/server";

// Some analytics beacons post directly to /analytics.
// Return a fast no-content response so these requests do not trigger 404 rendering.
export async function GET() {
  return new NextResponse(null, { status: 204 });
}

export async function POST() {
  return new NextResponse(null, { status: 204 });
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      Allow: "GET, POST, OPTIONS",
    },
  });
}

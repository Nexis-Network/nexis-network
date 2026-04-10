import { apiResponse } from "@/lib/api-platform";
import { withAuth } from "@/server/security/with-auth";


export async function GET(request: Request) {
  // Check auth but don't require it strictly - return null user if unauthed
  // The extension uses this to probe session validity
  const auth = await withAuth(request, { allowPublic: true });

  const session = auth.ok ? auth.session : null;
  if (!session?.user) {
    return apiResponse.success({ authenticated: false, user: null });
  }

  return apiResponse.success({
    authenticated: true,
    user: {
      id: session.user.id,
      email: session.user.email,
    },
  });
}

export async function POST(request: Request) {
    // For now, duplicate GET behavior or handle specific session actions
    return GET(request);
}

// Canonical proxy entrypoint – delegates to src/proxy for nonce/CSP + unified matcher
export { proxy as middleware } from "./src/proxy-handler";

// Config must be defined directly here (not re-exported) for Next.js static analysis
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

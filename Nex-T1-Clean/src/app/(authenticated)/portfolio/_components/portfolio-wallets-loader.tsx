import { resolveUserWallets } from "@/server/wallets/user-wallets";
import { PortfolioContent } from "@/app/(authenticated)/portfolio/_components/portfolio-content";

export async function PortfolioWalletsLoader({ userId }: { userId: string }) {
  // Database lookup is intentionally delayed here inside the specific component 
  // boundary so the Next.js outer shell can TTFB immediately.
  const wallets = await resolveUserWallets(userId);
  
  return (
    <PortfolioContent 
      wallets={wallets} 
      snapshots={[]} 
      // snapshots will be handled by a hook later if needed, or kept for historical pnl
    />
  );
}

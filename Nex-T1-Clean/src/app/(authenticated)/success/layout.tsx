// export const metadata = {
//   title: "Stripe Subscription",
//   description: "A modern subscription system with Stripe integration",
// };

// export default function RootLayout({ children }: { children: React.ReactNode }) {
//   return (
//     <html lang="en">
//       <body>
//         {children}
//         <Toaster />
//       </body>
//     </html>
//   );
// }

// import { TooltipProvider } from "@/registry/ui/tooltip";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { fontVariablesClassName } from "@/lib/fonts";

export const metadata = {
  title: "Stripe Subscription",
  description: "A modern subscription system with Stripe integration",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body
        className={cn(
          "flex min-h-svh flex-col antialiased font-sans",
          fontVariablesClassName
        )}
      >
        <div vaul-drawer-wrapper="">
          <div className="relative flex min-h-svh flex-col bg-background">
            {children}
          </div>
        </div>
      </body>
    </html>
  );
}

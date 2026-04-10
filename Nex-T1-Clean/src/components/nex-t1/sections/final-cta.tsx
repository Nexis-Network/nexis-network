import Link from "next/link"
import { APP_DASHBOARD_PATH, buildAuthSignInUrl } from "@/lib/constants"
import { cn } from "@/lib/utils"

export function FinalCTA() {
  const loginUrl = buildAuthSignInUrl({ redirectTo: APP_DASHBOARD_PATH })

  return (
    <section className="py-32 bg-[#08080a] border-t border-neutral-900">
      <div className="container px-6 mx-auto max-w-4xl text-center">
        <h2 className="text-4xl sm:text-5xl lg:text-6xl font-medium tracking-tight text-white mb-8">
          Ready to deploy?
        </h2>
        <p className="text-xl text-neutral-400 font-light mb-12 max-w-2xl mx-auto">
          Join thousands of developers automating their DeFi operations with Nex-T1.
        </p>
        
        <div className="flex flex-col sm:flex-row justify-center gap-4">
           <Link
              href={loginUrl}
              className={cn(
                "inline-flex items-center justify-center rounded-full px-8 h-12 text-sm font-medium transition-colors",
                "bg-white text-black hover:bg-neutral-200"
              )}
            >
              Start Co-Pilot
            </Link>
            <Link
              href="https://docs.nex-t1.ai"
              className={cn(
                "inline-flex items-center justify-center rounded-full px-8 h-12 text-sm font-medium transition-colors",
                "bg-transparent border border-neutral-800 text-white hover:bg-neutral-900 hover:border-neutral-700"
              )}
            >
              Read Docs
            </Link>
        </div>
      </div>
    </section>
  )
}

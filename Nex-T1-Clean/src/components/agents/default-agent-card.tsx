import Image from "next/image";
import Link from "next/link";

import { AgentOrbScene } from "@/components/agents/agent-orb-scene";
import { cn } from "@/lib/utils";

const CARD_SCALE = 0.6;
const scalePx = (value: number) => `${Math.round(value * CARD_SCALE * 100) / 100}px`;

type DefaultAgentCardProps = {
  id: string;
  name: string;
  profitLossLabel: string;
  chainIconSrc: string;
  chainLabel?: string;
  className?: string;
};

export function DefaultAgentCard({
  id,
  name,
  profitLossLabel,
  chainIconSrc,
  chainLabel = "Agent chain",
  className,
}: DefaultAgentCardProps) {
  return (
    <Link href={`/agents/${id}`} className={cn("group block h-full w-full", className)} prefetch>
      <article
        className="relative isolate h-full w-full overflow-hidden transition-transform duration-200 group-hover:-translate-y-0.5"
        style={{
          aspectRatio: "836 / 1028",
          minHeight: 192,
          borderRadius: scalePx(44),
          background: "#202125",
          boxShadow:
            "inset 0 1px 0 rgba(255,255,255,0.05), 0 14px 28px -16px rgba(0,0,0,0.95)",
        }}
      >
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(118% 96% at 58% -6%, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0) 56%), linear-gradient(180deg, rgba(255,255,255,0.01) 0%, rgba(255,255,255,0) 32%)",
          }}
        />
        <div
          aria-hidden="true"
          className="absolute rounded-full"
          style={{
            left: "50%",
            top: scalePx(58),
            width: scalePx(640),
            height: scalePx(640),
            transform: "translateX(-50%)",
            background: "#2c2f35",
          }}
        />
        <div
          aria-hidden="true"
          className="absolute rounded-full"
          style={{
            left: "50%",
            top: scalePx(103),
            width: scalePx(570),
            height: scalePx(570),
            transform: "translateX(-50%)",
            background: "#05060d",
            boxShadow: `0 ${scalePx(11)} 0 rgba(0,0,0,0.4)`,
          }}
        />
        <div
          aria-hidden="true"
          className="absolute overflow-hidden rounded-full"
          style={{
            left: "50%",
            top: scalePx(112),
            width: scalePx(552),
            height: scalePx(552),
            transform: "translateX(-50%)",
            border: "1px solid rgba(63,61,122,0.55)",
            background: "#0a0b16",
            boxShadow: `inset 0 0 ${scalePx(38)} rgba(0,0,0,0.4)`,
            pointerEvents: "none",
          }}
        >
          <div className="absolute inset-0">
            <AgentOrbScene />
          </div>
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(circle at 66% 62%, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0) 38%), radial-gradient(circle at 38% 36%, rgba(16,18,40,0.4) 0%, rgba(16,18,40,0) 44%)",
            }}
          />
        </div>
        <div
          aria-hidden="true"
          className="absolute rounded-full"
          style={{
            left: "50%",
            top: scalePx(140),
            width: scalePx(548),
            height: scalePx(548),
            transform: "translateX(-50%)",
            boxShadow: `0 ${scalePx(34)} 0 rgba(0,0,0,0.46)`,
          }}
        />

        <div
          className="absolute"
          style={{
            left: scalePx(66),
            bottom: scalePx(118),
          }}
        >
          <h3
            className="truncate font-semibold"
            style={{
              maxWidth: scalePx(350),
              color: "#e7e5f6",
              fontSize: scalePx(54),
              lineHeight: 0.94,
              letterSpacing: "-0.014em",
              textShadow: "0 1px 0 rgba(0,0,0,0.22)",
            }}
          >
            {name}
          </h3>
          <p
            className="font-medium"
            style={{
              color: "#626675",
              fontSize: scalePx(30),
              lineHeight: 1,
              letterSpacing: "-0.008em",
              marginTop: scalePx(6),
            }}
          >
            {profitLossLabel}
          </p>
        </div>

        <div
          aria-hidden="true"
          className="absolute flex items-center justify-center rounded-full"
          style={{
            right: scalePx(54),
            bottom: scalePx(72),
            width: scalePx(140),
            height: scalePx(140),
            background: "#363a52",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08)",
          }}
        >
          <div
            className="relative overflow-hidden rounded-full"
            style={{ width: scalePx(72), height: scalePx(72) }}
          >
            <Image
              src={chainIconSrc}
              alt={chainLabel}
              fill
              sizes={scalePx(72)}
              className="object-contain"
            />
          </div>
        </div>
      </article>
    </Link>
  );
}

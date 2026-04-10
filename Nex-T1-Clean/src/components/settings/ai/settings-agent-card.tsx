import Image from "next/image";
import Link from "next/link";

import { AgentOrbScene } from "@/components/agents/agent-orb-scene";
import { cn } from "@/lib/utils";

const CARD_SCALE = 0.221;

const scalePx = (value: number) => `${Math.round(value * CARD_SCALE * 100) / 100}px`;

export const SETTINGS_AGENT_CARD_WIDTH = scalePx(836);
export const SETTINGS_AGENT_CARD_HEIGHT = scalePx(1028);
export const SETTINGS_AGENT_CARD_ORB_SIZE = scalePx(554);
export const SETTINGS_AGENT_CARD_BADGE_SIZE = scalePx(142);

type SettingsAgentCardProps = {
  id: string;
  name: string;
  subtitle: string;
  badgeIconSrc: string;
  badgeIconLabel?: string;
  className?: string;
};

export function SettingsAgentCard({
  id,
  name,
  subtitle,
  badgeIconSrc,
  badgeIconLabel = "Agent badge",
  className,
}: SettingsAgentCardProps) {
  return (
    <Link
      href={`/agents/${id}`}
      className={cn("group block h-full w-full", className)}
      style={{ width: SETTINGS_AGENT_CARD_WIDTH, maxWidth: "100%" }}
      prefetch
    >
      <article
        data-testid="settings-agent-card"
        className="relative isolate h-full w-full overflow-hidden"
        style={{
          minHeight: SETTINGS_AGENT_CARD_HEIGHT,
          aspectRatio: "836 / 1028",
          borderRadius: scalePx(44),
          border: "1px solid rgba(241,241,255,0.08)",
          background: "#1c1c1d",
          boxShadow: "0 24px 54px -34px rgba(0,0,0,0.98)",
        }}
      >
        <div
          aria-hidden="true"
          className="absolute rounded-full"
          style={{
            left: "50%",
            top: scalePx(56),
            width: scalePx(644),
            height: scalePx(644),
            transform: "translateX(-50%)",
            background: "#242426",
          }}
        />

        <div
          aria-hidden="true"
          className="absolute rounded-full"
          style={{
            left: "50%",
            top: scalePx(102),
            width: scalePx(578),
            height: scalePx(578),
            transform: "translateX(-50%)",
            background: "#0f0f10",
            boxShadow: `0 ${scalePx(16)} ${scalePx(26)} rgba(0,0,0,0.6)`,
          }}
        />

        <div
          data-testid="settings-agent-card-orb-frame"
          aria-hidden="true"
          className="absolute overflow-hidden rounded-full"
          style={{
            left: "50%",
            top: scalePx(111),
            width: SETTINGS_AGENT_CARD_ORB_SIZE,
            height: SETTINGS_AGENT_CARD_ORB_SIZE,
            transform: "translateX(-50%)",
            border: "1px solid rgba(241,241,255,0.12)",
            background: "#111214",
            boxShadow: `inset 0 0 ${scalePx(36)} rgba(0,0,0,0.42)`,
          }}
        >
          <div
            className="absolute inset-0"
            style={{
              transform: "scale(1.16)",
              transformOrigin: "center",
            }}
          >
            <AgentOrbScene />
          </div>
          <div
            className="absolute inset-0 bg-[rgba(15,15,16,0.18)]"
          />
        </div>

        <div
          aria-hidden="true"
          className="absolute rounded-full"
          style={{
            left: "50%",
            top: scalePx(140),
            width: SETTINGS_AGENT_CARD_ORB_SIZE,
            height: SETTINGS_AGENT_CARD_ORB_SIZE,
            transform: "translateX(-50%)",
            boxShadow: `0 ${scalePx(38)} ${scalePx(16)} rgba(0,0,0,0.52)`,
          }}
        />

        <div
          className="absolute"
          style={{
            left: scalePx(68),
            bottom: scalePx(114),
          }}
        >
          <h3
            className="max-w-[15ch] text-pretty font-semibold text-white"
            style={{
              fontSize: scalePx(54),
              lineHeight: 0.94,
              letterSpacing: "-0.04em",
            }}
          >
            {name}
          </h3>
          <p
            className="max-w-[18ch] truncate font-medium text-[#8a8c95]"
            style={{
              marginTop: scalePx(10),
              fontSize: scalePx(30),
              lineHeight: 1,
              letterSpacing: "-0.02em",
            }}
          >
            {subtitle}
          </p>
        </div>

        <div
          data-testid="settings-agent-card-badge"
          aria-hidden="true"
          className="absolute flex items-center justify-center rounded-full"
          style={{
            right: scalePx(54),
            bottom: scalePx(72),
            width: SETTINGS_AGENT_CARD_BADGE_SIZE,
            height: SETTINGS_AGENT_CARD_BADGE_SIZE,
            background: "#242426",
            boxShadow: "0 16px 28px -18px rgba(0,0,0,0.9)",
          }}
        >
          <div
            className="relative flex items-center justify-center overflow-hidden rounded-full"
            style={{
              width: scalePx(74),
              height: scalePx(74),
              background: "#0f0f10",
            }}
          >
            <Image
              src={badgeIconSrc}
              alt={badgeIconLabel}
              fill
              sizes={scalePx(74)}
              className="object-contain"
            />
          </div>
        </div>
      </article>
    </Link>
  );
}

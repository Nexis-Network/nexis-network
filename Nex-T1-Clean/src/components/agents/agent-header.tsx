import { Copy, Eraser, MoreVertical } from "lucide-react";
import { motion } from "motion/react";
import type { SVGProps } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useMediaQuery } from "@/hooks/ui";
import { EASE_CUSTOM_OUT } from "@/lib/animations";
import type { AgentType } from "@/lib/types";

interface AgentHeaderProps {
  selectedAgent: string;
  onAgentChange: (agentId: string) => void;
  onCopyInput: () => void;
  onClearInput: () => void;
  hasInput: boolean;
  agentTypes: AgentType[];
}

export function AgentHeader({
  selectedAgent,
  onAgentChange,
  onCopyInput,
  onClearInput,
  hasInput,
  agentTypes,
}: AgentHeaderProps) {
  const isMobile = useMediaQuery("(max-width: 768px)");

  return (
    <motion.header className="flex items-center justify-between gap-4 border-b bg-white p-4">
      <div className="flex items-center gap-2">
        <div className="hidden rounded-full bg-white p-1 lg:block">
          <VercelIcon className="size-4 stroke-black" />
        </div>
        <span className="hidden text-[#D4D4D8] text-xs lg:block">/</span>
        <h1 className="inline-flex items-center gap-1 font-bold text-xs tracking-tight">
          <span className="hidden lg:block">AI</span>
          <span className="hidden lg:block">SDK</span>
          <span className="hidden px-1 text-[#D4D4D8] text-xs lg:block">/</span>
          <div className="relative rounded-full bg-blue-600 px-1.5 py-0.5 font-medium text-white shadow-[0_1px_2px_rgba(0,0,0,0.15),_inset_0_1px_0.5px_rgba(255,255,255,0.2),_0_-0.5px_1px_rgba(0,0,0,0.08)_inset,_0_0_0_1px_rgba(0,0,0,0.08)_inset]">
            <span className="relative z-10">Agents</span>
          </div>
        </h1>
      </div>
      {isMobile ? (
        <Select onValueChange={onAgentChange} value={selectedAgent}>
          <SelectTrigger className="w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {agentTypes.map((agent) => (
              <SelectItem key={agent.id} value={agent.id}>
                <motion.div
                  className="flex items-center gap-2"
                  initial={{ scale: 1 }}
                  whileHover={{
                    scale: 1.015,
                    transition: { duration: 0.15, ease: EASE_CUSTOM_OUT },
                  }}
                  whileTap={{
                    scale: 0.985,
                    transition: { duration: 0.1, ease: EASE_CUSTOM_OUT },
                  }}
                >
                  <span className="font-medium">{agent.name}</span>
                </motion.div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <div className="flex items-center gap-1 rounded-full">
          {agentTypes.map((agent) => (
            <button
              className={`${
                selectedAgent === agent.id
                  ? "font-medium text-black"
                  : "text-black/80 hover:text-black/60"
              } relative rounded-full px-3 py-1.5 text-xs outline-sky-400 transition focus-visible:outline-2`}
              key={agent.id}
              onClick={() => onAgentChange(agent.id)}
              style={{
                WebkitTapHighlightColor: "transparent",
              }}
            >
              {selectedAgent === agent.id && (
                <motion.span
                  className="absolute inset-0 z-10 bg-neutral-950 mix-blend-difference "
                  layoutId="bubble"
                  style={{ borderRadius: 9999 }}
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}

              {agent.name}
            </button>
          ))}
        </div>
      )}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            className="h-8 w-8 p-0 md:h-9 md:w-9"
            size="sm"
            variant="ghost"
          >
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-[180px]">
          <DropdownMenuItem
            className="flex cursor-pointer items-center gap-2"
            disabled={!hasInput}
            onClick={onCopyInput}
          >
            <Copy className="h-4 w-4" />
            <span>Copy Input</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            className="flex cursor-pointer items-center gap-2"
            disabled={!hasInput}
            onClick={onClearInput}
          >
            <Eraser className="h-4 w-4" />
            <span>Clear Input</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </motion.header>
  );
}

export function VercelIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      height="222"
      preserveAspectRatio="xMidYMid"
      viewBox="0 0 256 222"
      width="256"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path d="m128 0 128 221.705H0z" fill="#000" />
    </svg>
  );
}

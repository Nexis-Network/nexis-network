"use client";
import React, { useRef, useEffect, useState, useId } from "react";
import { motion } from "motion/react";

export type TextHoverEffectRenderArgs = {
  variant: "base" | "highlight";
  gradientId: string;
  maskId: string;
  maskGradientId: string;
  hovered: boolean;
  id: string;
};

type TextHoverEffectProps = {
  text?: string;
  duration?: number;
  renderContent?: (args: TextHoverEffectRenderArgs) => React.ReactNode;
  viewBox?: string;
  className?: string;
} & Omit<React.ComponentPropsWithoutRef<"svg">, "viewBox">;

export const TextHoverEffect = ({
  text = "",
  duration,
  renderContent,
  viewBox = "0 0 300 100",
  className,
  ...svgProps
}: TextHoverEffectProps) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [cursor, setCursor] = useState({ x: 0, y: 0 });
  const [hovered, setHovered] = useState(false);
  const [maskPosition, setMaskPosition] = useState({ cx: "50%", cy: "50%" });
  const id = useId();
  const gradientId = `${id}-gradient`;
  const maskGradientId = `${id}-mask-gradient`;
  const maskId = `${id}-mask`;

  const {
    preserveAspectRatio,
    onMouseEnter: userOnMouseEnter,
    onMouseLeave: userOnMouseLeave,
    onMouseMove: userOnMouseMove,
    ...restSvgProps
  } = svgProps;

  useEffect(() => {
    if (svgRef.current && cursor.x !== null && cursor.y !== null) {
      const svgRect = svgRef.current.getBoundingClientRect();
      const cxPercentage = ((cursor.x - svgRect.left) / svgRect.width) * 100;
      const cyPercentage = ((cursor.y - svgRect.top) / svgRect.height) * 100;
      setMaskPosition({
        cx: `${cxPercentage}%`,
        cy: `${cyPercentage}%`,
      });
    }
  }, [cursor]);

  const handleMouseEnter = (event: React.MouseEvent<SVGSVGElement, MouseEvent>) => {
    setHovered(true);
    userOnMouseEnter?.(event);
  };

  const handleMouseLeave = (event: React.MouseEvent<SVGSVGElement, MouseEvent>) => {
    setHovered(false);
    userOnMouseLeave?.(event);
  };

  const handleMouseMove = (event: React.MouseEvent<SVGSVGElement, MouseEvent>) => {
    setCursor({ x: event.clientX, y: event.clientY });
    userOnMouseMove?.(event);
  };

  const gradientStops = (
    <>
      <stop offset="0%" stopColor="#eab308" stopOpacity={hovered ? 1 : 0} />
      <stop offset="25%" stopColor="#ef4444" stopOpacity={hovered ? 1 : 0} />
      <stop offset="50%" stopColor="#3b82f6" stopOpacity={hovered ? 1 : 0} />
      <stop offset="75%" stopColor="#06b6d4" stopOpacity={hovered ? 1 : 0} />
      <stop offset="100%" stopColor="#8b5cf6" stopOpacity={hovered ? 1 : 0} />
    </>
  );

  const baseContent = renderContent?.({
    variant: "base",
    gradientId,
    maskId,
    maskGradientId,
    hovered,
    id,
  });

  const highlightContent = renderContent?.({
    variant: "highlight",
    gradientId,
    maskId,
    maskGradientId,
    hovered,
    id,
  });

  const combinedClassName = ["select-none", className].filter(Boolean).join(" ");

  return (
    <svg
      ref={svgRef}
      width="100%"
      height="100%"
      viewBox={viewBox}
      xmlns="http://www.w3.org/2000/svg"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseMove={handleMouseMove}
      className={combinedClassName}
      preserveAspectRatio={preserveAspectRatio}
      {...restSvgProps}
    >
      <defs>
        <linearGradient id={gradientId} gradientUnits="userSpaceOnUse" cx="50%" cy="50%" r="25%">
          {gradientStops}
        </linearGradient>

        <motion.radialGradient
          id={maskGradientId}
          gradientUnits="userSpaceOnUse"
          r="20%"
          initial={{ cx: "50%", cy: "50%" }}
          animate={maskPosition}
          transition={{ duration: duration ?? 0, ease: "easeOut" }}

          // example for a smoother animation below

          //   transition={{
          //     type: "spring",
          //     stiffness: 300,
          //     damping: 50,
          //   }}
        >
          <stop offset="0%" stopColor="white" />
          <stop offset="100%" stopColor="black" />
        </motion.radialGradient>
        <mask id={maskId}>
          <rect x="0" y="0" width="100%" height="100%" fill={`url(#${maskGradientId})`} />
        </mask>
      </defs>
      {renderContent ? (
        <>
          {baseContent}
          {highlightContent}
        </>
      ) : (
        <>
          <text
            x="50%"
            y="50%"
            textAnchor="middle"
            dominantBaseline="middle"
            strokeWidth="0.3"
            className="fill-transparent stroke-neutral-200 font-sans text-7xl font-bold dark:stroke-neutral-800"
            style={{ opacity: hovered ? 0.7 : 0 }}
          >
            {text}
          </text>
          <motion.text
            x="50%"
            y="50%"
            textAnchor="middle"
            dominantBaseline="middle"
            strokeWidth="0.3"
            className="fill-transparent stroke-neutral-200 font-sans text-7xl font-bold dark:stroke-neutral-800"
            initial={{ strokeDashoffset: 1000, strokeDasharray: 1000 }}
            animate={{
              strokeDashoffset: 0,
              strokeDasharray: 1000,
            }}
            transition={{
              duration: 4,
              ease: "easeInOut",
            }}
          >
            {text}
          </motion.text>
          <text
            x="50%"
            y="50%"
            textAnchor="middle"
            dominantBaseline="middle"
            stroke={`url(#${gradientId})`}
            strokeWidth="0.3"
            mask={`url(#${maskId})`}
            className="fill-transparent font-sans text-7xl font-bold"
          >
            {text}
          </text>
        </>
      )}
    </svg>
  );
};

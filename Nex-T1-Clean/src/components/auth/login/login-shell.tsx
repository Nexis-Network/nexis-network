"use client";

import { ReactNode } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";

import { useTranslations } from "@/components/providers/locale-provider";
import type { Step } from "@/components/auth/login/types";

export type LoginShellProps = {
  step: Step;
  header: {
    title: string;
    secondaryLabel: string;
    primaryLabel: string;
  };
  children: ReactNode;
};

export function LoginShell({ step, header, children }: LoginShellProps) {
  const t = useTranslations("auth");

  return (
    <div className="w-full max-w-md">
      <div className="p-6 text-foreground">
        <AnimatePresence initial={false} mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25, ease: [0.25, 1, 0.5, 1] }}
          >
            <div className="flex w-full flex-col gap-10">
              <div className="flex flex-col gap-1">
                <h1 className="font-sans text-[28px] font-medium leading-[39px] tracking-[-0.16px] text-foreground">
                  {header.primaryLabel}
                </h1>
                {header.secondaryLabel && (
                  <p className="font-sans text-[14px] font-normal leading-[22px] tracking-[-0.16px] text-muted-foreground">
                    {header.secondaryLabel}
                  </p>
                )}
              </div>
              {children}

              <div className="relative mt-auto flex h-[44px] w-full flex-col items-center justify-center">
                <p className="text-center font-sans text-[14px] font-normal leading-[22px] tracking-[-0.16px] text-muted-foreground">
                  {t("legal.byContinuing")}
                </p>
                <p className="flex items-center justify-center gap-1 text-center font-sans text-[14px] font-normal leading-[22px] tracking-[-0.16px] text-muted-foreground">
                  {t("legal.agreeToOur")}{" "}
                  <Link href="/terms" className="text-foreground underline underline-offset-4">
                    {t("legal.termsOfService")}
                  </Link>
                  .
                </p>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

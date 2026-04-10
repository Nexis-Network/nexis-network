"use client";

import { useTranslations } from "@/components/providers/locale-provider";
import { getDashboardFooterCopy } from "@/modules/app/i18n";

import { FooterDivider } from "./footer-divider";

export function FooterLegalLinks({ linkClassName }: { linkClassName: string }) {
  const t = useTranslations("app");
  const copy = getDashboardFooterCopy(t);

  return (
    <>
      <a href="/terms" className={linkClassName}>
        {copy.legal.terms}
      </a>
      <FooterDivider />
      <a href="/privacy" className={linkClassName}>
        {copy.legal.privacy}
      </a>
      <FooterDivider />
      <a href="/changelog" className={linkClassName}>
        {copy.legal.changelog}
      </a>
      <FooterDivider />
      <a href="https://docs.nex-t1.ai" target="_blank" rel="noopener noreferrer" className={linkClassName}>
        {copy.legal.docs}
      </a>
      <FooterDivider />
      <a href="https://portal.nex-t1.ai" target="_blank" rel="noopener noreferrer" className={linkClassName}>
        {copy.legal.portal}
      </a>
    </>
  );
}

"use client";

import type { ReactNode } from "react";

import type { MagicLinkStatusCopy } from "@/lib/auth/magic-link";
import type { TranslationValues } from "@/i18n/translate";

import {
  authEntryMagicLinkButtonClassName,
  authEntryMagicLinkConsentLabelClassName,
  authEntryMagicLinkDetailClassName,
  authEntryMagicLinkHeadlineClassName,
  authEntryMagicLinkPanelClassName,
} from "./entry-step-classes";

type Translator = (key: string, values?: TranslationValues) => string;

type EntryStepMagicLinkPanelProps = {
  t: Translator;
  status: MagicLinkStatusCopy;
  hasAcceptedPolicies?: boolean;
  onHasAcceptedPoliciesChange?: (value: boolean) => void;
  onBegin?: () => void;
};

export function EntryStepMagicLinkPanel({
  t,
  status,
  hasAcceptedPolicies,
  onHasAcceptedPoliciesChange,
  onBegin,
}: EntryStepMagicLinkPanelProps): ReactNode {
  return (
    <div className={authEntryMagicLinkPanelClassName}>
      <p className={authEntryMagicLinkHeadlineClassName}>{status.headline}</p>
      {status.detail ? <p className={authEntryMagicLinkDetailClassName}>{status.detail}</p> : null}
      <div className="mt-2 flex items-center gap-2">
        <button
          type="button"
          disabled={status.ctaDisabled}
          onClick={() => onBegin?.()}
          className={authEntryMagicLinkButtonClassName}
        >
          {status.ctaLabel}
        </button>
        {hasAcceptedPolicies === false && onHasAcceptedPoliciesChange ? (
          <label className={authEntryMagicLinkConsentLabelClassName}>
            <input
              type="checkbox"
              checked={hasAcceptedPolicies}
              onChange={(event) => onHasAcceptedPoliciesChange?.(event.target.checked)}
            />
            {t("legal.agreeToPolicies")}
          </label>
        ) : null}
      </div>
    </div>
  );
}

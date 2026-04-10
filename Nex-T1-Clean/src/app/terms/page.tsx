import type { Metadata } from "next";
import Link from "next/link";

import { getRequestI18n } from "@/i18n/server";
import { getLocalizedLegalSectionTitles } from "@/lib/legal/section-titles";

const sections = [
  {
    title: "1. Agreement to Terms",
    body: [
      "These Terms of Service (the \"Terms\") govern your access to and use of the Nex-T1 AI platform, applications, dashboards, APIs, and related services (collectively, the \"Services\"). By accessing or using the Services on or after October 12, 2025, you acknowledge that you have read, understood, and agree to be bound by these Terms and our Privacy Policy.",
      "If you are using the Services on behalf of an organization, you represent that you have authority to bind that organization, and the term \"you\" will refer to both you and that organization."
    ],
  },
  {
    title: "2. Eligibility and Registration",
    body: [
      "You must be at least 18 years old and able to form a legally binding contract to use the Services. You agree to provide accurate, current, and complete information during registration and to keep it updated. We may require identity verification where required by applicable law or risk controls.",
      "User registration is contingent on acknowledging the regulatory notices surfaced during account creation, including acceptance of these Terms, the Privacy Policy, and the Legal & Compliance notice."
    ],
  },
  {
    title: "3. Account Security",
    body: [
      "You are responsible for safeguarding the credentials used to access the Services. Nex-T1 AI is a non-custodial platform; we never take possession of your digital assets, wallets, or private keys. You are solely responsible for securing your wallets, seed phrases, and any transaction approvals executed through external protocols or blockchains.",
      "You agree to promptly notify us of any unauthorized access or suspected compromise of your account."
    ],
  },
  {
    title: "4. Acceptable Use",
    body: [
      "You will use the Services only for lawful purposes and in compliance with all applicable laws, regulations, sanctions programs, and self-regulatory obligations. You will not use the Services to facilitate money laundering, terrorist financing, market manipulation, fraud, or to support activities that violate export controls or trade restrictions.",
      "You agree not to interfere with or disrupt the integrity or performance of the Services, attempt to bypass security controls, or harvest data from other users without authorization."
    ],
  },
  {
    title: "5. Regulatory Compliance and Geographic Restrictions",
    body: [
      "You are responsible for determining whether a particular use of the Services is permitted in your jurisdiction. We may restrict or terminate access for individuals or entities located in embargoed regions or subject to sanctions. You agree not to use VPNs, proxies, or other technical means to circumvent regional restrictions or compliance safeguards we implement.",
      "We reserve the right to request additional information or documentation to fulfill our compliance obligations, and to suspend Services where necessary to investigate or comply with legal requests."
    ],
  },
  {
    title: "6. Service Availability and Updates",
    body: [
      "We continually enhance the Services, which may result in modifications, feature changes, or temporary interruptions. We may suspend or discontinue portions of the Services at any time. Where feasible, we will provide reasonable advance notice of material changes that negatively impact a core feature.",
      "Beta or experimental features may be offered with additional terms or usage limitations. Continued use after changes take effect constitutes acceptance of the updated Terms."
    ],
  },
  {
    title: "7. Intellectual Property",
    body: [
      "Nex-T1 AI and its licensors own all rights, title, and interest in and to the Services, including software, documentation, logos, and content, except for third-party materials clearly identified as such. Subject to your compliance with these Terms, we grant you a limited, non-exclusive, non-transferable, revocable license to access and use the Services for their intended purposes.",
      "You may provide feedback or suggestions. We may use feedback without restriction and without obligation to you."
    ],
  },
  {
    title: "8. Third-Party Integrations",
    body: [
      "The Services may reference or integrate protocols, exchanges, wallets, or data providers operated by third parties. We do not control and are not responsible for their content, security, or performance. Your interactions with those services are governed by their respective terms, and you assume the associated risks.",
      "We may disable or modify integrations that present legal, compliance, or security concerns without prior notice."
    ],
  },
  {
    title: "9. Disclaimers",
    body: [
      "TO THE MAXIMUM EXTENT PERMITTED BY LAW, THE SERVICES ARE PROVIDED \"AS IS\" AND \"AS AVAILABLE\" WITHOUT WARRANTIES OF ANY KIND, WHETHER EXPRESS, IMPLIED, OR STATUTORY. WE DISCLAIM ALL IMPLIED WARRANTIES, INCLUDING THOSE OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE, AND NON-INFRINGEMENT.",
      "Data outputs, analytics, projected outcomes, or AI-generated content are informational only and may be incomplete, delayed, or inaccurate. Blockchain data, market APIs, and third-party feeds may fail or produce errors without notice."
    ],
  },
  {
    title: "10. Financial Disclosures and No Advice",
    body: [
      "The Services provide analytical tooling and informational content only. Nex-T1 AI does not offer investment, legal, accounting, or tax advice. Nothing on the platform should be interpreted as an offer, solicitation, or recommendation to buy, sell, or hold any asset.",
      "You are solely responsible for evaluating the merits and risks associated with any asset or transaction and for seeking professional advice as needed."
    ],
  },
  {
    title: "11. Limitation of Liability",
    body: [
      "TO THE MAXIMUM EXTENT PERMITTED BY LAW, NEX-T1 AI, ITS AFFILIATES, DIRECTORS, EMPLOYEES, AND SERVICE PROVIDERS WILL NOT BE LIABLE FOR INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, EXEMPLARY, OR PUNITIVE DAMAGES, OR FOR ANY LOSS OF PROFITS, REVENUE, DATA, OR GOODWILL.",
      "Our aggregate liability arising out of or relating to the Services will not exceed the greater of (a) the amounts you paid to use the Services in the twelve (12) months preceding the claim, or (b) USD $100."
    ],
  },
  {
    title: "12. Indemnification",
    body: [
      "You agree to indemnify, defend, and hold harmless Nex-T1 AI and its affiliates from and against any claims, liabilities, damages, losses, and expenses (including reasonable attorneys' fees) arising out of or in any way connected with your access to or use of the Services, your violation of these Terms, or your infringement of any third-party rights."
    ],
  },
  {
    title: "13. Termination",
    body: [
      "We may suspend or terminate your access to the Services, or remove content or data, at any time if we reasonably believe you have violated these Terms, compromised security, or created legal exposure for the platform. You may terminate by closing your account and discontinuing use of the Services.",
      "Sections that by their nature should survive termination (including ownership, disclaimers, limitation of liability, indemnification, governing law, and dispute resolution) will remain in effect."
    ],
  },
  {
    title: "14. Governing Law and Dispute Resolution",
    body: [
      "These Terms will be governed by and construed in accordance with the laws of the State of Delaware, United States, without regard to conflict of laws principles. The United Nations Convention on Contracts for the International Sale of Goods does not apply.",
      "Any dispute arising out of or relating to the Services will be resolved through binding arbitration administered by the American Arbitration Association under its Commercial Arbitration Rules. The arbitration will take place in Wilmington, Delaware, unless the parties agree otherwise in writing."
    ],
  },
  {
    title: "15. Changes to These Terms",
    body: [
      "We may update these Terms from time to time. We will post the revised Terms with an updated \"Last Updated\" date and, when appropriate, provide additional notice. Continued access or use of the Services after the updated Terms become effective constitutes acceptance of the changes.",
      "If you do not agree to the revised Terms, you must stop using the Services."
    ],
  },
  {
    title: "16. Contact",
    body: [
      "For questions about these Terms or to report potential violations, contact us at compliance@nexis.network."
    ],
  },
  {
    title: "17. AI Agent Risks & Liability",
    body: [
      "Users leveraging AI agents on the Nexis Network explicitly acknowledge and agree that AI technology is experimental and evolving. AI agents may produce unpredictable results, errors, or unintended outcomes.",
      "Nexis Labs, Nex-T1, Nexis Network, its members, developers, and affiliates are strictly non-liable for any financial losses, trade execution errors, or legal repercussions resulting from the use of autonomous agents. You assume full responsibility for all actions triggered by your agents.",
      "You acknowledge that regulations regarding AI and DeFi are subject to change, and you are solely responsible for compliance with your local laws and country restrictions.",
    ],
  },
  {
    title: "18. NZT Token Utility Disclaimer",
    body: [
      "The NZT token is a utility token designed solely for use within the Nexis Network ecosystem. It does not represent equity, shares, ownership rights, or a security interest in Nexis Labs, Nex-T1, or any affiliated company.",
      "NZT is not an investment product and implies no expectation of profit. Its purpose is limited to governance, access, and network utility functions.",
    ],
  },
];

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getRequestI18n();

  return {
    title: t("legal.terms.metaTitle"),
    description: t("legal.terms.metaDescription"),
  };
}

export default async function TermsPage() {
  const { locale, t } = await getRequestI18n();
  const sectionTitles = getLocalizedLegalSectionTitles("terms", locale);

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex max-w-4xl flex-col gap-10 px-4 py-16 sm:px-6 lg:px-8">
        <header className="space-y-3">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">{t("legal.terms.eyebrow")}</p>
          <h1 className="text-3xl font-regular sm:text-4xl">{t("legal.terms.title")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("legal.terms.intro")}{" "}
            <Link href="/privacy" className="font-medium underline hover:text-foreground">{t("auth.legal.privacyPolicy")}</Link>
            {" "}{t("auth.legal.and")}{" "}
            <Link href="/legal-compliance" className="font-medium underline hover:text-foreground">{t("auth.legal.legalCompliance")}</Link>.
          </p>
        </header>

        <aside className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-50/90">
          <p className="font-medium">{t("legal.englishNoticeTitle")}</p>
          <p className="mt-1 text-amber-50/80">{t("legal.englishNoticeBody")}</p>
        </aside>

        <section className="space-y-8">
          {sections.map((section, index) => (
            <article key={`${index}-${section.title}`} className="space-y-3">
              <h2 className="text-xl font-regular">{sectionTitles[index] ?? section.title}</h2>
              {section.body.map((paragraph, index) => (
                <p key={index} className="text-sm leading-relaxed text-muted-foreground">
                  {paragraph}
                </p>
              ))}
            </article>
          ))}
        </section>

        <footer className="rounded-lg border border-border/60 bg-muted/20 p-6 text-sm text-muted-foreground">
          <p>{t("legal.terms.footer")}</p>
        </footer>
      </div>
    </main>
  );
}

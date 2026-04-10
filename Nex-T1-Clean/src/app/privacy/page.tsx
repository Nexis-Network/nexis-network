import type { Metadata } from "next";
import Link from "next/link";

import { getRequestI18n } from "@/i18n/server";
import { getLocalizedLegalSectionTitles } from "@/lib/legal/section-titles";

const sections = [
  {
    title: "1. Overview",
    body: [
      "This Privacy Policy explains how Nex-T1 AI (\"Nex-T1\", \"we\", \"us\") collects, uses, discloses, and protects personal data when you access our applications, dashboards, APIs, and related services (collectively, the \"Services\"). It applies to all processing activities conducted on or after October 12, 2025.",
      "Our objective is to deliver actionable intelligence for decentralized finance while upholding stringent privacy, security, and regulatory standards across the jurisdictions in which we operate."
    ],
  },
  {
    title: "2. Data We Collect",
    body: [
      "Account Data: email address, password hashes, multi-factor settings, and optional profile metadata submitted during onboarding.",
      "Usage Data: device identifiers, IP address, browser characteristics, page interactions, log files, and telemetry necessary to secure the platform and deliver core functionality.",
      "Blockchain Signals: wallet addresses you link, transaction metadata sourced from public ledgers, on-chain analytics we generate, and portfolio context you import. We do not request or store private keys or seed phrases.",
      "Support Records: communications with our support or compliance teams, including attachments or notes referencing regulatory requests."
    ],
  },
  {
    title: "3. How We Use Data",
    body: [
      "Operate, maintain, and improve the Services, including personalized agent recommendations and analytics.",
      "Authenticate users, detect fraud, enforce risk limits, and comply with sanctions, export control, and anti-money laundering obligations.",
      "Provide customer support, respond to inquiries, and deliver service and policy updates.",
      "Conduct research and product development using aggregated or de-identified datasets whenever feasible."
    ],
  },
  {
    title: "4. Legal Bases for Processing",
    body: [
      "We rely on multiple legal bases under GDPR and comparable frameworks: performance of a contract (account provision), legitimate interests (product security, usage analytics), compliance with legal obligations (financial-crime monitoring, sanctions screening), and consent where we rely on optional cookies or marketing communications."
    ],
  },
  {
    title: "5. Data Sharing and Transfers",
    body: [
      "We share data with vetted subprocessors that provide hosting, analytics, customer support, KYC/AML screening, or wallet infrastructure. Each partner is bound by contractual obligations to protect personal data and use it only for the contracted purpose.",
      "Where data is transferred outside the United States or the user's region, we implement appropriate safeguards, such as Standard Contractual Clauses, supplemental technical controls, and regional data residency commitments when required."
    ],
  },
  {
    title: "6. Retention",
    body: [
      "We retain personal data only for as long as necessary to fulfill the purposes described above, to meet legal or audit requirements, and to resolve disputes. Account data is retained for the duration of your relationship with us. Upon closure, we anonymize or delete personal data within 90 days unless longer retention is mandated by law." 
    ],
  },
  {
    title: "7. Security",
    body: [
      "We implement layered technical and organizational measures, including encryption in transit and at rest, network segmentation, continuous monitoring, and regular penetration testing. Access to customer data is restricted to authorized personnel under least-privilege principles.",
      "Because Nex-T1 is non-custodial, we never request your private keys or store assets on your behalf. Always verify signing prompts and maintain control of your own wallet security materials." 
    ],
  },
  {
    title: "8. Your Rights",
    body: [
      "Depending on your jurisdiction, you may have rights to access, correct, delete, or export your personal data, as well as object to or restrict certain processing. You can submit requests by contacting privacy@nexis.network with sufficient information for verification.",
      "Residents of California have additional rights under the CCPA/CPRA, including the right to opt out of certain data sharing and to limit the use of sensitive personal information." 
    ],
  },
  {
    title: "9. Cookies and Similar Technologies",
    body: [
      "We use strictly necessary cookies to maintain sessions and protect against fraud. With your consent, we may deploy analytics or performance cookies to understand feature usage. You may adjust cookie preferences through in-product controls or browser settings."
    ],
  },
  {
    title: "10. Children's Privacy",
    body: [
      "The Services are not directed to or intended for individuals under the age of 18. We do not knowingly collect personal data from children. If you believe a minor has provided data, contact us so we can delete it promptly." 
    ],
  },
  {
    title: "11. Regulatory Cooperation",
    body: [
      "We cooperate with lawful requests from regulators, law enforcement, and supervisory bodies. Disclosures may include log data, account metadata, or blockchain analytics necessary to fulfill subpoenas, court orders, or regulatory reporting. We resist overly broad requests and notify affected users when legally permitted." 
    ],
  },
  {
    title: "12. Updates",
    body: [
      "We may revise this Privacy Policy to reflect changes in law, technology, or our Services. We will post updates with a new \"Last Updated\" date and, when material, provide additional notice. Continued use of the Services after changes take effect signifies acceptance." 
    ],
  },
  {
    title: "13. Contact",
    body: [
      "For privacy inquiries, data subject requests, or questions about this Policy, contact privacy@nexis.network.",
      (
        <span key="legal-compliance-link">
          You may also review our {" "}
          <Link href="/legal-compliance" className="font-medium underline hover:text-foreground">
            Legal &amp; Compliance Notice
          </Link>{" "}
          for detail on governance, certifications, and reporting lines.
        </span>
      ),
    ],
  },
];

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getRequestI18n();

  return {
    title: t("legal.privacy.metaTitle"),
    description: t("legal.privacy.metaDescription"),
  };
}

export default async function PrivacyPage() {
  const { locale, t } = await getRequestI18n();
  const sectionTitles = getLocalizedLegalSectionTitles("privacy", locale);

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex max-w-4xl flex-col gap-10 px-4 py-16 sm:px-6 lg:px-8">
        <header className="space-y-3">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">{t("legal.privacy.eyebrow")}</p>
          <h1 className="text-3xl font-regular sm:text-4xl">{t("legal.privacy.title")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("legal.privacy.intro")}{" "}
            <Link href="/terms" className="font-medium underline hover:text-foreground">{t("auth.legal.termsOfService")}</Link>
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
          <p>{t("legal.privacy.footer")}</p>
        </footer>
      </div>
    </main>
  );
}

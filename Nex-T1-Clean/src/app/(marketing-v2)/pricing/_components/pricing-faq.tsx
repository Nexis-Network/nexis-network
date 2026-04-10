"use client";

import { useMemo, useState } from "react";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const faqGroups = [
  {
    name: "Implementation",
    items: [
      {
        id: "implementation-1",
        question: "How long does it take to deploy Nex-T1 in production?",
        answer:
          "Launch tier projects typically go live the same day. Scale and Sovereign programs include architecture reviews, RLS hardening, and change-control rehearsals that range from 2-6 weeks depending on your compliance posture.",
      },
      {
        id: "implementation-2",
        question: "Can we host Nex-T1 inside our own cloud?",
        answer:
          "Yes. Sovereign customers can deploy Nex-T1 into private VPCs with hardened Supabase, Redis, and LangGraph clusters. We support AWS, GCP, and on-prem environments via phala TEE attestations.",
      },
    ],
  },
  {
    name: "Security & compliance",
    items: [
      {
        id: "security-1",
        question: "Do you support dual-control and maker-checker approvals?",
        answer:
          "Scale and Sovereign plans ship with multi-stage approval workflows, policy versioning, and live diffing so operators can verify every transaction before signing. These controls wire into your custody stack or Nexis-managed MPC wallets.",
      },
      {
        id: "security-2",
        question: "What certifications are available?",
        answer:
          "We maintain SOC 2 Type II readiness and provide penetration test summaries, threat models, and data flow diagrams. Sovereign programs can inherit Nexis controls into their own audits via shared responsibility matrices.",
      },
    ],
  },
  {
    name: "Support",
    items: [
      {
        id: "support-1",
        question: "What does onboarding include?",
        answer:
          "Every paid deployment includes a dedicated solutions architect, LangSmith workspace configuration, and migration playbooks to move bots from spreadsheets or scripts into Nex-T1 approvals.",
      },
      {
        id: "support-2",
        question: "Can Nexis integrate with our incident tooling?",
        answer:
          "Yes. We stream structured events into PagerDuty, Opsgenie, or Slack, plus expose webhooks for custom SIEM ingestion so your team has real-time visibility into agent behavior.",
      },
    ],
  },
];

export function PricingFaq() {
  const [activeGroup, setActiveGroup] = useState(faqGroups[0]?.name ?? "");
  const groupNames = useMemo(() => faqGroups.map((group) => group.name), []);

  return (
    <section className="bg-[#0B0B0B] pb-24 pt-20">
      <div className="mx-auto max-w-5xl px-6">
        <div className="flex flex-col gap-4 text-center">
          <h2 className="text-3xl font-regular text-white md:text-4xl">Questions, answered</h2>
          <p className="text-sm text-white/55 md:text-base">
            Still evaluating Nex-T1? Start with the questions automation, compliance, and operations teams ask most often.
          </p>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-[220px,1fr] md:items-start">
          <div className="flex flex-col gap-2 text-left md:sticky md:top-28">
            {groupNames.map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => setActiveGroup(name)}
                className={`rounded-2xl border border-white/8 px-4 py-3 text-left text-sm font-medium transition-colors ${
                  activeGroup === name ? "bg-white text-black" : "text-white/60 hover:text-white"
                }`}
              >
                {name}
              </button>
            ))}
          </div>

          <div className="rounded-3xl border border-white/10 bg-[#101010] p-4 sm:p-6">
            {faqGroups.map((group) => (
              <div key={group.name} className={group.name === activeGroup ? "block" : "hidden"}>
                <Accordion type="single" collapsible className="space-y-3">
                  {group.items.map((item) => (
                    <AccordionItem key={item.id} value={item.id} className="border border-white/10 px-4">
                      <AccordionTrigger className="text-left text-sm font-medium text-white/80 hover:text-white">
                        {item.question}
                      </AccordionTrigger>
                      <AccordionContent className="pb-4 text-sm leading-relaxed text-white/60">
                        {item.answer}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}


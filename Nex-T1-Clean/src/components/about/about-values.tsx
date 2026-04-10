"use client";

import { Shield, Zap, Users, Globe, Lock, Code } from "lucide-react";

const values = [
  {
    icon: <Shield className="w-6 h-6 text-sky-400" />,
    title: "Security First",
    description: "We prioritize the safety of user funds and data above all else. Our architecture is built with defense-in-depth principles."
  },
  {
    icon: <Zap className="w-6 h-6 text-sky-400" />,
    title: "Permissionless Innovation",
    description: "We believe in open systems where anyone can build, deploy, and monetize their own AI agents without gatekeepers."
  },
  {
    icon: <Users className="w-6 h-6 text-sky-400" />,
    title: "Community Driven",
    description: "Our roadmap is guided by the needs of our users and the governance of the Nexis DAO."
  },
  {
    icon: <Globe className="w-6 h-6 text-sky-400" />,
    title: "Global Accessibility",
    description: "DeFi is for everyone. We build tools that bridge the gap between complex protocols and everyday users."
  },
  {
    icon: <Lock className="w-6 h-6 text-sky-400" />,
    title: "Privacy & Sovereignty",
    description: "Users should own their data and control their agents. We enable sovereign identity and private execution."
  },
  {
    icon: <Code className="w-6 h-6 text-sky-400" />,
    title: "Open Source",
    description: "We contribute to the ecosystem. Our core agent frameworks and protocol contracts are open for inspection."
  }
];

export function AboutValues() {
  return (
    <section className="w-full max-w-[1200px] px-8 py-24 flex flex-col gap-16 border-t border-white/5">
      <div className="flex flex-col gap-6 max-w-2xl">
        <div className="flex items-center gap-3">
            <div className="h-[1px] w-8 bg-sky-500/50" />
            <span className="text-sky-400 font-mono text-xs uppercase tracking-widest">Our Values</span>
        </div>
        <h3 className="text-4xl font-sans font-medium text-white tracking-tight">
          What Drives Us
        </h3>
        <p className="text-white/60 text-lg leading-relaxed">
          The principles that guide our development and growth.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {values.map((item, index) => (
            <div key={index} className="group p-8 rounded-2xl bg-white/5 border border-white/5 hover:border-white/10 hover:bg-white/[0.07] transition-all duration-300 flex flex-col gap-4">
                <div className="p-3 rounded-lg bg-sky-500/10 w-fit group-hover:bg-sky-500/20 transition-colors">
                    {item.icon}
                </div>
                <h4 className="text-xl font-medium text-white">{item.title}</h4>
                <p className="text-white/50 text-sm leading-relaxed">
                    {item.description}
                </p>
            </div>
        ))}
      </div>
    </section>
  );
}

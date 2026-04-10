import { AboutRoot } from "@/components/about/about-root";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Nexis Network | About Us",
  description: "Learn about Nexis Network, our mission to democratize DeFi with AI agents, and the values that drive us.",
};

export default function AboutPage() {
  return <AboutRoot />;
}

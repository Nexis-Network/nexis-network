import { DashboardHeader } from "@/components/dashboard/header-dash";
import { Footer } from "@/components/layout/footer";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background-page">
      <DashboardHeader />
      <main className="h-screen overflow-y-auto pt-[6.5rem]">
        <div className="container max-w-7xl mx-auto p-6 md:p-8">
          {children}
          <Footer />
        </div>
      </main>
    </div>
  );
}

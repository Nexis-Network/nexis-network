import { AppHeader } from "@/components/app-header/app-header";

export default function DefiLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-background">
      <AppHeader />
      <main className="flex-1 overflow-hidden">
        {children}
      </main>
    </div>
  );
}

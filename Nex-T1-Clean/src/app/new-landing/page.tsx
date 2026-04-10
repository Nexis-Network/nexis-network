import type { Metadata } from 'next';
import { Navigation } from '@/components/new-landing/Navigation';
import { HeroSection } from '@/components/new-landing/HeroSection';
import { WelcomeSection } from '@/components/new-landing/WelcomeSection';
import { Footer } from '@/components/new-landing/Footer';

export const metadata: Metadata = {
  title: 'Wabi — The first personal software platform',
  description: 'Create, discover, and remix any mini-app in minutes. The era of personal software is here.'
};

export default function NewLandingPage() {
  return (
    <div className="fixed inset-0 z-[100] flex flex-col w-screen h-screen overflow-y-auto overscroll-none bg-[#131313] text-[#f0f0f0] antialiased" style={{ fontFamily: 'var(--font-inter), Inter, sans-serif' }}>
      <div className="bg-[#f0f0f0] text-[#191919] rounded-b-[35px] border-b border-[#d4d4d4] relative z-10 shrink-0 flex flex-col shadow-xl">
        <Navigation />
        <main className="flex flex-col flex-1 w-full relative z-0 shrink-0">
          <HeroSection />
          <WelcomeSection />
        </main>
      </div>
      <Footer />
    </div>
  );
}


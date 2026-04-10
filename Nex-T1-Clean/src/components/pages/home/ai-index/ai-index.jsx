'use client';

import Image from 'next/image';

import { Ai02Landing } from '@/components/ai-elements/ai-02-landing';

const AiIndex = () => {
  return (
    <section
      className="ai-index relative isolate flex w-full items-center justify-center overflow-hidden border-none mt-16 sm:mt-20 lg:mt-24 xl:mt-28 2xl:mt-32 min-h-[105vh] md:min-h-[110vh]"
    >
      <div className="absolute inset-0">
        <Image
          src="/bg/bg-section.png"
          alt="Abstract AI mesh background"
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0" aria-hidden />
        <div className="twinkle-layer absolute inset-0 pointer-events-none" aria-hidden />
        <div className="twinkle-layer twinkle-layer-2 absolute inset-0 pointer-events-none" aria-hidden />
        <div className="twinkle-layer twinkle-layer-3 absolute inset-0 pointer-events-none" aria-hidden />
        <div className="twinkle-layer twinkle-layer-giants absolute inset-0 pointer-events-none" aria-hidden />
        <div className="absolute inset-x-0 bottom-0 h-48 bg-linear-to-b from-transparent via-black/35 to-black" aria-hidden />
      </div>

      <div className="relative z-10 mx-auto flex h-full w-full items-center justify-center">
        <Ai02Landing />
      </div>
      <style jsx>{`
        @keyframes twinkle {
          0% { opacity: 0.12; }
          50% { opacity: 0.5; }
          100% { opacity: 0.2; }
        }

        .twinkle-layer {
          background-image:
            radial-gradient(2px 2px at 6% 18%, rgba(255,255,255,0.82), transparent 60%),
            radial-gradient(2px 2px at 14% 30%, rgba(255,255,255,0.86), transparent 60%),
            radial-gradient(2px 2px at 22% 12%, rgba(255,255,255,0.9), transparent 60%),
            radial-gradient(2px 2px at 28% 26%, rgba(255,255,255,0.78), transparent 60%),
            radial-gradient(2px 2px at 34% 8%, rgba(255,255,255,0.88), transparent 60%),
            radial-gradient(2px 2px at 42% 22%, rgba(255,255,255,0.8), transparent 60%),
            radial-gradient(2px 2px at 46% 10%, rgba(255,255,255,0.82), transparent 60%),
            radial-gradient(2px 2px at 54% 18%, rgba(255,255,255,0.84), transparent 60%),
            radial-gradient(2px 2px at 60% 6%, rgba(255,255,255,0.88), transparent 60%),
            radial-gradient(2px 2px at 66% 24%, rgba(255,255,255,0.8), transparent 60%),
            radial-gradient(2px 2px at 72% 12%, rgba(255,255,255,0.85), transparent 60%),
            radial-gradient(2px 2px at 80% 20%, rgba(255,255,255,0.82), transparent 60%),
            radial-gradient(2px 2px at 88% 8%, rgba(255,255,255,0.78), transparent 60%),
            radial-gradient(2px 2px at 94% 18%, rgba(255,255,255,0.82), transparent 60%),
            radial-gradient(2px 2px at 10% 48%, rgba(255,255,255,0.9), transparent 60%),
            radial-gradient(2px 2px at 24% 56%, rgba(255,255,255,0.86), transparent 60%),
            radial-gradient(2px 2px at 38% 44%, rgba(255,255,255,0.8), transparent 60%),
            radial-gradient(2px 2px at 52% 52%, rgba(255,255,255,0.9), transparent 60%),
            radial-gradient(2px 2px at 66% 42%, rgba(255,255,255,0.84), transparent 60%),
            radial-gradient(2px 2px at 78% 50%, rgba(255,255,255,0.8), transparent 60%),
            radial-gradient(2px 2px at 90% 44%, rgba(255,255,255,0.82), transparent 60%),
            radial-gradient(2px 2px at 14% 72%, rgba(255,255,255,0.86), transparent 60%),
            radial-gradient(2px 2px at 32% 82%, rgba(255,255,255,0.8), transparent 60%),
            radial-gradient(2px 2px at 48% 70%, rgba(255,255,255,0.88), transparent 60%),
            radial-gradient(2px 2px at 64% 80%, rgba(255,255,255,0.82), transparent 60%),
            radial-gradient(2px 2px at 78% 70%, rgba(255,255,255,0.9), transparent 60%);
          background-size: 100% 100%;
          animation: twinkle 7.5s ease-in-out infinite alternate;
          animation-delay: 0s, 0.3s, 0.9s, 1.6s, 2.2s, 2.8s, 3.5s, 4.1s, 4.7s, 5.3s, 5.9s, 6.5s, 7.1s, 7.7s, 8.3s, 8.9s, 9.5s, 10.1s, 10.7s, 11.3s, 11.9s, 12.5s, 13.1s, 13.7s, 14.3s, 14.9s;
          mix-blend-mode: screen;
        }

        .twinkle-layer-2 {
          background-image:
            radial-gradient(1.6px 1.6px at 4% 6%, rgba(255,255,255,0.75), transparent 60%),
            radial-gradient(1.6px 1.6px at 12% 10%, rgba(255,255,255,0.78), transparent 60%),
            radial-gradient(1.6px 1.6px at 20% 4%, rgba(255,255,255,0.8), transparent 60%),
            radial-gradient(1.6px 1.6px at 26% 12%, rgba(255,255,255,0.74), transparent 60%),
            radial-gradient(1.6px 1.6px at 34% 6%, rgba(255,255,255,0.76), transparent 60%),
            radial-gradient(1.6px 1.6px at 42% 14%, rgba(255,255,255,0.78), transparent 60%),
            radial-gradient(1.6px 1.6px at 50% 6%, rgba(255,255,255,0.8), transparent 60%),
            radial-gradient(1.6px 1.6px at 58% 12%, rgba(255,255,255,0.74), transparent 60%),
            radial-gradient(1.6px 1.6px at 66% 4%, rgba(255,255,255,0.76), transparent 60%),
            radial-gradient(1.6px 1.6px at 74% 10%, rgba(255,255,255,0.78), transparent 60%),
            radial-gradient(1.6px 1.6px at 82% 6%, rgba(255,255,255,0.8), transparent 60%),
            radial-gradient(1.6px 1.6px at 90% 12%, rgba(255,255,255,0.74), transparent 60%),
            radial-gradient(1.6px 1.6px at 6% 32%, rgba(255,255,255,0.76), transparent 60%),
            radial-gradient(1.6px 1.6px at 18% 38%, rgba(255,255,255,0.74), transparent 60%),
            radial-gradient(1.6px 1.6px at 30% 34%, rgba(255,255,255,0.78), transparent 60%),
            radial-gradient(1.6px 1.6px at 44% 36%, rgba(255,255,255,0.75), transparent 60%),
            radial-gradient(1.6px 1.6px at 58% 32%, rgba(255,255,255,0.72), transparent 60%),
            radial-gradient(1.6px 1.6px at 70% 38%, rgba(255,255,255,0.76), transparent 60%),
            radial-gradient(1.6px 1.6px at 84% 34%, rgba(255,255,255,0.74), transparent 60%),
            radial-gradient(1.6px 1.6px at 10% 60%, rgba(255,255,255,0.8), transparent 60%),
            radial-gradient(1.6px 1.6px at 26% 66%, rgba(255,255,255,0.76), transparent 60%),
            radial-gradient(1.6px 1.6px at 42% 62%, rgba(255,255,255,0.72), transparent 60%),
            radial-gradient(1.6px 1.6px at 58% 68%, rgba(255,255,255,0.78), transparent 60%),
            radial-gradient(1.6px 1.6px at 72% 64%, rgba(255,255,255,0.74), transparent 60%),
            radial-gradient(1.6px 1.6px at 86% 68%, rgba(255,255,255,0.76), transparent 60%),
            radial-gradient(1.6px 1.6px at 14% 86%, rgba(255,255,255,0.74), transparent 60%),
            radial-gradient(1.6px 1.6px at 32% 90%, rgba(255,255,255,0.76), transparent 60%),
            radial-gradient(1.6px 1.6px at 52% 88%, rgba(255,255,255,0.74), transparent 60%),
            radial-gradient(1.6px 1.6px at 70% 90%, rgba(255,255,255,0.72), transparent 60%),
            radial-gradient(1.6px 1.6px at 88% 86%, rgba(255,255,255,0.74), transparent 60%);
          background-size: 100% 100%;
          animation: twinkle 6.2s ease-in-out infinite alternate-reverse;
          animation-delay: 0.6s, 1.1s, 1.7s, 2.3s, 2.9s, 3.4s, 4s, 4.6s, 5.2s, 5.8s, 6.4s, 7s, 7.6s, 8.2s, 8.8s, 9.4s, 10s, 10.6s, 11.2s, 11.8s, 12.4s, 13s, 13.6s, 14.2s, 14.8s, 15.4s, 16s, 16.6s, 17.2s, 17.8s;
          mix-blend-mode: screen;
        }

        .twinkle-layer-3 {
          background-image:
            radial-gradient(1.2px 1.2px at 5% 18%, rgba(255,255,255,0.65), transparent 60%),
            radial-gradient(1.2px 1.2px at 18% 8%, rgba(255,255,255,0.7), transparent 60%),
            radial-gradient(1.2px 1.2px at 30% 16%, rgba(255,255,255,0.68), transparent 60%),
            radial-gradient(1.2px 1.2px at 44% 10%, rgba(255,255,255,0.66), transparent 60%),
            radial-gradient(1.2px 1.2px at 58% 14%, rgba(255,255,255,0.7), transparent 60%),
            radial-gradient(1.2px 1.2px at 72% 8%, rgba(255,255,255,0.68), transparent 60%),
            radial-gradient(1.2px 1.2px at 86% 14%, rgba(255,255,255,0.64), transparent 60%),
            radial-gradient(1.2px 1.2px at 96% 10%, rgba(255,255,255,0.66), transparent 60%),
            radial-gradient(1.2px 1.2px at 8% 32%, rgba(255,255,255,0.64), transparent 60%),
            radial-gradient(1.2px 1.2px at 24% 36%, rgba(255,255,255,0.66), transparent 60%),
            radial-gradient(1.2px 1.2px at 40% 30%, rgba(255,255,255,0.68), transparent 60%),
            radial-gradient(1.2px 1.2px at 56% 34%, rgba(255,255,255,0.64), transparent 60%),
            radial-gradient(1.2px 1.2px at 70% 30%, rgba(255,255,255,0.66), transparent 60%),
            radial-gradient(1.2px 1.2px at 84% 36%, rgba(255,255,255,0.64), transparent 60%),
            radial-gradient(1.2px 1.2px at 94% 32%, rgba(255,255,255,0.66), transparent 60%),
            radial-gradient(1.2px 1.2px at 12% 54%, rgba(255,255,255,0.64), transparent 60%),
            radial-gradient(1.2px 1.2px at 28% 60%, rgba(255,255,255,0.68), transparent 60%),
            radial-gradient(1.2px 1.2px at 44% 56%, rgba(255,255,255,0.66), transparent 60%),
            radial-gradient(1.2px 1.2px at 60% 60%, rgba(255,255,255,0.64), transparent 60%),
            radial-gradient(1.2px 1.2px at 74% 56%, rgba(255,255,255,0.66), transparent 60%),
            radial-gradient(1.2px 1.2px at 88% 60%, rgba(255,255,255,0.64), transparent 60%),
            radial-gradient(1.2px 1.2px at 16% 78%, rgba(255,255,255,0.66), transparent 60%),
            radial-gradient(1.2px 1.2px at 32% 82%, rgba(255,255,255,0.64), transparent 60%),
            radial-gradient(1.2px 1.2px at 48% 76%, rgba(255,255,255,0.66), transparent 60%),
            radial-gradient(1.2px 1.2px at 64% 82%, rgba(255,255,255,0.64), transparent 60%),
            radial-gradient(1.2px 1.2px at 78% 78%, rgba(255,255,255,0.66), transparent 60%),
            radial-gradient(1.2px 1.2px at 92% 82%, rgba(255,255,255,0.64), transparent 60%),
            radial-gradient(1.2px 1.2px at 24% 94%, rgba(255,255,255,0.66), transparent 60%),
            radial-gradient(1.2px 1.2px at 52% 92%, rgba(255,255,255,0.64), transparent 60%),
            radial-gradient(1.2px 1.2px at 78% 94%, rgba(255,255,255,0.66), transparent 60%);
          background-size: 100% 100%;
          animation: twinkle 5.8s ease-in-out infinite alternate;
          animation-delay: 0.2s, 0.9s, 1.4s, 2s, 2.6s, 3.2s, 3.8s, 4.4s, 5s, 5.6s, 6.2s, 6.8s, 7.4s, 8s, 8.6s, 9.2s, 9.8s, 10.4s, 11s, 11.6s, 12.2s, 12.8s, 13.4s, 14s, 14.6s, 15.2s, 15.8s, 16.4s, 17s, 17.6s, 18.2s;
          mix-blend-mode: screen;
        }

        .twinkle-layer-giants {
          background-image:
            radial-gradient(4px 4px at 12% 26%, rgba(255,255,255,0.32), transparent 62%),
            radial-gradient(4px 4px at 48% 18%, rgba(255,255,255,0.28), transparent 62%),
            radial-gradient(4px 4px at 74% 12%, rgba(255,255,255,0.3), transparent 62%),
            radial-gradient(4px 4px at 32% 44%, rgba(255,255,255,0.34), transparent 62%),
            radial-gradient(4px 4px at 58% 52%, rgba(255,255,255,0.3), transparent 62%),
            radial-gradient(4px 4px at 82% 46%, rgba(255,255,255,0.32), transparent 62%),
            radial-gradient(4px 4px at 22% 70%, rgba(255,255,255,0.3), transparent 62%),
            radial-gradient(4px 4px at 46% 74%, rgba(255,255,255,0.32), transparent 62%),
            radial-gradient(4px 4px at 72% 68%, rgba(255,255,255,0.3), transparent 62%),
            radial-gradient(4px 4px at 88% 74%, rgba(255,255,255,0.28), transparent 62%),
            radial-gradient(6px 6px at 18% 14%, rgba(255,255,255,0.2), transparent 65%),
            radial-gradient(6px 6px at 64% 22%, rgba(255,255,255,0.22), transparent 65%),
            radial-gradient(6px 6px at 82% 30%, rgba(255,255,255,0.18), transparent 65%),
            radial-gradient(6px 6px at 28% 58%, rgba(255,255,255,0.2), transparent 65%),
            radial-gradient(6px 6px at 56% 62%, rgba(255,255,255,0.22), transparent 65%),
            radial-gradient(6px 6px at 78% 58%, rgba(255,255,255,0.18), transparent 65%),
            radial-gradient(6px 6px at 42% 86%, rgba(255,255,255,0.2), transparent 65%),
            radial-gradient(6px 6px at 70% 86%, rgba(255,255,255,0.18), transparent 65%),
            radial-gradient(8px 8px at 24% 34%, rgba(255,255,255,0.15), transparent 68%),
            radial-gradient(8px 8px at 54% 30%, rgba(255,255,255,0.14), transparent 68%),
            radial-gradient(8px 8px at 30% 78%, rgba(255,255,255,0.15), transparent 68%),
            radial-gradient(8px 8px at 64% 74%, rgba(255,255,255,0.14), transparent 68%),
            radial-gradient(8px 8px at 82% 88%, rgba(255,255,255,0.12), transparent 68%);
          background-size: 100% 100%;
          animation: twinkle 9s ease-in-out infinite alternate-reverse;
          animation-delay: 1s, 1.8s, 2.6s, 3.4s, 4.2s, 5s, 5.8s, 6.6s, 7.4s, 8.2s, 9s, 9.8s, 10.6s, 11.4s, 12.2s, 13s, 13.8s, 14.6s, 15.4s, 16.2s, 17s, 17.8s, 18.6s;
          mix-blend-mode: screen;
        }
      `}</style>
    </section>
  );
};

export default AiIndex;

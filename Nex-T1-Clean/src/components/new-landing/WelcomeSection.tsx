import React from 'react';

export function WelcomeSection() {
  return (
    <section className="relative overflow-hidden px-6 pt-[120px] pb-[100px] text-center md:pt-[220px] md:pb-[320px]">
      <h2 className="mx-auto mb-5 max-w-[580px] text-[32px] leading-[38px] font-normal tracking-[-0.03em] sm:text-[58px] sm:leading-[64px] text-[#191919]">
        Welcome to the era<br />of personal software
      </h2>
      <p className="mx-auto mb-8 max-w-[580px] text-lg leading-[26px] tracking-[-0.03em] text-[#525252] opacity-60 sm:text-[25px] sm:leading-[34px]">
        Where anyone can create, discover, remix, and share mini-apps — no code required.
      </p>
    </section>
  );
}

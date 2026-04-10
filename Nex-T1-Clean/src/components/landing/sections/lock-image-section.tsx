"use client";

import Image from "next/image";

const LOCK_IMAGE_URL =
  "https://meribtk8qpfzbmbf.public.blob.vercel-storage.com/section-images/lock.png";

export function LockImageSection() {
  return (
    <section className="px-4 py-16 sm:py-24 flex flex-col items-center justify-center gap-section-element">
      <div className="w-screen flex justify-center">
        <Image
          src={LOCK_IMAGE_URL}
          alt="Security lock illustration"
          width={3072}
          height={1200}
          sizes="(max-width: 768px) 184vw, 884px"
          className="w-[184%] max-w-[884px] h-auto"
        />
      </div>
    </section>
  );
}

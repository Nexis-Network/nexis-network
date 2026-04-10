import React from 'react';
import { GlassButton } from './GlassButton';

export function Navigation() {
  return (
    <header className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-[14px] md:px-8">
      <div className="flex items-center">
        <a aria-label="Home page" className="inline-flex hover:opacity-80 transition-opacity" href="/new-landing">
          <div className="flex items-center gap-2">
            <svg className="w-[32px] h-auto" viewBox="0 0 168 142" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M55.98 65.2C55.98 49.74 43.45 37.21 27.99 37.21C12.53 37.21 0 49.74 0 65.2C0 80.66 12.53 93.19 27.99 93.19C43.45 93.19 55.98 80.66 55.98 65.2Z" fill="#191919"></path>
              <path d="M111.86 65.26C111.86 49.8 99.33 37.27 83.87 37.27C68.41 37.27 55.88 49.8 55.88 65.26C55.88 80.72 68.41 93.25 83.87 93.25C99.33 93.25 111.86 80.72 111.86 65.26Z" fill="#191919"></path>
              <path d="M167.8 65.2C167.8 49.74 155.27 37.21 139.81 37.21C124.35 37.21 111.82 49.74 111.82 65.2C111.82 80.66 124.35 93.19 139.81 93.19C155.27 93.19 167.8 80.66 167.8 65.2Z" fill="#191919"></path>
              <path d="M139.8 113.62C139.8 98.16 127.27 85.63 111.81 85.63C96.35 85.63 83.82 98.16 83.82 113.62C83.82 129.08 96.35 141.61 111.81 141.61C127.27 141.61 139.8 129.08 139.8 113.62Z" fill="#191919"></path>
              <path d="M83.92 113.53C83.92 98.07 71.39 85.54 55.93 85.54C40.47 85.54 27.94 98.07 27.94 113.53C27.94 128.99 40.47 141.52 55.93 141.52C71.39 141.52 83.92 128.99 83.92 113.53Z" fill="#191919"></path>
            </svg>
            <span className="font-semibold tracking-[-0.03em] text-[22px] leading-none text-[#191919]">wabi</span>
          </div>
        </a>
      </div>
      <div>
        <GlassButton variant="header" href="https://wabi.com/get-started">
          Get started
        </GlassButton>
      </div>
    </header>
  );
}

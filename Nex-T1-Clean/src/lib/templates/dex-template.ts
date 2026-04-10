import { VirtualFile } from '@/types/build';

export const DEX_TEMPLATE: VirtualFile[] = [
  {
    id: 'package.json',
    name: "package.json",
    type: 'file',
    content: `{
  "name": "nexis-dex",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
  "dependencies": {
    "react": "^18",
    "react-dom": "^18",
    "next": "14.2.3",
    "lucide-react": "^0.378.0",
    "clsx": "^2.1.1",
    "tailwind-merge": "^2.3.0",
    "framer-motion": "^11.0.0"
  },
  "devDependencies": {
    "typescript": "^5",
    "@types/node": "^20",
    "@types/react": "^18",
    "@types/react-dom": "^18",
    "postcss": "^8",
    "tailwindcss": "^3.4.1",
    "eslint": "^8",
    "eslint-config-next": "14.2.3"
  }
}`,
    language: "json",
    updatedAt: new Date().toISOString()
  },
  {
    id: 'tsconfig.json',
    name: "tsconfig.json",
    type: 'file',
    content: `{
  "compilerOptions": {
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}`,
    language: "json",
    updatedAt: new Date().toISOString()
  },
  {
    id: 'tailwind.config.ts',
    name: "tailwind.config.ts",
    type: 'file',
    content: `import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        primary: {
          DEFAULT: "var(--primary)",
          foreground: "var(--primary-foreground)",
        },
        card: {
          DEFAULT: "var(--card)",
          foreground: "var(--card-foreground)",
        },
        input: "var(--input)",
      },
    },
  },
  plugins: [],
};
export default config;`,
    language: "typescript",
    updatedAt: new Date().toISOString()
  },
  {
    id: 'app/globals.css',
    name: "app/globals.css",
    type: 'file',
    content: `@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --background: 255 255 255;
  --foreground: 15 23 42;
  --primary: 14 165 233; /* sky-500 */
  --primary-foreground: 255 255 255;
  --card: 255 255 255;
  --card-foreground: 15 23 42;
  --input: 241 245 249;
}

@media (prefers-color-scheme: dark) {
  :root {
    --background: 13 14 18; /* Darker background */
    --foreground: 255 255 255;
    --primary: 14 165 233; /* sky-500 */
    --primary-foreground: 255 255 255;
    --card: 22 25 32; /* Slightly lighter than bg */
    --card-foreground: 255 255 255;
    --input: 30 35 45;
  }
}

body {
  color: rgb(var(--foreground));
  background: rgb(var(--background));
}

@layer utilities {
  .text-balance {
    text-wrap: balance;
  }
}`,
    language: "css",
    updatedAt: new Date().toISOString()
  },
  {
    id: 'app/layout.tsx',
    name: "app/layout.tsx",
    type: 'file',
    content: `import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Nexis Swap",
  description: "Swap tokens with ease",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {children}
      </body>
    </html>
  );
}`,
    language: "typescript",
    updatedAt: new Date().toISOString()
  },
  {
    id: 'components/header.tsx',
    name: "components/header.tsx",
    type: 'file',
    content: `'use client';

import { Settings, Wallet } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

export function Header() {
  const pathname = usePathname();

  const navItems = [
    { name: 'Swap', href: '/' },
    { name: 'Tokens', href: '/tokens' },
    { name: 'NFTs', href: '/nfts' },
    { name: 'Pools', href: '/pools' },
  ];

  return (
    <header className="flex items-center justify-between px-6 py-4 max-w-7xl mx-auto w-full">
      <div className="flex items-center gap-8">
        <Link href="/" className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-sky-400 to-sky-600">
          Nexis Swap
        </Link>
        
        <nav className="flex items-center gap-1 bg-card/50 p-1 rounded-full border border-white/5">
          {navItems.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200",
                pathname === item.href 
                  ? "bg-slate-800 text-white shadow-sm"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/50"
              )}
            >
              {item.name}
            </Link>
          ))}
        </nav>
      </div>

      <div className="flex items-center gap-3">
        <button className="p-2 rounded-full text-slate-400 hover:bg-slate-800 hover:text-white transition-colors">
          <Settings className="w-5 h-5" />
        </button>
        <button className="flex items-center gap-2 bg-sky-500/10 hover:bg-sky-500/20 text-sky-500 px-4 py-2 rounded-2xl font-semibold transition-all duration-200 border border-sky-500/20">
          <Wallet className="w-4 h-4" />
          <span>Connect</span>
        </button>
      </div>
    </header>
  );
}`,
    language: "typescript",
    updatedAt: new Date().toISOString()
  },
  {
    id: 'lib/utils.ts',
    name: "lib/utils.ts",
    type: 'file',
    content: `import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}`,
    language: "typescript",
    updatedAt: new Date().toISOString()
  },
  {
    id: 'app/page.tsx',
    name: "app/page.tsx",
    type: 'file',
    content: `'use client';

import { Header } from '@/components/header';
import { ArrowDown, Info, Settings2 } from 'lucide-react';
import { useState } from 'react';
import { motion } from 'framer-motion';

export default function Home() {
  const [sellAmount, setSellAmount] = useState('');
  const [buyAmount, setBuyAmount] = useState('');

  return (
    <main className="min-h-screen bg-background flex flex-col">
      <Header />
      
      <div className="flex-1 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-[480px] space-y-2"
        >
          <div className="flex items-center justify-between mb-2 px-2">
            <h1 className="text-white font-medium">Swap</h1>
            <button className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-colors">
              <Settings2 className="w-5 h-5" />
            </button>
          </div>

          <div className="relative group">
            <div className="bg-card rounded-[24px] border border-white/5 p-4 space-y-4 hover:border-white/10 transition-colors">
              <div className="space-y-2">
                <label className="text-slate-400 text-sm font-medium">Sell</label>
                <div className="flex items-center justify-between">
                  <input 
                    type="text" 
                    placeholder="0"
                    value={sellAmount}
                    onChange={(e) => setSellAmount(e.target.value)}
                    className="bg-transparent text-4xl font-medium text-white placeholder-slate-600 outline-none w-full"
                  />
                  <button className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-full border border-white/5 transition-colors shrink-0">
                    <div className="w-5 h-5 rounded-full bg-sky-500"></div>
                    <span className="font-semibold text-white">ETH</span>
                  </button>
                </div>
                <div className="text-slate-500 text-sm">$0.00</div>
              </div>
            </div>

            <div className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 top-1/2 z-10">
              <button className="bg-card border-4 border-background p-2 rounded-xl text-slate-400 hover:text-sky-500 transition-colors">
                <ArrowDown className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-card rounded-[24px] border border-white/5 p-4 space-y-4 hover:border-white/10 transition-colors mt-2">
              <div className="space-y-2">
                <label className="text-slate-400 text-sm font-medium">Buy</label>
                <div className="flex items-center justify-between">
                  <input 
                    type="text" 
                    placeholder="0"
                    value={buyAmount}
                    onChange={(e) => setBuyAmount(e.target.value)}
                    className="bg-transparent text-4xl font-medium text-white placeholder-slate-600 outline-none w-full"
                  />
                  <button className="flex items-center gap-2 bg-sky-500 px-3 py-1.5 rounded-full border border-white/5 hover:bg-sky-400 transition-colors shrink-0 text-white shadow-lg shadow-sky-500/20">
                    <span className="font-semibold">Select Token</span>
                    <ArrowDown className="w-4 h-4" />
                  </button>
                </div>
                <div className="text-slate-500 text-sm">$0.00</div>
              </div>
            </div>
          </div>

          <button className="w-full bg-sky-500 hover:bg-sky-400 text-white font-bold text-lg py-4 rounded-2xl transition-all duration-200 shadow-lg shadow-sky-500/20 mt-4">
            Connect Wallet
          </button>
          
          <div className="flex items-center justify-between px-4 py-3 text-sm text-slate-500">
             <div className="flex items-center gap-1 cursor-help hover:text-slate-300">
               <span>Network Cost</span>
               <Info className="w-3 h-3" />
             </div>
             <span>~$4.20</span>
          </div>
        </motion.div>
      </div>
    </main>
  );
}`,
    language: "typescript",
    updatedAt: new Date().toISOString()
  }
];

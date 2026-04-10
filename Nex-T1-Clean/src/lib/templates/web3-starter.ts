import { VirtualFile } from '@/types/build';

export const WEB3_STARTER_TEMPLATE: VirtualFile[] = [
  {
    id: 'package.json',
    name: 'package.json',
    type: 'file',
    content: JSON.stringify({
      "name": "web3-starter",
      "private": true,
      "version": "0.0.0",
      "type": "module",
      "scripts": {
        "dev": "vite",
        "build": "tsc && vite build",
        "preview": "vite preview"
      },
      "dependencies": {
        "react": "^18.2.0",
        "react-dom": "^18.2.0",
        "ethers": "^6.11.1",
        "lucide-react": "^0.344.0",
        "clsx": "^2.1.0",
        "tailwind-merge": "^2.2.1"
      },
      "devDependencies": {
        "@types/react": "^18.2.64",
        "@types/react-dom": "^18.2.21",
        "@vitejs/plugin-react": "^4.2.1",
        "autoprefixer": "^10.4.18",
        "postcss": "^8.4.35",
        "tailwindcss": "^3.4.1",
        "typescript": "^5.2.2",
        "vite": "^5.1.4"
      }
    }, null, 2),
    language: "json",
    updatedAt: new Date().toISOString()
  },
  {
      id: 'vite.config.ts',
      name: 'vite.config.ts',
      type: 'file',
      content: `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
})`,
      language: "typescript",
      updatedAt: new Date().toISOString()
  },
  {
      id: 'index.html',
      name: 'index.html',
      type: 'file',
      content: `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Nexis App</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>`,
      language: "html",
      updatedAt: new Date().toISOString()
  },
  {
      id: 'src/main.tsx',
      name: 'src/main.tsx',
      type: 'file',
      content: `import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)`,
      language: "typescript",
      updatedAt: new Date().toISOString()
  },
  {
      id: 'src/index.css',
      name: 'src/index.css',
      type: 'file',
      content: `@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
  }
 
  .dark {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
  }
}
 
@layer base {
  body {
    @apply bg-background text-foreground;
  }
}`,
      language: "css",
      updatedAt: new Date().toISOString()
  },
  {
      id: 'src/App.tsx',
      name: 'src/App.tsx',
      type: 'file',
      content: `import { useState } from 'react'
import { Wallet } from 'lucide-react'


import { logger } from '@/lib/logger';
function App() {
  const [address, setAddress] = useState<string | null>(null)

  const connect = async () => {
    if (typeof window.ethereum !== 'undefined') {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' })
        setAddress(accounts[0])
      } catch (error) {
        logger.error("Connection failed", error)
      }
    } else {
      alert("Please install MetaMask or another Web3 wallet")
    }
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-xl p-8 shadow-2xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-blue-500/10 rounded-lg">
             <Wallet className="w-6 h-6 text-blue-500" />
          </div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
            Web3 Starter
          </h1>
        </div>

        <p className="text-neutral-400 mb-8">
          Welcome to your new dApp. This template is pre-configured with Tailwind CSS, React, and basic Ethers.js integration.
        </p>

        {address ? (
          <div className="bg-green-500/10 border border-green-500/20 text-green-400 px-4 py-3 rounded-lg text-sm font-mono break-all">
            {address}
          </div>
        ) : (
          <button 
            onClick={connect}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-3 rounded-lg transition-colors"
          >
            Connect Wallet
          </button>
        )}
      </div>
    </div>
  )
}

export default App`,
      language: "typescript",
      updatedAt: new Date().toISOString()
  },
  {
      id: 'postcss.config.js',
      name: 'postcss.config.js',
      type: 'file',
      content: `export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}`,
      language: "javascript",
      updatedAt: new Date().toISOString()
  },
  {
      id: 'tailwind.config.js',
      name: 'tailwind.config.js',
      type: 'file',
      content: `/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}`,
      language: "javascript",
      updatedAt: new Date().toISOString()
  }
];

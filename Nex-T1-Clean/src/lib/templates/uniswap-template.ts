import { VirtualFile } from "@/types/build";

export const UNISWAP_TEMPLATE: VirtualFile[] = [
  {
    id: "package.json",
    name: "package.json",
    type: "file",
    content: JSON.stringify(
      {
        "name": "uniswap-clone",
        "private": true,
        "version": "0.0.0",
        "type": "module",
        "scripts": {
          "dev": "vite",
          "build": "tsc && vite build",
          "preview": "vite preview",
        },
        "dependencies": {
          "react": "^18.2.0",
          "react-dom": "^18.2.0",
          "ethers": "^6.11.1",
          "lucide-react": "^0.344.0",
          "clsx": "^2.1.0",
          "tailwind-merge": "^2.2.1",
          "framer-motion": "^11.0.8",
        },
        "devDependencies": {
          "@types/react": "^18.2.64",
          "@types/react-dom": "^18.2.21",
          "@vitejs/plugin-react": "^4.2.1",
          "autoprefixer": "^10.4.18",
          "postcss": "^8.4.35",
          "tailwindcss": "^3.4.1",
          "typescript": "^5.2.2",
          "vite": "^5.1.4",
        },
      },
      null,
      2,
    ),
    language: "json",
    updatedAt: new Date().toISOString(),
  },
  {
    id: "vite.config.ts",
    name: "vite.config.ts",
    type: "file",
    content: `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
})`,
    language: "typescript",
    updatedAt: new Date().toISOString(),
  },
  {
    id: "index.html",
    name: "index.html",
    type: "file",
    content: `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984/logo.png" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Uniswap Clone</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
    <style>
      body { background-color: #0d111c; color: white; }
    </style>
  </body>
</html>`,
    language: "html",
    updatedAt: new Date().toISOString(),
  },
  {
    id: "src/main.tsx",
    name: "src/main.tsx",
    type: "file",
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
    updatedAt: new Date().toISOString(),
  },
  {
    id: "src/index.css",
    name: "src/index.css",
    type: "file",
    content: `@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
  }
}

body {
  @apply bg-[#0d111c] text-white antialiased;
}

.swap-card {
  @apply bg-[#131a2a] border border-[#ffffff12] rounded-2xl p-4 shadow-xl;
}

.token-input {
  @apply bg-[#1b2236] rounded-xl p-4 hover:border-[#ffffff12] border border-transparent transition-colors;
}`,
    language: "css",
    updatedAt: new Date().toISOString(),
  },
  {
    id: "src/App.tsx",
    name: "src/App.tsx",
    type: "file",
    content: `import { useState } from 'react'
import Header from './components/Header'
import Swap from './components/Swap'

function App() {
  return (
    <div className="min-h-screen bg-[#0d111c] text-white font-sans selection:bg-[#ff007a] selection:text-white">
      <Header />
      <main className="flex justify-center pt-20 px-4">
        <Swap />
      </main>
    </div>
  )
}

export default App`,
    language: "typescript",
    updatedAt: new Date().toISOString(),
  },
  {
    id: "src/components/Header.tsx",
    name: "src/components/Header.tsx",
    type: "file",
    content: `import { Wallet } from 'lucide-react'
import { useState } from 'react'

export default function Header() {
  const [address, setAddress] = useState<string | null>(null)

  const connect = async () => {
    if (typeof window.ethereum !== 'undefined') {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' })
        setAddress(accounts[0])
      } catch (error) {
        console.error("Connection failed", error)
      }
    } else {
        // Mock connection for preview
        setAddress("0x71C...9A23")
    }
  }

  return (
    <nav className="flex items-center justify-between px-6 py-4 border-b border-[#ffffff12]">
        <div className="flex items-center gap-2">
             <img src="https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984/logo.png" className="w-8 h-8" alt="Logo" />
             <span className="font-bold text-xl tracking-tight">Swap</span>
             <div className="ml-8 flex gap-6 text-[#98a1c0] font-medium hidden md:flex">
                <a href="#" className="text-white">Swap</a>
                <a href="#" className="hover:text-white transition-colors">Tokens</a>
                <a href="#" className="hover:text-white transition-colors">NFTs</a>
                <a href="#" className="hover:text-white transition-colors">Pools</a>
             </div>
        </div>

        <div className="flex items-center gap-3">
             <div className="hidden md:flex items-center gap-2 bg-[#1b2236] px-3 py-2 rounded-xl border border-transparent hover:border-[#ffffff12] transition-colors cursor-pointer">
                 <img src="https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/logo.png" className="w-5 h-5" />
                 <span className="font-medium">Ethereum</span>
             </div>
             
             <button 
                onClick={connect}
                className="bg-[#293249] hover:bg-[#313b57] text-[#5e9aff] font-semibold px-4 py-2 rounded-xl transition-all flex items-center gap-2"
             >
                {address ? (
                    <span>{address}</span>
                ) : (
                    <>
                        <span>Connect</span>
                    </>
                )}
             </button>
        </div>
    </nav>
  )
}`,
    language: "typescript",
    updatedAt: new Date().toISOString(),
  },
  {
    id: "src/components/Swap.tsx",
    name: "src/components/Swap.tsx",
    type: "file",
    content: `import { useState } from 'react'
import { ArrowDown, Settings, ChevronDown } from 'lucide-react'
import TokenModal from './TokenModal'

export interface Token {
    symbol: string
    name: string
    logo: string
}

export const TOKENS: Token[] = [
    { symbol: 'ETH', name: 'Ether', logo: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/logo.png' },
    { symbol: 'USDC', name: 'USDC', logo: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48/logo.png' },
    { symbol: 'USDT', name: 'Tether USD', logo: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xdAC17F958D2ee523a2206206994597C13D831ec7/logo.png' },
    { symbol: 'WBTC', name: 'Wrapped BTC', logo: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599/logo.png' },
    { symbol: 'UNI', name: 'Uniswap', logo: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984/logo.png' },
]

export default function Swap() {
    const [tokenIn, setTokenIn] = useState<Token>(TOKENS[0])
    const [tokenOut, setTokenOut] = useState<Token>(TOKENS[4])
    const [amountIn, setAmountIn] = useState<string>('')
    const [showModal, setShowModal] = useState<'in' | 'out' | null>(null)

    const handleSwap = () => {
        const temp = tokenIn
        setTokenIn(tokenOut)
        setTokenOut(temp)
    }

    return (
        <div className="w-full max-w-[480px]">
            <div className="flex justify-between items-center mb-2 px-2">
                <span className="font-medium text-white">Swap</span>
                <Settings className="w-5 h-5 text-[#98a1c0] cursor-pointer hover:text-white transition-colors" />
            </div>

            <div className="swap-card relative">
                <div className="token-input mb-1">
                    <label className="text-[#98a1c0] text-sm font-medium mb-1 block">Sell</label>
                    <div className="flex justify-between items-center">
                        <input 
                            type="number" 
                            placeholder="0" 
                            value={amountIn}
                            onChange={(e) => setAmountIn(e.target.value)}
                            className="bg-transparent text-4xl text-white outline-none w-full font-medium placeholder-[#5d6785]" 
                        />
                        <button 
                            onClick={() => setShowModal('in')}
                            className="flex items-center gap-2 bg-[#293249] hover:bg-[#313b57] px-3 py-1 rounded-2xl transition-all shrink-0 ml-2 shadow-sm border border-[#ffffff12]"
                        >
                            <img src={tokenIn.logo} className="w-6 h-6 rounded-full" />
                            <span className="font-semibold text-lg">{tokenIn.symbol}</span>
                            <ChevronDown className="w-5 h-5 text-white" />
                        </button>
                    </div>
                </div>

                <div className="absolute left-1/2 -translate-x-1/2 top-[46%] z-10">
                    <button 
                        onClick={handleSwap}
                        className="bg-[#1f1f20] border-[4px] border-[#0d111c] p-2 rounded-xl hover:scale-110 transition-transform cursor-pointer"
                    >
                        <ArrowDown className="w-5 h-5 text-[#98a1c0]" />
                    </button>
                </div>

                <div className="token-input mt-1">
                    <label className="text-[#98a1c0] text-sm font-medium mb-1 block">Buy</label>
                    <div className="flex justify-between items-center">
                         <input 
                            type="number" 
                            placeholder="0" 
                            readOnly
                            value={amountIn ? (parseFloat(amountIn) * 1850.42).toFixed(2) : ''}
                            className="bg-transparent text-4xl text-white outline-none w-full font-medium placeholder-[#5d6785]" 
                        />
                        <button 
                             onClick={() => setShowModal('out')}
                             className="flex items-center gap-2 bg-[#293249] hover:bg-[#313b57] px-3 py-1 rounded-2xl transition-all shrink-0 ml-2 shadow-sm border border-[#ffffff12]"
                        >
                            <img src={tokenOut.logo} className="w-6 h-6 rounded-full" />
                            <span className="font-semibold text-lg">{tokenOut.symbol}</span>
                             <ChevronDown className="w-5 h-5 text-white" />
                        </button>
                    </div>
                </div>

                <button className="w-full mt-4 bg-[#ff007a]/20 text-[#ff007a] hover:bg-[#ff007a]/30 font-semibold text-xl py-4 rounded-2xl transition-all">
                    Connect Wallet
                </button>
            </div>

            {showModal && (
                <TokenModal 
                    tokens={TOKENS} 
                    onSelect={(t) => {
                        if(showModal === 'in') setTokenIn(t)
                        else setTokenOut(t)
                        setShowModal(null)
                    }} 
                    onClose={() => setShowModal(null)}
                />
            )}
        </div>
    )
}`,
    language: "typescript",
    updatedAt: new Date().toISOString(),
  },
  {
    id: "src/components/TokenModal.tsx",
    name: "src/components/TokenModal.tsx",
    type: "file",
    content: `import { X, Search } from 'lucide-react'
import { Token } from './Swap'


interface Props {
    tokens: Token[]
    onSelect: (t: Token) => void
    onClose: () => void
}

export default function TokenModal({ tokens, onSelect, onClose }: Props) {
    return (
        <div className="fixed inset-0 bg-black/60 backbackdrop-blur-lg z-50 flex items-center justify-center p-4">
            <div className="bg-[#131a2a] w-full max-w-md rounded-2xl border border-[#ffffff12] shadow-2xl flex flex-col max-h-[80vh]">
                <div className="p-5 border-b border-[#ffffff12]">
                    <div className="flex justify-between items-center mb-4">
                        <span className="font-medium text-lg">Select a token</span>
                        <X className="w-6 h-6 cursor-pointer text-[#98a1c0] hover:text-white" onClick={onClose} />
                    </div>
                    <div className="relative">
                        <Search className="w-5 h-5 absolute left-4 top-3.5 text-[#98a1c0]" />
                        <input 
                            placeholder="Search name or paste address" 
                            className="w-full bg-[#0d111c] border border-[#ffffff12] rounded-xl py-3 pl-12 pr-4 text-white placeholder-[#5d6785] focus:border-[#ff007a] outline-none transition-colors"
                        />
                    </div>
                </div>
                
                <div className="flex-1 overflow-y-auto p-2">
                    <div className="flex flex-wrap gap-2 px-3 py-2">
                        {tokens.slice(0, 4).map(t => (
                            <button 
                                key={t.symbol} 
                                onClick={() => onSelect(t)}
                                className="flex items-center gap-2 border border-[#ffffff12] bg-[#1b2236] hover:bg-[#293249] px-3 py-1.5 rounded-2xl transition-colors"
                            >
                                <img src={t.logo} className="w-5 h-5 rounded-full" />
                                <span className="font-medium">{t.symbol}</span>
                            </button>
                        ))}
                    </div>
                    
                    <div className="h-px bg-[#ffffff12] my-2 mx-5" />

                    <div className="flex flex-col">
                        {tokens.map(token => (
                            <button 
                                key={token.symbol}
                                onClick={() => onSelect(token)}
                                className="flex items-center justify-between px-5 py-3 hover:bg-[#ffffff0a] transition-colors"
                            >
                                <div className="flex items-center gap-4">
                                    <img src={token.logo} className="w-9 h-9 rounded-full" />
                                    <div className="text-left">
                                        <div className="font-medium text-white">{token.name}</div>
                                        <div className="text-sm text-[#98a1c0]">{token.symbol}</div>
                                    </div>
                                </div>
                            </button>
                         ))}
                    </div>
                </div>
            </div>
        </div>
    )
}`,
    language: "typescript",
    updatedAt: new Date().toISOString(),
  },
  {
    id: "postcss.config.js",
    name: "postcss.config.js",
    type: "file",
    content: `export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}`,
    language: "javascript",
    updatedAt: new Date().toISOString(),
  },
  {
    id: "tailwind.config.js",
    name: "tailwind.config.js",
    type: "file",
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
    updatedAt: new Date().toISOString(),
  },
];

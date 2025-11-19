// src/config/appkit.js
import { createAppKit } from "@reown/appkit/react";
import { Ethers5Adapter } from "@reown/appkit-adapter-ethers5";
import { defineChain } from '@reown/appkit/networks';

// 1. Get projectId from Reown Dashboard
const projectId = process.env.REACT_APP_REOWN_PROJECT_ID || "92cb38a15cfb30ee3043cf276483c6f9";

const opnNetwork = defineChain({
  id: 403,  // ← CHANGE from 984 to 403
  caipNetworkId: 'eip155:403',  // ← CHANGE to match
  chainNamespace: 'eip155',
  name: 'OPN Chain',  // ← KEEP THIS AS OPN
  nativeCurrency: {
    decimals: 18,
    name: 'OPN',  // ← KEEP THIS AS OPN
    symbol: 'OPN',  // ← KEEP THIS AS OPN
  },
  rpcUrls: {
    default: {
      http: ['https://rpc.cor3innovations.io/'],  // ← CHANGE to SAGE RPC
      webSocket: ['wss://rpc.cor3innovations.io/'],  // ← CHANGE to SAGE WSS
    },
  },
  blockExplorers: {
    default: { name: 'OPN Explorer', url: 'https://explorer.cor3innovations.io/' },  // ← Update explorer
  },
  contracts: {
    // Add the contracts here
  }
})

// 2. Create metadata
const metadata = {
  name: "OPN Tokenization",
  description: "Luxury Asset Tokenization Platform",
  url: window.location.origin,
  icons: ["/logo.png"],
};

// 3. Create the AppKit instance with COMPLETE monochrome theming
export const appKit = createAppKit({
  adapters: [new Ethers5Adapter()],
  metadata: metadata,
  networks: [opnNetwork],
  projectId,
  features: {
    analytics: true,
    email: true,
    socials: ['google', 'apple', 'discord', 'github'],
  },
  themeMode: 'dark',
  // FIXED: Complete monochrome theme variables
themeVariables: {
    // Font - Keep Inter but update the weight system
  '--w3m-font-family': 'Plus Jakarta Sans, -apple-system, BlinkMacSystemFont, sans-serif',
}
});

// Make appKit globally accessible for custom button option
if (typeof window !== 'undefined') {
  window.appKit = appKit;
}

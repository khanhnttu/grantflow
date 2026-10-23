/*
 * Onchain facts for this app.
 *
 * Import a fact instead of typing one:
 *   import { getUsdc, requireChain, buildTxExplorerUrl } from '@/onchain-facts';
 *
 * On Arc, the gas token and ERC-20 USDC are separate views of the same pool.
 * nativeCurrency.decimals = 18 (gas), usdc.decimals = 6 (ERC-20). Never mix them.
 */

export const USDC_DECIMALS = 6;

export interface TokenFact {
  symbol: string;
  address: string;
  decimals: number;
}

export interface NativeCurrencyFact {
  symbol: string;
  decimals: number;
  /** True when the gas token IS USDC (Arc chains). */
  isUsdc: boolean;
}

export interface OnchainChain {
  chainId: number;
  name: string;
  isTestnet: boolean;
  family?: string;
  explorerBase: string;
  rpcUrls: string[];
  nativeCurrency: NativeCurrencyFact;
  usdc?: TokenFact;
  cctpDomain?: number;
  scpBlockchain?: string;
}

export interface ProtocolContractFact {
  name: string;
  address: string;
  protocol: 'CCTP' | 'Gateway';
  networkKind?: 'testnet' | 'mainnet';
}

interface OnchainFacts {
  chains: OnchainChain[];
  protocolContracts: ProtocolContractFact[];
}

const FACTS: OnchainFacts = {
  chains: [
    {
      chainId: 5042002,
      name: 'Arc Testnet',
      isTestnet: true,
      family: 'arc',
      explorerBase: 'https://explorer.testnet.arc.io',
      rpcUrls: ['https://rpc.testnet.arc.io'],
      nativeCurrency: { symbol: 'USDC', decimals: 18, isUsdc: true },
      usdc: { symbol: 'USDC', address: '0x3600000000000000000000000000000000000000', decimals: 6 },
      cctpDomain: 26,
      scpBlockchain: 'ARC-TESTNET',
    },
    {
      chainId: 5042,
      name: 'Arc',
      isTestnet: false,
      family: 'arc',
      explorerBase: 'https://explorer.arc.io',
      rpcUrls: ['https://rpc.mainnet.arc.io'],
      nativeCurrency: { symbol: 'USDC', decimals: 18, isUsdc: true },
      usdc: { symbol: 'USDC', address: '0x3600000000000000000000000000000000000000', decimals: 6 },
      cctpDomain: 26,
    },
    {
      chainId: 11155111,
      name: 'Ethereum Sepolia',
      isTestnet: true,
      explorerBase: 'https://sepolia.etherscan.io',
      rpcUrls: ['https://11155111.rpc.thirdweb.com'],
      nativeCurrency: { symbol: 'ETH', decimals: 18, isUsdc: false },
      usdc: { symbol: 'USDC', address: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238', decimals: 6 },
      cctpDomain: 0,
      scpBlockchain: 'ETH-SEPOLIA',
    },
    {
      chainId: 84532,
      name: 'Base Sepolia',
      isTestnet: true,
      family: 'op-stack',
      explorerBase: 'https://sepolia.basescan.org',
      rpcUrls: ['https://sepolia.base.org'],
      nativeCurrency: { symbol: 'ETH', decimals: 18, isUsdc: false },
      usdc: { symbol: 'USDC', address: '0x036CbD53842c5426634e7929541eC2318f3dCF7e', decimals: 6 },
      cctpDomain: 6,
      scpBlockchain: 'BASE-SEPOLIA',
    },
    {
      chainId: 421614,
      name: 'Arbitrum Sepolia',
      isTestnet: true,
      family: 'arbitrum',
      explorerBase: 'https://sepolia.arbiscan.io',
      rpcUrls: ['https://sepolia-rollup.arbitrum.io/rpc'],
      nativeCurrency: { symbol: 'ETH', decimals: 18, isUsdc: false },
      usdc: { symbol: 'USDC', address: '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d', decimals: 6 },
      cctpDomain: 3,
      scpBlockchain: 'ARB-SEPOLIA',
    },
    {
      chainId: 43113,
      name: 'Avalanche Fuji',
      isTestnet: true,
      explorerBase: 'https://testnet.snowtrace.io',
      rpcUrls: ['https://api.avax-test.network/ext/bc/C/rpc'],
      nativeCurrency: { symbol: 'AVAX', decimals: 18, isUsdc: false },
      usdc: { symbol: 'USDC', address: '0x5425890298aed601595a70AB815c96711a31Bc65', decimals: 6 },
      cctpDomain: 1,
      scpBlockchain: 'AVAX-FUJI',
    },
    {
      chainId: 80002,
      name: 'Polygon Amoy',
      isTestnet: true,
      family: 'polygon',
      explorerBase: 'https://amoy.polygonscan.com',
      rpcUrls: ['https://polygon-amoy.drpc.org'],
      nativeCurrency: { symbol: 'POL', decimals: 18, isUsdc: false },
      usdc: { symbol: 'USDC', address: '0x41e94eb019c0762f9bfcf9fb1e58725bfb0e7582', decimals: 6 },
      cctpDomain: 7,
      scpBlockchain: 'MATIC-AMOY',
    },
    {
      chainId: 11155420,
      name: 'OP Sepolia',
      isTestnet: true,
      family: 'op-stack',
      explorerBase: 'https://sepolia-optimism.etherscan.io',
      rpcUrls: ['https://sepolia.optimism.io'],
      nativeCurrency: { symbol: 'ETH', decimals: 18, isUsdc: false },
      usdc: { symbol: 'USDC', address: '0x5fd84259d66Cd46123540766Be93DFE6D43130D7', decimals: 6 },
      cctpDomain: 2,
      scpBlockchain: 'OP-SEPOLIA',
    },
    {
      chainId: 1,
      name: 'Ethereum',
      isTestnet: false,
      explorerBase: 'https://etherscan.io',
      rpcUrls: ['https://eth.llamarpc.com'],
      nativeCurrency: { symbol: 'ETH', decimals: 18, isUsdc: false },
      usdc: { symbol: 'USDC', address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', decimals: 6 },
      cctpDomain: 0,
    },
    {
      chainId: 8453,
      name: 'Base',
      isTestnet: false,
      family: 'op-stack',
      explorerBase: 'https://basescan.org',
      rpcUrls: ['https://mainnet.base.org'],
      nativeCurrency: { symbol: 'ETH', decimals: 18, isUsdc: false },
      usdc: { symbol: 'USDC', address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', decimals: 6 },
      cctpDomain: 6,
    },
    {
      chainId: 42161,
      name: 'Arbitrum One',
      isTestnet: false,
      family: 'arbitrum',
      explorerBase: 'https://arbiscan.io',
      rpcUrls: ['https://arb1.arbitrum.io/rpc'],
      nativeCurrency: { symbol: 'ETH', decimals: 18, isUsdc: false },
      usdc: { symbol: 'USDC', address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', decimals: 6 },
      cctpDomain: 3,
    },
    {
      chainId: 10,
      name: 'OP Mainnet',
      isTestnet: false,
      family: 'op-stack',
      explorerBase: 'https://optimistic.etherscan.io',
      rpcUrls: ['https://mainnet.optimism.io'],
      nativeCurrency: { symbol: 'ETH', decimals: 18, isUsdc: false },
      usdc: { symbol: 'USDC', address: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85', decimals: 6 },
      cctpDomain: 2,
    },
    {
      chainId: 137,
      name: 'Polygon',
      isTestnet: false,
      family: 'polygon',
      explorerBase: 'https://polygonscan.com',
      rpcUrls: ['https://polygon-rpc.com'],
      nativeCurrency: { symbol: 'POL', decimals: 18, isUsdc: false },
      usdc: { symbol: 'USDC', address: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359', decimals: 6 },
      cctpDomain: 7,
    },
    {
      chainId: 43114,
      name: 'Avalanche',
      isTestnet: false,
      explorerBase: 'https://snowtrace.io',
      rpcUrls: ['https://api.avax.network/ext/bc/C/rpc'],
      nativeCurrency: { symbol: 'AVAX', decimals: 18, isUsdc: false },
      usdc: { symbol: 'USDC', address: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E', decimals: 6 },
      cctpDomain: 1,
    },
  ],
  protocolContracts: [
    // Arc Testnet CCTP
    { name: 'TokenMessenger', address: '0x8e3Dda6368dA9E0C2F9A3Db2bB0e5C22deF81D99', protocol: 'CCTP', networkKind: 'testnet' },
    { name: 'MessageTransmitter', address: '0x0E8f5d6e8E6C8A2c7BdC5E8f1C7E2b5E3C7b1A9E', protocol: 'CCTP', networkKind: 'testnet' },
    // Arc Mainnet CCTP
    { name: 'TokenMessenger', address: '0x8e3Dda6368dA9E0C2F9A3Db2bB0e5C22deF81D99', protocol: 'CCTP', networkKind: 'mainnet' },
    { name: 'MessageTransmitter', address: '0x0E8f5d6e8E6C8A2c7BdC5E8f1C7E2b5E3C7b1A9E', protocol: 'CCTP', networkKind: 'mainnet' },
  ],
};

// ─── Lookup helpers ──────────────────────────────────────────────────────────

export function getChain(chainId: number): OnchainChain | undefined {
  return FACTS.chains.find((c) => c.chainId === chainId);
}

export function requireChain(chainId: number): OnchainChain {
  const chain = getChain(chainId);
  if (!chain) throw new Error(`Chain ${chainId} not found in onchain-facts`);
  return chain;
}

export function getUsdc(chainId: number): TokenFact {
  const chain = requireChain(chainId);
  if (!chain.usdc) throw new Error(`No USDC on chain ${chainId}`);
  return chain.usdc;
}

export function allChains(): OnchainChain[] {
  return FACTS.chains;
}

// ─── Explorer URL builders ────────────────────────────────────────────────────

export function buildTxExplorerUrl(chainId: number, txHash: string): string {
  const chain = requireChain(chainId);
  return `${chain.explorerBase}/tx/${txHash}`;
}

export function buildAddressExplorerUrl(chainId: number, address: string): string {
  const chain = requireChain(chainId);
  return `${chain.explorerBase}/address/${address}`;
}

export function buildBlockExplorerUrl(chainId: number, block: number | bigint): string {
  const chain = requireChain(chainId);
  return `${chain.explorerBase}/block/${block}`;
}

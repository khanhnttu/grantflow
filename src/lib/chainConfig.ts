/**
 * Chain configuration for GrantFlow.
 * Set VITE_CHAIN=mainnet in .env to target Arc Mainnet.
 * Defaults to Arc Testnet.
 *
 * Contract addresses are read from env vars so each deployment
 * can be set independently without touching source code.
 */
import { requireChain, getUsdc } from '@/onchain-facts';

const ARC_TESTNET_ID = 5042002;
const ARC_MAINNET_ID = 5042;

const isMainnet = import.meta.env.VITE_CHAIN === 'mainnet';

export const ACTIVE_CHAIN_ID: number = isMainnet ? ARC_MAINNET_ID : ARC_TESTNET_ID;
export const IS_MAINNET: boolean = isMainnet;
export const CHAIN_LABEL: string = isMainnet ? 'Arc Mainnet' : 'Arc Testnet';

export const activeChain = requireChain(ACTIVE_CHAIN_ID);

const usdcFact = getUsdc(ACTIVE_CHAIN_ID);
if (!usdcFact) throw new Error(`No USDC fact for chain ${ACTIVE_CHAIN_ID}`);
export const USDC_ADDRESS = usdcFact.address as `0x${string}`;
export const USDC_DECIMALS = usdcFact.decimals;

/** GrantFlow V3 contract address for the active chain. */
export const GRANTFLOW_ADDRESS = (() => {
  const raw: unknown = isMainnet
    ? import.meta.env.VITE_GRANTFLOW_ADDRESS_MAINNET
    : import.meta.env.VITE_GRANTFLOW_ADDRESS;
  const addr = typeof raw === 'string' ? raw : '0x0000000000000000000000000000000000000000';
  return addr as `0x${string}`;
})();

/** GrantFlow V4 contract address for the active chain. */
export const GRANTFLOW_V4_ADDRESS = (() => {
  const raw: unknown = isMainnet
    ? import.meta.env.VITE_GRANTFLOW_V4_ADDRESS_MAINNET
    : import.meta.env.VITE_GRANTFLOW_V4_ADDRESS;
  const addr = typeof raw === 'string' ? raw : '0x0000000000000000000000000000000000000000';
  return addr as `0x${string}`;
})();

/** Explorer base URL for the active chain. */
export const EXPLORER_BASE: string = activeChain.explorerBase;

/** Build a transaction explorer URL. */
export function txUrl(hash: string): string {
  return `${EXPLORER_BASE}/tx/${hash}`;
}

/** Build an address explorer URL. */
export function addrUrl(address: string): string {
  return `${EXPLORER_BASE}/address/${address}`;
}

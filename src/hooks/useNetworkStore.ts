/**
 * useNetworkStore — React context that holds the user-selected network
 * (mainnet | testnet). Persisted in localStorage under 'gf-network'.
 *
 * Defaults to 'mainnet' when VITE_CHAIN=mainnet (production build),
 * otherwise 'testnet'.
 */
import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import type { ReactNode } from 'react';
import { createPublicClient, http } from 'viem';
import type { PublicClient } from 'viem';

export type NetworkChoice = 'mainnet' | 'testnet';

const LS_KEY = 'gf-network';

// Build-time default: honour VITE_CHAIN if set, else testnet
const BUILD_DEFAULT: NetworkChoice =
  import.meta.env.VITE_CHAIN === 'mainnet' ? 'mainnet' : 'testnet';

function readStored(): NetworkChoice {
  try {
    const v = localStorage.getItem(LS_KEY);
    if (v === 'mainnet' || v === 'testnet') return v;
  } catch { /* ignore */ }
  return BUILD_DEFAULT;
}

// ── Static network configs ────────────────────────────────────────────────────

export interface NetworkConfig {
  name: NetworkChoice;
  label: string;
  chainId: number;
  rpcUrl: string;
  explorerBase: string;
  explorerName: string;
  usdcAddress: `0x${string}`;
  usdcDecimals: number;
  nativeDecimals: number;
  v4Address: `0x${string}`;
  v3Address: `0x${string}`;
}

const MAINNET_V4 = (import.meta.env.VITE_GRANTFLOW_V4_ADDRESS_MAINNET ||
  '0x41ffdab65fca60bda9beb455285d29ab753c3d2e') as `0x${string}`;
const MAINNET_V3 = (import.meta.env.VITE_GRANTFLOW_ADDRESS_MAINNET ||
  '0x7c2866a62e6ad73e15e243d4341219eb3995fe7d') as `0x${string}`;
const TESTNET_V4 = (import.meta.env.VITE_GRANTFLOW_V4_ADDRESS ||
  '0x0754d3359f18be2079c6d3cea29658b464cfe946') as `0x${string}`;
const TESTNET_V3 = (import.meta.env.VITE_GRANTFLOW_ADDRESS ||
  '0x3805f86f71b47480a2b31d563ce1620b490a841f') as `0x${string}`;

const USDC = '0x3600000000000000000000000000000000000000' as `0x${string}`;

export const NETWORK_CONFIGS: Record<NetworkChoice, NetworkConfig> = {
  mainnet: {
    name:           'mainnet',
    label:          'Arc Mainnet',
    chainId:        5042,
    rpcUrl:         'https://rpc.mainnet.arc.io',
    explorerBase:   'https://explorer.arc.io',
    explorerName:   'Arc Explorer',
    usdcAddress:    USDC,
    usdcDecimals:   6,
    nativeDecimals: 18,
    v4Address:      MAINNET_V4,
    v3Address:      MAINNET_V3,
  },
  testnet: {
    name:           'testnet',
    label:          'Arc Testnet',
    chainId:        5042002,
    rpcUrl:         'https://rpc.testnet.arc.io',
    explorerBase:   'https://explorer.testnet.arc.io',
    explorerName:   'Arc Testnet Explorer',
    usdcAddress:    USDC,
    usdcDecimals:   6,
    nativeDecimals: 18,
    v4Address:      TESTNET_V4,
    v3Address:      TESTNET_V3,
  },
};

// ── Context ───────────────────────────────────────────────────────────────────

interface NetworkStoreValue {
  network: NetworkChoice;
  config: NetworkConfig;
  setNetwork: (n: NetworkChoice) => void;
  /** A viem PublicClient pointed at the selected network's RPC — independent of the wallet chain. */
  appClient: PublicClient;
}

import { createElement } from 'react';

function makeAppClient(cfg: NetworkConfig): PublicClient {
  return createPublicClient({ transport: http(cfg.rpcUrl) });
}

const _defaultCfg = NETWORK_CONFIGS[BUILD_DEFAULT];
const NetworkStoreContext = createContext<NetworkStoreValue>({
  network:   BUILD_DEFAULT,
  config:    _defaultCfg,
  setNetwork: () => {},
  appClient: makeAppClient(_defaultCfg),
});

export function NetworkStoreProvider({ children }: { children: ReactNode }) {
  const [network, setNetworkState] = useState<NetworkChoice>(readStored);

  const setNetwork = useCallback((n: NetworkChoice) => {
    setNetworkState(n);
    try { localStorage.setItem(LS_KEY, n); } catch { /* ignore */ }
  }, []);

  // Sync html lang and data-network attributes
  useEffect(() => {
    document.documentElement.setAttribute('data-network', network);
  }, [network]);

  const config = NETWORK_CONFIGS[network];
  // Re-create the viem client only when the selected network changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const appClient = useMemo(() => makeAppClient(config), [network]);

  const value: NetworkStoreValue = {
    network,
    config,
    setNetwork,
    appClient,
  };

  return createElement(NetworkStoreContext.Provider, { value }, children);
}

export function useNetworkStore(): NetworkStoreValue {
  return useContext(NetworkStoreContext);
}

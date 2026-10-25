/**
 * useWrongNetwork — compares the wallet's current chainId against the
 * user-selected network (from useNetworkStore). Exposes:
 *   isWrong          — true when wallet is on a different chain
 *   walletChainLabel — human label for the wallet's current chain
 *   appChainLabel    — human label for the app's selected network
 *   switchNetwork()  — calls wallet_switchEthereumChain, falls back to
 *                       wallet_addEthereumChain if the chain isn't known
 */
import { useAccount, useConnectorClient } from 'wagmi';
import { useCallback } from 'react';
import { useNetworkStore, NETWORK_CONFIGS } from './useNetworkStore';

/** Map a chain ID to a human-readable label. */
function chainLabel(chainId: number | undefined): string {
  if (chainId === undefined) return 'Unknown network';
  if (chainId === 5042)    return 'Arc Mainnet';
  if (chainId === 5042002) return 'Arc Testnet';
  if (chainId === 1)       return 'Ethereum Mainnet';
  if (chainId === 137)     return 'Polygon';
  if (chainId === 8453)    return 'Base';
  if (chainId === 42161)   return 'Arbitrum One';
  return `Chain ${chainId}`;
}

export interface WrongNetworkState {
  isWrong: boolean;
  walletChainId: number | undefined;
  walletChainLabel: string;
  appChainId: number;
  appChainLabel: string;
  /** Call to request the wallet switch. Returns true on success. */
  switchNetwork: () => Promise<boolean>;
}

export function useWrongNetwork(): WrongNetworkState {
  // useAccount gives us both status AND chainId — only flag mismatch when
  // the wallet is fully connected, preventing the loading-flash false positive.
  const { chainId: walletChainId, status } = useAccount();
  const { config }    = useNetworkStore();
  const { data: connectorClient } = useConnectorClient();

  const appChainId = config.chainId;
  // Only show the banner when the wallet is connected AND on the wrong chain.
  const isWrong = status === 'connected' &&
    walletChainId !== undefined &&
    walletChainId !== appChainId;

  const switchNetwork = useCallback(async (): Promise<boolean> => {
    const provider = connectorClient?.transport as
      | { request?: (args: { method: string; params: unknown[] }) => Promise<unknown> }
      | undefined;

    if (!provider?.request) return false;

    const hexChainId = `0x${appChainId.toString(16)}`;
    try {
      await provider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: hexChainId }],
      });
      return true;
    } catch (switchErr: unknown) {
      // 4902 = chain not added in wallet — attempt to add it
      const code = (switchErr as { code?: number })?.code;
      if (code === 4902) {
        const cfg = NETWORK_CONFIGS[config.name];
        try {
          await provider.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId:           hexChainId,
              chainName:         cfg.label,
              nativeCurrency:    { name: 'USDC', symbol: 'USDC', decimals: cfg.nativeDecimals },
              rpcUrls:           [cfg.rpcUrl],
              blockExplorerUrls: [cfg.explorerBase],
            }],
          });
          return true;
        } catch {
          return false;
        }
      }
      return false;
    }
  }, [appChainId, config, connectorClient]);

  return {
    isWrong,
    walletChainId,
    walletChainLabel: chainLabel(walletChainId),
    appChainId,
    appChainLabel:    config.label,
    switchNetwork,
  };
}

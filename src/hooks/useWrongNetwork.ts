/**
 * useWrongNetwork — compares the wallet's current chainId against the
 * user-selected network (from useNetworkStore). Exposes:
 *   isWrong          — true when wallet is connected AND on a different chain
 *   walletChainId    — raw chainId the wallet reported (or undefined)
 *   walletChainLabel — human label for the wallet's current chain
 *   appChainId       — the chain the app expects
 *   appChainLabel    — human label for the app's selected network
 *   isMisconfigured  — true when the wallet label says the right network name
 *                      but reports the wrong chain ID (e.g. MetaMask "Arc Mainnet"
 *                      entry pointing at chain 5042002 instead of 5042)
 *   switchNetwork()  — calls wallet_switchEthereumChain, falls back to
 *                       wallet_addEthereumChain (4902 / unrecognized), then
 *                       retries the switch so the wallet actually activates it
 *
 * Keeps its own eth_chainId reading on:
 *   - mount / connection change
 *   - chainChanged event (MetaMask)
 *   - window focus (catches MetaMask "Edit network" saves that don't fire chainChanged)
 */
import { useAccount, useConnectorClient } from 'wagmi';
import { useState, useEffect, useCallback } from 'react';
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

/** Read eth_chainId directly from the EIP-1193 provider (hex string → number). */
async function readChainId(
  provider: { request: (args: { method: string; params?: unknown[] }) => Promise<unknown> }
): Promise<number | undefined> {
  try {
    const hex = await provider.request({ method: 'eth_chainId' });
    if (typeof hex === 'string') return parseInt(hex, 16);
  } catch { /* ignore */ }
  return undefined;
}

export interface WrongNetworkState {
  isWrong: boolean;
  walletChainId: number | undefined;
  walletChainLabel: string;
  appChainId: number;
  appChainLabel: string;
  /** True when wallet label matches the expected network but chainId is wrong
   *  (typical when a MetaMask entry for "Arc Mainnet" has the wrong RPC/chainId). */
  isMisconfigured: boolean;
  /** Call to request the wallet switch. Returns true on success. */
  switchNetwork: () => Promise<boolean>;
}

export function useWrongNetwork(): WrongNetworkState {
  const { status } = useAccount();
  const { config } = useNetworkStore();
  const { data: connectorClient } = useConnectorClient();

  const appChainId = config.chainId;

  // Own chainId state — refreshed from eth_chainId, not just from wagmi
  // (wagmi can lag or cache stale values when MetaMask edits a network entry)
  const [walletChainId, setWalletChainId] = useState<number | undefined>(undefined);

  // Helper to re-read chainId from the active provider
  const refreshChainId = useCallback(async () => {
    const provider = connectorClient?.transport as
      | { request?: (args: { method: string; params?: unknown[] }) => Promise<unknown> }
      | undefined;
    if (!provider?.request) return;
    const id = await readChainId(provider as { request: (args: { method: string; params?: unknown[] }) => Promise<unknown> });
    if (id !== undefined) setWalletChainId(id);
  }, [connectorClient]);

  // Clear chainId when wallet disconnects
  // eslint-disable-next-line react-compiler/react-compiler,react/set-state-in-effect
  useEffect(() => { if (status !== 'connected') setWalletChainId(undefined); }, [status]); // eslint-disable-line react-hooks/exhaustive-deps

  // Refresh chainId whenever connector changes (connect / switch network)
  // eslint-disable-next-line react-compiler/react-compiler
  useEffect(() => {
    // eslint-disable-next-line react/set-state-in-effect
    if (status === 'connected') void refreshChainId();
  }, [status, refreshChainId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Listen for MetaMask chainChanged — fires when the user switches networks
  // inside the wallet or edits the selected network entry.
  useEffect(() => {
    const ethereum = (window as unknown as { ethereum?: { on?: (event: string, handler: (chainId: unknown) => void) => void; removeListener?: (event: string, handler: (chainId: unknown) => void) => void } }).ethereum;
    if (!ethereum?.on) return;
    const onChainChanged = (hexChainId: unknown) => {
      if (typeof hexChainId === 'string') {
        setWalletChainId(parseInt(hexChainId, 16));
      } else {
        void refreshChainId();
      }
    };
    ethereum.on('chainChanged', onChainChanged);
    return () => { ethereum.removeListener?.('chainChanged', onChainChanged); };
  }, [refreshChainId]);

  // Re-read on window focus — catches "Edit network" RPC/chainId saves in MetaMask
  // which change the underlying chainId without firing chainChanged
  useEffect(() => {
    if (status !== 'connected') return;
    const onFocus = () => { void refreshChainId(); };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [status, refreshChainId]);

  const isWrong = status === 'connected' &&
    walletChainId !== undefined &&
    walletChainId !== appChainId;

  // Detect misconfigured network: wallet shows a chain whose name matches but
  // whose chainId is wrong (e.g. a MetaMask "Arc Mainnet" entry with RPC
  // pointing to the testnet which returns chainId 5042002).
  const walletLabel = chainLabel(walletChainId);
  const appLabel    = config.label;
  const isMisconfigured = isWrong &&
    walletLabel.toLowerCase() === appLabel.toLowerCase();

  const switchNetwork = useCallback(async (): Promise<boolean> => {
    const provider = connectorClient?.transport as
      | { request?: (args: { method: string; params: unknown[] }) => Promise<unknown> }
      | undefined;
    if (!provider?.request) return false;

    const hexChainId = `0x${appChainId.toString(16)}`;
    const cfg = NETWORK_CONFIGS[config.name];

    // Try switching first
    try {
      await provider.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: hexChainId }] });
      await refreshChainId();
      return true;
    } catch (switchErr: unknown) {
      const code = (switchErr as { code?: number })?.code;
      // 4902 = chain not added; -32603 = "unrecognized chain ID" in some wallets
      const notAdded = code === 4902 || code === -32603 ||
        (switchErr instanceof Error && switchErr.message.toLowerCase().includes('unrecognized chain'));
      if (!notAdded) return false;

      // Add the chain, then retry the switch
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
        // After add, retry the switch (wallet may not auto-activate the new chain)
        try {
          await provider.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: hexChainId }] });
        } catch { /* if it still fails, the add itself may have activated it */ }
        await refreshChainId();
        return true;
      } catch {
        return false;
      }
    }
  }, [appChainId, config, connectorClient, refreshChainId]);

  return {
    isWrong,
    walletChainId,
    walletChainLabel: chainLabel(walletChainId),
    appChainId,
    appChainLabel:    appLabel,
    isMisconfigured,
    switchNetwork,
  };
}

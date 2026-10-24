/**
 * useNetworkHealth — polls the RPC for the latest block number every 6s.
 * Returns { blockNumber, health: 'healthy' | 'slow' | 'down', lastUpdated }.
 */
import { useState, useEffect, useRef } from 'react';
import { usePublicClient } from 'wagmi';

export type HealthStatus = 'healthy' | 'slow' | 'down';

export interface NetworkHealth {
  blockNumber: bigint | null;
  health: HealthStatus;
  lastUpdated: Date | null;
}

const POLL_MS  = 6_000;
const SLOW_MS  = 4_000;

export function useNetworkHealth(): NetworkHealth {
  const client = usePublicClient();
  const [state, setState] = useState<NetworkHealth>({
    blockNumber: null,
    health: 'healthy',
    lastUpdated: null,
  });
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!client) return;

    let cancelled = false;

    async function poll() {
      if (cancelled || !client) return;
      const t0 = Date.now();
      try {
        const block = await client.getBlockNumber();
        const elapsed = Date.now() - t0;
        if (cancelled) return;
        setState({
          blockNumber: block,
          health: elapsed > SLOW_MS ? 'slow' : 'healthy',
          lastUpdated: new Date(),
        });
      } catch {
        if (cancelled) return;
        setState(prev => ({ ...prev, health: 'down', lastUpdated: new Date() }));
      }
      if (!cancelled) {
        timerRef.current = setTimeout(() => { void poll(); }, POLL_MS);
      }
    }

    void poll();

    return () => {
      cancelled = true;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [client]);

  return state;
}

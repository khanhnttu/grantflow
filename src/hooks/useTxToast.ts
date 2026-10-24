/**
 * useTxToast — pending / confirmed / failed toast notifications
 * with explorer links. Uses sonner (already wired in main.tsx).
 */
import { toast } from 'sonner';
import { useChainId, useSwitchChain } from 'wagmi';
import { parseWalletError, explorerTxUrl } from '@/lib/walletErrors';
import { ACTIVE_CHAIN_ID } from '@/lib/chainConfig';

export function useTxToast() {
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();

  function pending(label: string): string | number {
    return toast.loading(`${label}…`, { description: 'Waiting for wallet confirmation' });
  }

  function confirmed(label: string, txHash: string, toastId: string | number) {
    const url = explorerTxUrl(txHash, chainId);
    toast.success(label, {
      id: toastId,
      description: 'Transaction confirmed',
      action: {
        label: 'View on explorer',
        onClick: () => window.open(url, '_blank'),
      },
    });
  }

  function failed(err: unknown, toastId?: string | number) {
    const msg = parseWalletError(err);
    const isWrongNetwork = msg.includes('Wrong network') || msg.includes('switch');

    if (isWrongNetwork) {
      toast.error(msg, {
        id: toastId,
        action: {
          label: `Switch to ${ACTIVE_CHAIN_ID === 5042 ? 'Arc Mainnet' : 'Arc Testnet'}`,
          onClick: () => switchChain({ chainId: ACTIVE_CHAIN_ID }),
        },
      });
    } else {
      toast.error(msg, { id: toastId });
    }
  }

  async function wrap<T>(
    label: string,
    fn: () => Promise<T>,
  ): Promise<T | null> {
    const id = pending(label);
    try {
      const result = await fn();
      // fn should return a tx hash string, or we just confirm generically
      if (typeof result === 'string' && result.startsWith('0x')) {
        confirmed(label, result, id);
      } else {
        toast.success(label, { id, description: 'Done' });
      }
      return result;
    } catch (err) {
      failed(err, id);
      return null;
    }
  }

  return { pending, confirmed, failed, wrap };
}

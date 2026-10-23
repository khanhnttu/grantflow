/**
 * ABI fragment for deploying GrantFlow — includes the constructor entry.
 *
 * The main GRANTFLOW_ABI in grantflow.ts intentionally omits the constructor
 * (wagmi read/write hooks do not need it). deployContract and encodeDeployData
 * require a constructor entry to be present; this module provides one derived
 * from the Foundry artifact (contracts/out/GrantFlow.sol/GrantFlow.json).
 *
 * Keep in sync with the contract constructor signature:
 *   constructor(address usdc_, address feeRecipient_, uint256 feeBps_)
 */

export const GRANTFLOW_DEPLOY_ABI = [
  {
    type: 'constructor',
    inputs: [
      { name: 'usdc_',         type: 'address', internalType: 'address' },
      { name: 'feeRecipient_', type: 'address', internalType: 'address' },
      { name: 'feeBps_',       type: 'uint256', internalType: 'uint256' },
    ],
    stateMutability: 'nonpayable',
  },
] as const;

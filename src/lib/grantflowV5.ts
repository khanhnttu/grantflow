/**
 * grantflowV5.ts — minimal ABI for deploying GrantFlowV5 from the browser wallet.
 * Full ABI + hooks live in src/hooks/useGrantFlowV5.ts.
 */

export const GRANTFLOW_V5_DEPLOY_ABI = [
  {
    type: 'constructor',
    inputs: [
      { name: 'usdc_',         type: 'address' },
      { name: 'feeRecipient_', type: 'address' },
      { name: 'feeBps_',       type: 'uint256' },
    ],
    stateMutability: 'nonpayable',
  },
] as const;

import { useState, useCallback } from 'react';
import { useSendTransaction, useAccount, usePublicClient } from 'wagmi';
import { createLpAction } from '@/server/actions/uniswap-lp';
import { LpCreateRequest, LpResponse } from '@/server/services/uniswap/types';
import { Address, Hex } from 'viem';
import { recordProtocolTransaction } from '@/server/actions/transactions';

export type LpExecutionStatus = 
  | 'IDLE'
  | 'CONFIGURING_LP'
  | 'SUBMITTING'
  | 'SUCCESS'
  | 'ERROR';

export interface UseUniswapLpResult {
  status: LpExecutionStatus;
  error: string | null;
  txHash: string | null;
  createPosition: (params: LpCreateRequest) => Promise<LpResponse | null>;
  reset: () => void;
}

export function useUniswapLp(): UseUniswapLpResult {
  const [status, setStatus] = useState<LpExecutionStatus>('IDLE');
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  const { address } = useAccount();
  const { sendTransactionAsync } = useSendTransaction();
  const publicClient = usePublicClient();

  const reset = useCallback(() => {
    setStatus('IDLE');
    setError(null);
    setTxHash(null);
  }, []);

  const createPosition = useCallback(async (params: LpCreateRequest): Promise<LpResponse | null> => {
    if (!address || !publicClient) {
      setError('Wallet not connected');
      setStatus('ERROR');
      return null;
    }

    try {
      reset();
      setStatus('CONFIGURING_LP');

      // Request the LP creation transaction from the Uniswap Server Action
      const submitResponse = await createLpAction(params);

      if (!submitResponse.success || !submitResponse.data) {
        throw new Error(submitResponse.error || 'Failed to prepare LP transaction. Ensure you have sufficient token allowances for the NonfungiblePositionManager.');
      }

      const txData = submitResponse.data.transaction;
      if (!txData?.data || txData.data === '0x') {
        throw new Error('Received empty transaction data from the Uniswap API.');
      }

      // Submit execution
      setStatus('SUBMITTING');
      const hash = await sendTransactionAsync({
        to: txData.to as Address,
        data: txData.data as Hex,
        value: BigInt(txData.value || '0'),
      });

      setTxHash(hash);
      setStatus('SUCCESS');

      // Best-effort background tracking
      recordProtocolTransaction({
         address: address,
         txHash: hash,
         chainId: params.chainId,
         type: 'lp_create',
         fromToken: params.token0,
         toToken: params.token1,
         metadata: {
           amount0Preferred: params.amount0Preferred,
           amount1Preferred: params.amount1Preferred,
           tickLower: params.tickLower,
           tickUpper: params.tickUpper,
         }
      }).catch(err => console.warn('Failed to record LP tx', err));

      return submitResponse.data;

    } catch (err: unknown) {
      console.error('LP execution failed:', err);
      setError((err as Error).message || 'LP execution failed');
      setStatus('ERROR');
      return null;
    }
  }, [address, publicClient, sendTransactionAsync, reset]);

  return {
    status,
    error,
    txHash,
    createPosition,
    reset
  };
}

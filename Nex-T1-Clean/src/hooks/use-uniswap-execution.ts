import { useState, useCallback } from 'react';
import { useSendTransaction, useSignTypedData, useAccount, usePublicClient } from 'wagmi';
import { checkApprovalAction, submitSwapAction } from '@/server/actions/uniswap';
import { QuoteResponse, SwapResponse } from '@/server/services/uniswap/types';
import { Address, Hex } from 'viem';
import { recordProtocolTransaction } from '@/server/actions/transactions';
import { logger } from '@/lib/logger';
import { toProviderTokenAddress } from "@/modules/tokens/utils/asset-id";

export type SwapExecutionStatus = 
  | 'IDLE'
  | 'CHECKING_APPROVAL'
  | 'APPROVING'
  | 'WAITING_APPROVAL'
  | 'SIGNING_PERMIT'
  | 'CONFIGURING_SWAP'
  | 'SUBMITTING'
  | 'SUCCESS'
  | 'ERROR';

export interface UseUniswapExecutionResult {
  status: SwapExecutionStatus;
  error: string | null;
  txHash: string | null;
  executeSwap: (params: {
    quote: QuoteResponse;
    tokenInAddress: string;
    tokenInChainId: number;
    amountInRaw: string;
    chainId: number;
  }) => Promise<SwapResponse | null>;
  reset: () => void;
}

export function useUniswapExecution(): UseUniswapExecutionResult {
  const [status, setStatus] = useState<SwapExecutionStatus>('IDLE');
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  const { address } = useAccount();
  const { sendTransactionAsync } = useSendTransaction();
  const { signTypedDataAsync } = useSignTypedData();
  const publicClient = usePublicClient();

  const reset = useCallback(() => {
    setStatus('IDLE');
    setError(null);
    setTxHash(null);
  }, []);

  const executeSwap = useCallback(async ({
    quote,
    tokenInAddress,
    tokenInChainId,
    amountInRaw,
    chainId
  }: {
    quote: QuoteResponse;
    tokenInAddress: string;
    tokenInChainId: number;
    amountInRaw: string;
    chainId: number;
  }): Promise<SwapResponse | null> => {
    if (!address || !publicClient) {
      setError('Wallet not connected');
      setStatus('ERROR');
      return null;
    }

    try {
      reset();
      setStatus('CHECKING_APPROVAL');
      const providerTokenAddress = toProviderTokenAddress({
        address: tokenInAddress,
        chainId: tokenInChainId,
      });

      // 1. Check if token approval is needed
      const approvalResponse = await checkApprovalAction({
        walletAddress: address,
        token: providerTokenAddress as Address,
        amount: amountInRaw,
        chainId
      });

      if (!approvalResponse.success || !approvalResponse.data) {
        throw new Error(approvalResponse.error || 'Failed to check approval');
      }

      // 2. Execute Approval if required
      if (approvalResponse.data.approval) {
        setStatus('APPROVING');
        const hash = await sendTransactionAsync({
          to: approvalResponse.data.approval.to as Address,
          data: approvalResponse.data.approval.data as Hex,
          value: BigInt(approvalResponse.data.approval.value || '0'),
        });

        setStatus('WAITING_APPROVAL');
        const receipt = await publicClient.waitForTransactionReceipt({ hash });
        if (receipt.status !== 'success') {
          throw new Error('Approval transaction failed');
        }
      }

      // 3. Get Permit2 Signature if required
      let signature: string | undefined = undefined;
      // We check if permitData exists before trying to sign
      if (quote.permitData && typeof quote.permitData === 'object') {
        setStatus('SIGNING_PERMIT');
        
        // Uniswap Trading API `permitData` structures perfectly to wagmi `signTypedData`
        signature = await signTypedDataAsync({
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          domain: quote.permitData.domain as any,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          types: quote.permitData.types as any,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          primaryType: 'PermitSingle' as any,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          message: quote.permitData.values as any,
        });
      }

      // 4. Request the actual execution payload from /swap 
      setStatus('CONFIGURING_SWAP');
      const submitResponse = await submitSwapAction(quote, signature);

      if (!submitResponse.success || !submitResponse.data) {
        throw new Error(submitResponse.error || 'Failed to prep swap transaction');
      }

      const swapData = submitResponse.data.swap;
      if (!swapData?.data || swapData.data === '0x') {
        throw new Error('Received empty swap data, quote may have expired. Please refresh.');
      }

      // 5. Submit final Swap Transaction
      setStatus('SUBMITTING');
      const swapHash = await sendTransactionAsync({
        to: swapData.to as Address,
        data: swapData.data as Hex,
        value: BigInt(swapData.value || '0'),
      });

      setTxHash(swapHash);
      setStatus('SUCCESS');

      // Best-effort tracking for portfolio history
      recordProtocolTransaction({
        address: address,
        txHash: swapHash,
        chainId: chainId,
        type: 'swap',
        fromToken: providerTokenAddress,
        toToken: quote.quote.route[0]?.[0]?.tokenOut?.address || quote.quote.output.token,
        fromAmount: amountInRaw,
        metadata: {
           routing: quote.routing,
           amountOutRaw: quote.quote.output.amount
        }
      }).catch((err: unknown) =>
        logger.warn({ error: err instanceof Error ? err.message : String(err) }, 'swap_tx_record_failed'),
      );

      return submitResponse.data;

    } catch (err: unknown) {
      logger.error(
        { error: err instanceof Error ? err.message : String(err) },
        'swap_execution_failed',
      );
      setError((err as Error).message || 'Swap execution failed');
      setStatus('ERROR');
      return null;
    }
  }, [address, publicClient, sendTransactionAsync, signTypedDataAsync, reset]);

  return {
    status,
    error,
    txHash,
    executeSwap,
    reset
  };
}

"use server";

import {

  getEvmWalletTokenApprovals,
  getEvmDefiPositionsSummary
} from "@/server/moralis/evm/wallet";

import { logger } from '@/lib/logger';
export async function getWalletProtocolsAction(address: string, chainId: string | number) {
    try {
        const data = await getEvmDefiPositionsSummary({ address, chain: chainId });
        return { success: true, data };
    } catch (error) {
        logger.error("Failed to fetch wallet protocols:", error);
        return { success: false, error: "Failed to fetch protocols" };
    }
}

export async function getWalletApprovalsAction(address: string, chainId: string | number) {
    try {
        const result = await getEvmWalletTokenApprovals({ address, chain: chainId });
        return { success: true, data: result.items };
    } catch (error) {
        logger.error("Failed to fetch wallet approvals:", error);
        return { success: false, error: "Failed to fetch approvals" };
    }
}

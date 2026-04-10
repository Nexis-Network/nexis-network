/**
 * Human-in-the-Loop (HITL) Approval System
 *
 * Ensures user consent for high-risk tool executions:
 * - Wallet operations (transfers, approvals)
 * - Contract deployments
 * - High-value transactions
 * - Permission changes
 */

import "server-only";

import { z } from "zod";
import { asJsonObject, getJsonNumber, getJsonObject, getJsonString } from "@/lib/json";
import { jsonRecordSchema } from "@/lib/validation/json";
import { createClient } from "@/server/services/supabase/server";
import { logger } from "@/lib/observability/logger";
import { ErrorTracker } from "@/lib/observability/logger";
import type { JsonObject } from "@/types/json";
export enum ApprovalStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled',
}

export enum ApprovalType {
  WALLET_TRANSFER = 'wallet_transfer',
  CONTRACT_DEPLOYMENT = 'contract_deployment',
  TOKEN_APPROVAL = 'token_approval',
  PERMISSION_CHANGE = 'permission_change',
  HIGH_VALUE_TRANSACTION = 'high_value_transaction',
}

export interface ApprovalRequest {
  id: string;
  userId: string;
  type: ApprovalType;
  title: string;
  description: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  status: ApprovalStatus;
  requestedBy: string; // AI agent name
  metadata: JsonObject;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
  approvedAt?: Date;
  approvedBy?: string;
  rejectionReason?: string;
}

export interface CreateApprovalRequest {
  userId: string;
  type: ApprovalType;
  title: string;
  description: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  requestedBy: string;
  metadata: JsonObject;
  expiresInMinutes?: number; // Default 30 minutes
}

const CreateApprovalSchema = z.object({
  userId: z.string().uuid(),
  type: z.nativeEnum(ApprovalType),
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(1000),
  riskLevel: z.enum(['low', 'medium', 'high', 'critical']),
  requestedBy: z.string().min(1).max(100),
  metadata: jsonRecordSchema,
  expiresInMinutes: z.number().min(1).max(1440).optional().default(30),
});

/**
 * HITL Approval Manager
 */
export class HITLApprovalManager {
  private static readonly DEFAULT_EXPIRY_MINUTES = 30;
  private static readonly HIGH_RISK_EXPIRY_MINUTES = 60; // 1 hour for high-risk

  /**
   * Create a new approval request
   */
  static async createApproval(request: CreateApprovalRequest): Promise<ApprovalRequest> {
    try {
      const validatedRequest = CreateApprovalSchema.parse(request);

      const supabase = await createClient();
      if (!supabase) {
        throw new Error('Database connection unavailable');
      }

      // Calculate expiry based on risk level
      const expiresInMinutes = validatedRequest.expiresInMinutes ||
        (validatedRequest.riskLevel === 'high' || validatedRequest.riskLevel === 'critical'
          ? this.HIGH_RISK_EXPIRY_MINUTES
          : this.DEFAULT_EXPIRY_MINUTES);

      const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);

      const approvalData = {
        user_id: validatedRequest.userId,
        approval_type: validatedRequest.type,
        title: validatedRequest.title,
        description: validatedRequest.description,
        risk_level: validatedRequest.riskLevel,
        status: ApprovalStatus.PENDING,
        requested_by: validatedRequest.requestedBy,
        metadata: validatedRequest.metadata,
        expires_at: expiresAt.toISOString(),
      };

      const { data, error } = await supabase
        .from('tool_approvals')
        .insert(approvalData)
        .select()
        .single();

      if (error) {
        logger.error('Failed to create approval request', error, {
          userId: validatedRequest.userId,
          component: 'hitl_manager',
          metadata: {
            approvalType: validatedRequest.type,
          },
        });
        throw new Error(`Failed to create approval: ${error.message}`);
      }

        logger.info('Approval request created', {
          userId: validatedRequest.userId,
          component: 'hitl_manager',
          metadata: {
            approvalId: data.id,
            type: validatedRequest.type,
            riskLevel: validatedRequest.riskLevel,
          },
        });

      return this.mapDatabaseRowToApproval(data);
    } catch (error) {
      const trackedError = error instanceof Error ? error : new Error('Failed to create approval');
      ErrorTracker.track(trackedError, {
        operation: 'create_approval',
        userId: request.userId,
        component: 'hitl_manager',
        metadata: {
          approvalType: request.type,
          error: trackedError.message,
        },
      });
      throw trackedError;
    }
  }

  /**
   * Get approval request by ID
   */
  static async getApproval(approvalId: string, userId?: string): Promise<ApprovalRequest | null> {
    try {
      const supabase = await createClient();
      if (!supabase) return null;

      let query = supabase
        .from('tool_approvals')
        .select('*')
        .eq('id', approvalId);

      // If userId provided, ensure user can only see their own approvals
      if (userId) {
        query = query.eq('user_id', userId);
      }

      const { data, error } = await query.single();

      if (error || !data) {
        return null;
      }

      return this.mapDatabaseRowToApproval(data);
    } catch (error) {
      const err = error instanceof Error ? error : undefined;
      logger.error('Failed to get approval', err, {
        userId,
        component: 'hitl_manager',
        metadata: { approvalId },
      });
      return null;
    }
  }

  /**
   * List pending approvals for user
   */
  static async listPendingApprovals(userId: string): Promise<ApprovalRequest[]> {
    try {
      const supabase = await createClient();
      if (!supabase) return [];

      const { data, error } = await supabase
        .from('tool_approvals')
        .select('*')
        .eq('user_id', userId)
        .eq('status', ApprovalStatus.PENDING)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (error || !data) {
        return [];
      }

      return data.map(row => this.mapDatabaseRowToApproval(row));
    } catch (error) {
      const err = error instanceof Error ? error : undefined;
      logger.error('Failed to list pending approvals', err, {
        userId,
        component: 'hitl_manager',
      });
      return [];
    }
  }

  /**
   * Approve an approval request
   */
  static async approveApproval(
    approvalId: string,
    approvedBy: string,
    userId?: string
  ): Promise<ApprovalRequest> {
    return this.updateApprovalStatus(
      approvalId,
      ApprovalStatus.APPROVED,
      userId,
      approvedBy
    );
  }

  /**
   * Reject an approval request
   */
  static async rejectApproval(
    approvalId: string,
    rejectionReason: string,
    rejectedBy: string,
    userId?: string
  ): Promise<ApprovalRequest> {
    const approval = await this.updateApprovalStatus(
      approvalId,
      ApprovalStatus.REJECTED,
      userId,
      rejectedBy
    );

    // Update rejection reason
    const supabase = await createClient();
    if (supabase) {
      await supabase
        .from('tool_approvals')
        .update({ rejection_reason: rejectionReason })
        .eq('id', approvalId);
    }

    return { ...approval, rejectionReason };
  }

  /**
   * Cancel an approval request
   */
  static async cancelApproval(approvalId: string, userId?: string): Promise<ApprovalRequest> {
    return this.updateApprovalStatus(approvalId, ApprovalStatus.CANCELLED, userId);
  }

  /**
   * Check if an action requires approval based on risk assessment
   */
  static requiresApproval(actionType: ApprovalType, params: JsonObject): boolean {
    // Always require approval for high-risk actions
    if (actionType === ApprovalType.CONTRACT_DEPLOYMENT ||
        actionType === ApprovalType.PERMISSION_CHANGE) {
      return true;
    }

    // Check value thresholds for financial operations
    if (actionType === ApprovalType.WALLET_TRANSFER ||
        actionType === ApprovalType.TOKEN_APPROVAL ||
        actionType === ApprovalType.HIGH_VALUE_TRANSACTION) {

      const value = getJsonNumber(params, "value") ?? undefined;
      const valueUSD = getJsonNumber(params, "valueUSD") ?? undefined;

      // Require approval for transactions over $1000
      if (valueUSD && valueUSD > 1000) {
        return true;
      }

      // Require approval for large token amounts
      if (value && value > 1000000) { // 1M tokens
        return true;
      }
    }

    return false;
  }

  /**
   * Execute action only if approved
   */
  static async executeWithApproval<T>(
    approvalId: string,
    action: () => Promise<T>,
    userId?: string
  ): Promise<T> {
    const approval = await this.getApproval(approvalId, userId);

    if (!approval) {
      throw new Error('Approval request not found');
    }

    if (approval.status !== ApprovalStatus.APPROVED) {
      throw new Error(`Approval is ${approval.status}, not approved`);
    }

    if (new Date() > approval.expiresAt) {
      await this.updateApprovalStatus(approvalId, ApprovalStatus.EXPIRED, userId);
      throw new Error('Approval has expired');
    }

    try {
      const result = await action();

      logger.info('Approved action executed successfully', {
        userId,
        component: 'hitl_manager',
        metadata: {
          approvalId,
          actionType: approval.type,
        },
      });

      return result;
    } catch (error) {
      const err = error instanceof Error ? error : undefined;
      logger.error('Approved action failed during execution', err, {
        userId,
        component: 'hitl_manager',
        metadata: {
          approvalId,
          actionType: approval.type,
        },
      });
      throw error;
    }
  }

  /**
   * Clean up expired approvals (should be called by cron job)
   */
  static async cleanupExpiredApprovals(): Promise<number> {
    try {
      const supabase = await createClient();
      if (!supabase) return 0;

      const { data, error } = await supabase
        .from('tool_approvals')
        .update({ status: ApprovalStatus.EXPIRED })
        .eq('status', ApprovalStatus.PENDING)
        .lt('expires_at', new Date().toISOString())
        .select('id');

      if (error) {
        const err = error instanceof Error ? error : undefined;
        logger.error('Failed to cleanup expired approvals', err);
        return 0;
      }

      const cleanedCount = data?.length || 0;
      logger.info(`Cleaned up ${cleanedCount} expired approvals`);

      return cleanedCount;
    } catch (error) {
      const trackedError = error instanceof Error ? error : new Error('Failed to cleanup expired approvals');
      ErrorTracker.track(trackedError, {
        operation: 'cleanup_expired_approvals',
        component: 'hitl_manager',
        metadata: {
          error: trackedError.message,
        },
      });
      return 0;
    }
  }

  private static async updateApprovalStatus(
    approvalId: string,
    status: ApprovalStatus,
    userId?: string,
    actorId?: string
  ): Promise<ApprovalRequest> {
    try {
      const supabase = await createClient();
      if (!supabase) {
        throw new Error('Database connection unavailable');
      }

      const updateData: JsonObject = {
        status,
        updated_at: new Date().toISOString(),
      };

      if (status === ApprovalStatus.APPROVED && actorId) {
        updateData.approved_at = new Date().toISOString();
        updateData.approved_by = actorId;
      }

      let query = supabase
        .from('tool_approvals')
        .update(updateData)
        .eq('id', approvalId)
        .select();

      // If userId provided, ensure user can only modify their own approvals
      if (userId) {
        query = query.eq('user_id', userId);
      }

      const { data, error } = await query.single();

      if (error || !data) {
        throw new Error(`Failed to update approval: ${error?.message || 'Not found'}`);
      }

        logger.info(`Approval ${approvalId} status changed to ${status}`, {
          userId,
          component: 'hitl_manager',
          metadata: {
            approvalId,
            actorId,
            previousStatus: data.status,
            newStatus: status,
          },
        });

      return this.mapDatabaseRowToApproval(data);
    } catch (error) {
      const trackedError = error instanceof Error ? error : new Error('Failed to update approval status');
      ErrorTracker.track(trackedError, {
        operation: 'update_approval_status',
        userId,
        component: 'hitl_manager',
        metadata: {
          approvalId,
          status,
          error: trackedError.message,
        },
      });
      throw trackedError;
    }
  }

  private static mapDatabaseRowToApproval(row: unknown): ApprovalRequest {
    const record = asJsonObject(row);
    if (!record) {
      throw new Error("Invalid approval row returned from database");
    }

    const id = getJsonString(record, "id");
    const userId = getJsonString(record, "user_id");
    const type = getJsonString(record, "approval_type");
    const title = getJsonString(record, "title");
    const description = getJsonString(record, "description");
    const riskLevel = getJsonString(record, "risk_level");
    const status = getJsonString(record, "status");
    const requestedBy = getJsonString(record, "requested_by");
    const expiresAt = getJsonString(record, "expires_at");
    const createdAt = getJsonString(record, "created_at");
    const updatedAt = getJsonString(record, "updated_at");

    if (!id || !userId || !type || !title || !description || !riskLevel || !status || !requestedBy || !expiresAt || !createdAt || !updatedAt) {
      throw new Error("Approval row is missing required fields");
    }

    return {
      id,
      userId,
      type: type as ApprovalType,
      title,
      description,
      riskLevel: riskLevel as ApprovalRequest["riskLevel"],
      status: status as ApprovalStatus,
      requestedBy,
      metadata: getJsonObject(record, "metadata") ?? {},
      expiresAt: new Date(expiresAt),
      createdAt: new Date(createdAt),
      updatedAt: new Date(updatedAt),
      approvedAt: getJsonString(record, "approved_at") ? new Date(getJsonString(record, "approved_at")!) : undefined,
      approvedBy: getJsonString(record, "approved_by") ?? undefined,
      rejectionReason: getJsonString(record, "rejection_reason") ?? undefined,
    };
  }
}

/**
 * Convenience functions for common approval patterns
 */
export const ApprovalHelpers = {
  /**
   * Create approval for wallet transfer
   */
  async requestWalletTransfer(
    userId: string,
    toAddress: string,
    amount: string,
    token: string,
    valueUSD?: number
  ): Promise<ApprovalRequest> {
    const riskLevel = valueUSD && valueUSD > 10000 ? 'critical' :
                     valueUSD && valueUSD > 1000 ? 'high' : 'medium';

    return HITLApprovalManager.createApproval({
      userId,
      type: ApprovalType.WALLET_TRANSFER,
      title: `Transfer ${amount} ${token}`,
      description: `Transfer ${amount} ${token} to ${toAddress}${valueUSD ? ` ($${valueUSD.toLocaleString()})` : ''}`,
      riskLevel,
      requestedBy: 'AI Assistant',
      metadata: { toAddress, amount, token, valueUSD },
    });
  },

  /**
   * Create approval for contract deployment
   */
  async requestContractDeployment(
    userId: string,
    contractName: string,
    estimatedGas: string
  ): Promise<ApprovalRequest> {
    return HITLApprovalManager.createApproval({
      userId,
      type: ApprovalType.CONTRACT_DEPLOYMENT,
      title: `Deploy ${contractName} Contract`,
      description: `Deploy smart contract "${contractName}" with estimated gas cost of ${estimatedGas}`,
      riskLevel: 'critical',
      requestedBy: 'AI Assistant',
      metadata: { contractName, estimatedGas },
    });
  },

  /**
   * Create approval for token approval
   */
  async requestTokenApproval(
    userId: string,
    token: string,
    spender: string,
    amount: string
  ): Promise<ApprovalRequest> {
    return HITLApprovalManager.createApproval({
      userId,
      type: ApprovalType.TOKEN_APPROVAL,
      title: `Approve ${token} Spending`,
      description: `Allow ${spender} to spend up to ${amount} ${token} on your behalf`,
      riskLevel: 'high',
      requestedBy: 'AI Assistant',
      metadata: { token, spender, amount },
    });
  },
};

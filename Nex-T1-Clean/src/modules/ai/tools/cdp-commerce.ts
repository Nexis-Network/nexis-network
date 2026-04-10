import {
  createTool,
  createToolSchema,
  stringProp,
  enumProp,
} from "./create-tool";
import {
  createApprovalRequest,
  waitForApproval,
  type ApprovalPayload,
} from "@/lib/approvals/state-machine";
import {
  createCharge,
  getCharge,
  listCharges,
} from "@/server/services/cdp/commerce";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type CommerceInput = {
  command: "create_charge" | "get_charge" | "list_charges";
  // create_charge fields
  name?: string;
  description?: string;
  amount?: string;
  currency?: string;
  pricingType?: "fixed_price" | "no_price";
  metadata?: Record<string, string>;
  redirectUrl?: string;
  cancelUrl?: string;
  // get_charge fields
  chargeId?: string;
  // list_charges fields
  limit?: number;
  status?: string;
};

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const cdpCommerceSchema = createToolSchema(
  {
    command: enumProp(
      "The commerce operation to perform.",
      ["create_charge", "get_charge", "list_charges"],
    ),
    name: stringProp(
      "Product or charge name (required for create_charge).",
    ),
    description: stringProp(
      "Optional description of the charge.",
    ),
    amount: stringProp(
      "Amount to charge as a string (e.g. '10.00'). Required for create_charge.",
    ),
    currency: stringProp(
      "Currency code: 'USDC', 'ETH', 'BTC', etc. Required for create_charge.",
    ),
    pricingType: enumProp(
      "Pricing type for the charge.",
      ["fixed_price", "no_price"],
      "fixed_price",
    ),
    chargeId: stringProp(
      "The charge ID to look up (required for get_charge).",
    ),
    limit: {
      type: "integer" as const,
      description: "Max number of charges to return for list_charges (1-100, default 25).",
      minimum: 1,
      maximum: 100,
    },
    status: stringProp(
      "Optional status filter for list_charges: 'new', 'pending', 'completed', 'expired', 'cancelled'.",
    ),
  },
  ["command"],
);

// ---------------------------------------------------------------------------
// Tool
// ---------------------------------------------------------------------------

export const cdpCommerceTool = createTool<CommerceInput>({
  description:
    "Create and manage crypto payment charges using Coinbase Commerce. " +
    "Commands: create_charge (creates a new payment request -- requires user approval), " +
    "get_charge (retrieves a charge by ID), list_charges (lists recent charges). " +
    "Use when the user wants to accept crypto payments or create a payment request.",
  schema: cdpCommerceSchema,
  execute: async (input, context) => {
    const command = String(input.command);

    // ----- list_charges: no HITL -----
    if (command === "list_charges") {
      try {
        const charges = await listCharges({
          limit: input.limit ? Number(input.limit) : 25,
          status: input.status ? String(input.status) : undefined,
        });

        return {
          status: "success",
          command: "list_charges",
          count: charges.length,
          charges: charges.map((c) => ({
            id: c.id,
            code: c.code,
            name: c.name,
            amount: c.amount,
            currency: c.currency,
            status: c.status,
            hostedUrl: c.hostedUrl,
            createdAt: c.createdAt,
          })),
        };
      } catch (error: UntypedJson) {
        return {
          status: "error",
          command: "list_charges",
          error:
            error instanceof Error
              ? error.message
              : "Failed to list charges",
        };
      }
    }

    // ----- get_charge: no HITL -----
    if (command === "get_charge") {
      const chargeId = String(input.chargeId ?? "");
      if (!chargeId) {
        return {
          status: "error",
          command: "get_charge",
          error: "chargeId is required for get_charge",
        };
      }

      try {
        const charge = await getCharge(chargeId);
        return {
          status: "success",
          command: "get_charge",
          charge: {
            id: charge.id,
            code: charge.code,
            name: charge.name,
            description: charge.description,
            amount: charge.amount,
            currency: charge.currency,
            status: charge.status,
            hostedUrl: charge.hostedUrl,
            createdAt: charge.createdAt,
            expiresAt: charge.expiresAt,
            payments: charge.payments,
          },
        };
      } catch (error: UntypedJson) {
        return {
          status: "error",
          command: "get_charge",
          error:
            error instanceof Error
              ? error.message
              : "Failed to get charge",
        };
      }
    }

    // ----- create_charge: requires HITL approval -----
    if (command === "create_charge") {
      const userId = context?.userId;
      if (!userId) {
        throw new Error("User ID is required to create a charge.");
      }

      const name = String(input.name ?? "");
      const amount = String(input.amount ?? "");
      const currency = String(input.currency ?? "USDC");

      if (!name) {
        return {
          status: "error",
          command: "create_charge",
          error: "name is required for create_charge",
        };
      }

      if (!amount) {
        return {
          status: "error",
          command: "create_charge",
          error: "amount is required for create_charge",
        };
      }

      const approvalPayload: ApprovalPayload = {
        toolId: "cdp_commerce",
        command: "create_charge",
        args: {
          name,
          description: input.description ?? null,
          amount,
          currency,
          pricingType: input.pricingType ?? "fixed_price",
        },
        preview: {
          title: "Create crypto payment charge",
          description:
            "Approve creating a new Coinbase Commerce payment request.",
          items: [
            {
              label: "Product",
              value: name,
              highlight: true,
            },
            {
              label: "Amount",
              value: `${amount} ${currency}`,
              highlight: true,
            },
            {
              label: "Pricing Type",
              value: input.pricingType ?? "fixed_price",
            },
          ],
          warnings: [
            "This creates a payment charge that others can pay. Review details carefully.",
          ],
        },
      };

      const approvalRequest = await createApprovalRequest(
        userId,
        approvalPayload,
      );
      const decision = await waitForApproval(approvalRequest.id, userId);

      if (!decision.approved) {
        return {
          status: "rejected",
          approvalRequired: true,
          approvalId: approvalRequest.id,
          command: "create_charge",
          message:
            decision.reason ??
            "Charge creation rejected: explicit user confirmation is required.",
        };
      }

      try {
        const charge = await createCharge({
          name,
          description: input.description,
          amount,
          currency,
          pricingType: input.pricingType ?? "fixed_price",
          metadata: input.metadata,
          redirectUrl: input.redirectUrl,
          cancelUrl: input.cancelUrl,
        });

        return {
          status: "success",
          approvalRequired: true,
          approvalId: approvalRequest.id,
          command: "create_charge",
          charge: {
            id: charge.id,
            code: charge.code,
            name: charge.name,
            amount: charge.amount,
            currency: charge.currency,
            status: charge.status,
            hostedUrl: charge.hostedUrl,
            createdAt: charge.createdAt,
            expiresAt: charge.expiresAt,
          },
          message: `Payment charge created successfully. Hosted checkout: ${charge.hostedUrl}`,
        };
      } catch (error: UntypedJson) {
        return {
          status: "error",
          approvalRequired: true,
          approvalId: approvalRequest.id,
          command: "create_charge",
          error:
            error instanceof Error
              ? error.message
              : "Unknown error creating charge",
        };
      }
    }

    return {
      status: "error",
      error: `Unknown command: ${command}. Use create_charge, get_charge, or list_charges.`,
    };
  },
});

'use server';

import { 
  lpCreate as serviceLpCreate,
  lpIncrease as serviceLpIncrease,
  lpDecrease as serviceLpDecrease,
  lpClaim as serviceLpClaim,
} from '@/server/services/uniswap/client';
import { 
  LpCreateRequest,
  LpIncreaseRequest,
  LpDecreaseRequest,
  LpClaimRequest,
} from '@/server/services/uniswap/types';
import { 
  lpCreateSchema,
  lpIncreaseSchema,
  lpDecreaseSchema,
  lpClaimSchema,
} from '@/server/services/uniswap/validation';

export async function createLpAction(params: LpCreateRequest) {
  try {
    const validated = lpCreateSchema.parse(params);
    const result = await serviceLpCreate(validated);
    return { success: true, data: result };
  } catch (error: unknown) {
    return { success: false, error: (error as Error).message };
  }
}

export async function increaseLpAction(params: LpIncreaseRequest) {
  try {
    const validated = lpIncreaseSchema.parse(params);
    const result = await serviceLpIncrease(validated);
    return { success: true, data: result };
  } catch (error: unknown) {
    return { success: false, error: (error as Error).message };
  }
}

export async function decreaseLpAction(params: LpDecreaseRequest) {
  try {
    const validated = lpDecreaseSchema.parse(params);
    const result = await serviceLpDecrease(validated);
    return { success: true, data: result };
  } catch (error: unknown) {
    return { success: false, error: (error as Error).message };
  }
}

export async function claimLpAction(params: LpClaimRequest) {
  try {
    const validated = lpClaimSchema.parse(params);
    const result = await serviceLpClaim(validated);
    return { success: true, data: result };
  } catch (error: unknown) {
    return { success: false, error: (error as Error).message };
  }
}

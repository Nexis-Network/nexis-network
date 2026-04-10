
import { birdeyeFetch } from '../lib/birdeye/client';
import dotenv from 'dotenv';
import path from 'path';


import { logger } from '@/lib/logger';
// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function testConnection() {
  logger.debug('Testing Birdeye API Connection...');
  
  if (!process.env.BIRDEYE_API_KEY) {
    logger.error('❌ Error: BIRDEYE_API_KEY not found in environment');
    process.exit(1);
  }

  try {
    // Testing specific 'supported_chain' endpoint
    // Endpoint: /v1/wallet/list_supported_chain
    const response = await birdeyeFetch<string[]>('wallet/list_supported_chain', {
      version: 'v1', 
      chain: 'solana' // Chain param might not matter for this specific global endpoint but good to have
    });

    logger.debug('✅ Connection Successful!');
    logger.debug(`Received ${response.length} supported chains.`);
    logger.debug('Sample chains:', response.slice(0, 5));
    
  } catch (error) {
    logger.error('❌ Connection Failed:', error);
    process.exit(1);
  }
}

testConnection();

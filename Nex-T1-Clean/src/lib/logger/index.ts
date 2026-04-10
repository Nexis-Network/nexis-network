/**
 * Isomorphic logger export
 * Automatically selects server or client logger based on environment
 */

import { logger as serverLogger } from './server';
import { logger as clientLogger } from './client';

// Use a simple runtime check to determine environment
const isServer = typeof window === 'undefined';

export const logger = isServer ? serverLogger : clientLogger;

export default logger;

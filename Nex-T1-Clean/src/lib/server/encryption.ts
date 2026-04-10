
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';


import { logger } from '@/lib/logger';
// Use a consistent key for dev/test if env var is missing, BUT warn in production.
// In a real app, this MUST be provided via env vars.
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // For AES, this is always 16
const KEY_HEX = process.env.MCP_ENCRYPTION_KEY || '0000000000000000000000000000000000000000000000000000000000000000'; 

if (!process.env.MCP_ENCRYPTION_KEY) {
    logger.warn("⚠️  WARNING: MCP_ENCRYPTION_KEY not set. Using insecure default key for development.");
}

const getKey = () => Buffer.from(KEY_HEX, 'hex');

export function encrypt(text: string): string {
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, getKey(), iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');
    // Format: iv:authTag:encryptedData
    return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

export function decrypt(text: string): string {
    const parts = text.split(':');
    if (parts.length !== 3) {
        throw new Error('Invalid encrypted text format');
    }
    const [ivHex, authTagHex, encryptedHex] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const decipher = createDecipheriv(ALGORITHM, getKey(), iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
}

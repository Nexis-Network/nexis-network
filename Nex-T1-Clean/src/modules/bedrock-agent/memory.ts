import { redis } from "@/server/services/redis";
import { bedrockConfig } from "./config";


import { logger } from '@/lib/logger';
export interface IMemory {
    get(key: string): Promise<string | null>;
    set(key: string, value: string, ttl?: number): Promise<void>;
    delete(key: string): Promise<void>;
}

export class BedrockMemory implements IMemory {
    private prefix: string;
    private defaultTtl: number;

    constructor(prefix: string = "bedrock:memory:", defaultTtl: number = 3600) {
        this.prefix = prefix;
        this.defaultTtl = defaultTtl;
    }

    private getKey(key: string): string {
        return `${this.prefix}${key}`;
    }

    async get(key: string): Promise<string | null> {
        try {
            return await redis.get(this.getKey(key));
        } catch (error) {
            logger.error("[BedrockMemory] get failed", error);
            return null;
        }
    }

    async set(key: string, value: string, ttl?: number): Promise<void> {
        try {
            const effectiveTtl = ttl ?? this.defaultTtl;
            await redis.setex(this.getKey(key), effectiveTtl, value);
        } catch (error) {
            logger.error("[BedrockMemory] set failed", error);
        }
    }

    async delete(key: string): Promise<void> {
        try {
            await redis.del(this.getKey(key));
        } catch (error) {
            logger.error("[BedrockMemory] delete failed", error);
        }
    }
}

export const shortTermMemory = new BedrockMemory(
    bedrockConfig.memory.shortTerm.prefix,
    bedrockConfig.memory.shortTerm.ttlSeconds,
);

export const longTermMemory = new BedrockMemory(
    bedrockConfig.memory.longTerm.prefix,
    bedrockConfig.memory.longTerm.ttlSeconds,
);

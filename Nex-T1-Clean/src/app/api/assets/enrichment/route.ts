
import { connection, NextRequest } from "next/server";
import { apiResponse } from "@/lib/api-platform";
import { defaultMoralisClient } from "@/server/services/mcp/moralis-client";
import { defaultCryptoSentimentClient } from "@/server/services/mcp/crypto-sentiment-client";

import { logger } from '@/lib/logger';
// Switch to Node runtime to support MCP client dependencies (timers, etc.)

// Mock Fallback Generators
const NARRATIVES = ["AI Agent", "Meme", "DePin", "RWA", "Gaming", "L1", "DeFi", "Infra"];
function getMockEnrichment(id: string) {
    const seed = id.split("").reduce((a, b) => a + b.charCodeAt(0), 0);
    const narrative = NARRATIVES[seed % NARRATIVES.length];
    const auditScore = Math.min(100, Math.max(40, (seed % 60) + 40));
    const isAuditSafe = auditScore > 70;
    // Smart Money
    const signalVal = seed % 10;
    let smartMoneySignal: 'buy' | 'sell' | 'neutral' = 'neutral';
    if (signalVal > 7) smartMoneySignal = 'buy';
    else if (signalVal < 2) smartMoneySignal = 'sell';

    // Social Dominance (0.01% - 5%) - skewed lower
    const socialDominance = parseFloat(((seed % 500) / 100).toFixed(2));

    return {
        auditScore,
        isAuditSafe,
        narrative,
        smartMoneySignal,
        socialDominance
    };
}

// Helpers
function parseChain(id: string): { chain: 'evm' | 'solana' | 'unknown', address: string } {
    if (id.includes(':')) {
        const [chain, addr] = id.split(':');
        if (chain === 'solana') return { chain: 'solana', address: addr };
        return { chain: 'evm', address: addr }; // Assume others are EVM compatible
    }
    // Fallback heuristic
    if (id.startsWith('0x')) return { chain: 'evm', address: id };
    return { chain: 'solana', address: id };
}

export async function GET(req: NextRequest) {
    await connection();
    const { searchParams } = new URL(req.url);
    const ids = searchParams.get("ids");
    
    if (!ids) return apiResponse.success({});

    const idList = ids.split(",").filter(Boolean);
    const results: Record<string, UntypedJson> = {};
    
    // 1. Group by Chain
    const evmAddresses: string[] = [];
    const solanaAddresses: string[] = [];
    
    idList.forEach(id => {
        const { chain, address } = parseChain(id);
        if (chain === 'evm') evmAddresses.push(address);
        else if (chain === 'solana') solanaAddresses.push(address);
    });

    // 2. Parallel Fetching
    try {
        const promises = [];

        // --- EVM Security (Moralis) ---
        if (evmAddresses.length > 0) {
            promises.push(
                defaultMoralisClient.invoke("mcp_moralis__evm_gettokenscore", { token_addresses: evmAddresses })
                    .then(res => ({ type: 'evm_score', data: res }))
                    .catch(err => ({ type: 'evm_score', error: err }))
            );
        }

        // --- Solana Metadata (Moralis) ---
        // Fetch individually for now as standard metadata endpoint might be single-address
        solanaAddresses.slice(0, 10).forEach(addr => { // Limit to 10 to avoid rate limits on parallel
             promises.push(
                 defaultMoralisClient.invoke("mcp_moralis__solana_gettokenmetadata", { address: addr })
                    .then(res => ({ type: 'sol_meta', address: addr, data: res }))
                    .catch(err => ({ type: 'sol_meta', address: addr, error: err }))
             );
        });

        // --- Smart Money/Sentiment (CryptoSentiment) ---
        // Just fetch for top few to save quota
        const sentimentTargets = [...evmAddresses, ...solanaAddresses].slice(0, 5);
        sentimentTargets.forEach(addr => {
             promises.push(
                 defaultCryptoSentimentClient.invoke("get_sentiment_balance", { query: addr })
                    .then(res => ({ type: 'sentiment', address: addr, data: res }))
                    .catch(err => ({ type: 'sentiment', address: addr, error: err }))
             );
        });

        // Wrap Promise.all with a race against a timeout to prevent Cloudflare 524 (100s)
        // We set 15s timeout to be safe and responsive
        const timeoutPromise = new Promise((resolve) => {
            setTimeout(() => resolve([]), 15000);
        });

        const responses = await Promise.race([
            Promise.all(promises),
            timeoutPromise
        ]) as UntypedJson[];

        // 3. Process Responses
        responses.forEach((res) => {
            if (res.error) return; // Skip failed

            // Process EVM Scores
            if (res.type === 'evm_score') {
                const scores = res.data?.toolResult || []; // Expecting array or map? 
                // Defensive coding: assume toolResult might be array of { token_address, score }
                if (Array.isArray(scores)) {
                    scores.forEach((item) => {
                        const addr = item.token_address?.toLowerCase();
                        if (addr) {
                            // Find matching ID (could be multiple if chain prefixes differ but address same)
                            const matchId = idList.find(id => id.includes(addr) || id.toLowerCase().includes(addr));
                            if (matchId) {
                                results[matchId] = {
                                    ...(results[matchId] || {}),
                                    auditScore: item.total_score,
                                    isAuditSafe: item.total_score > 70
                                };
                            }
                        }
                    });
                }
            }

            // Process Solana Metadata
            if (res.type === 'sol_meta') {
                const meta = res.data?.toolResult;
                const matchId = idList.find(id => id.includes(res.address));
                if (matchId && meta) {
                    // Heuristic: If mint authority is null/dead, it's safer
                    const isSafe = !meta.mint_authority; 
                    results[matchId] = {
                        ...(results[matchId] || {}),
                        auditScore: isSafe ? 85 : 45,
                        isAuditSafe: isSafe,
                        narrative: (meta.symbol === "BONK" || meta.symbol === "WIF") ? "Meme" : "Unknown"
                    };
                }
            }
            
            // Process Sentiment
            if (res.type === 'sentiment') {
                const sent = res.data?.toolResult; // Expect { score: 0-100 or 'bullish' }
                const matchId = idList.find(id => id.includes(res.address));
                if (matchId && sent) {
                    let signal: 'buy' | 'sell' | 'neutral' = 'neutral';
                    if (sent.score > 70 || sent.sentiment === 'bullish') signal = 'buy';
                    else if (sent.score < 30 || sent.sentiment === 'bearish') signal = 'sell';
                    
                    results[matchId] = {
                        ...(results[matchId] || {}),
                        smartMoneySignal: signal,
                        socialDominance: sent.dominance || 0 // Assuming returned by MCp or fallback to 0
                    };
                }
            }
        });

    } catch (e) {
        logger.error("Enrichment API Error:", e);
    }

    // 4. Fill gaps with Mock Data (Hybrid approach)
    idList.forEach(id => {
        if (!results[id]) {
            results[id] = getMockEnrichment(id);
        } else {
            // Partial fill? merge mock for missing fields
            const mock = getMockEnrichment(id);
            results[id] = { ...mock, ...results[id] };
        }
    });

    return apiResponse.success(results);
}

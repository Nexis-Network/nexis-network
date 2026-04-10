import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Langfuse } from 'langfuse';

// Mock Langfuse
const mockTrace = {
    generation: vi.fn().mockReturnValue({
        end: vi.fn(),
    }),
};

const mockLangfuseInstance = {
    api: {
        promptsGet: vi.fn().mockResolvedValue({
            type: "text",
            name: "test-prompt",
            version: 1,
            labels: ["production"],
            tags: [],
            config: {},
            prompt: "mock-prompt",
        }),
    },
    score: vi.fn(),
    trace: vi.fn().mockReturnValue(mockTrace),
    flushAsync: vi.fn().mockResolvedValue(undefined),
    shutdownAsync: vi.fn().mockResolvedValue(undefined),
};

vi.mock('langfuse', () => {
    return {
        Langfuse: vi.fn().mockImplementation(() => mockLangfuseInstance),
    };
});

// Mock ai
vi.mock('ai', () => ({
    streamObject: vi.fn().mockImplementation(({ onFinish }) => {
        // Simulate onFinish callback
        if (onFinish) {
            onFinish({
                usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 },
                object: { message: "test" },
                error: null
            });
        }
        return { stream: 'mock-stream' };
    }),
    gateway: vi.fn(),
}));

describe('Langfuse Integration', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        process.env.LANGFUSE_PUBLIC_KEY = 'pk-lf-mock';
        process.env.LANGFUSE_SECRET_KEY = 'sk-lf-mock';
    });

    it('should initialize Langfuse client', () => {
        new Langfuse({
            publicKey: process.env.LANGFUSE_PUBLIC_KEY,
            secretKey: process.env.LANGFUSE_SECRET_KEY,
        });
        expect(Langfuse).toHaveBeenCalled();
    });

    it('should create trace and generation manually', () => {
        const langfuse = new Langfuse();
        const trace = langfuse.trace({ name: 'test-trace' });
        expect(langfuse.trace).toHaveBeenCalledWith({ name: 'test-trace' });

        const _generation = trace.generation({ name: 'test-gen' });
        expect(trace.generation).toHaveBeenCalledWith({ name: 'test-gen' });
    });

    it('should fetch prompt from Langfuse', async () => {
        const langfuse = new Langfuse();
        const prompt = await langfuse.api.promptsGet({ promptName: 'test-prompt', label: 'production' });
        expect(langfuse.api.promptsGet).toHaveBeenCalledWith({ promptName: 'test-prompt', label: 'production' });
        expect(prompt.type).toBe('text');
        expect(prompt.prompt).toBe('mock-prompt');
    });

    it('should send score to Langfuse', async () => {
        const langfuse = new Langfuse();
        langfuse.score({ name: 'test-score', value: 1 });
        expect(langfuse.score).toHaveBeenCalledWith({ name: 'test-score', value: 1 });
    });
});

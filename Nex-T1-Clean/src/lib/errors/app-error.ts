export type ErrorCode =
    | "INTERNAL_ERROR"
    | "UNAUTHORIZED"
    | "FORBIDDEN"
    | "NOT_FOUND"
    | "BAD_REQUEST"
    | "VALIDATION_ERROR"
    | "RATE_LIMIT_EXCEEDED"
    | "EXTERNAL_SERVICE_ERROR";

export class AppError extends Error {
    public readonly code: ErrorCode;
    public readonly statusCode: number;
    public readonly isOperational: boolean;
    public readonly details?: unknown;

    constructor(
        message: string,
        code: ErrorCode = "INTERNAL_ERROR",
        statusCode: number = 500,
        isOperational: boolean = true,
        details?: unknown
    ) {
        super(message);
        this.code = code;
        this.statusCode = statusCode;
        this.isOperational = isOperational;
        this.details = details;

        // Restore prototype chain
        Object.setPrototypeOf(this, new.target.prototype);
        Error.captureStackTrace(this);
    }

    static isAppError(error: unknown): error is AppError {
        return error instanceof AppError;
    }

    static fromError(
        error: unknown,
        overrides?: Partial<Pick<AppError, "code" | "statusCode" | "isOperational" | "details">>,
    ): AppError {
        if (error instanceof AppError) {
            return error;
        }

        const message = error instanceof Error ? error.message : String(error);
        return new AppError(
            message,
            overrides?.code ?? "INTERNAL_ERROR",
            overrides?.statusCode ?? 500,
            overrides?.isOperational ?? false,
            overrides?.details ?? error
        );
    }
}

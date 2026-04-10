import { AppError } from "./app-error";

export * from "./app-error";

export class NotFoundError extends AppError {
    constructor(message: string = "Resource not found", details?: unknown) {
        super(message, "NOT_FOUND", 404, true, details);
    }
}

export class UnauthorizedError extends AppError {
    constructor(message: string = "Unauthorized", details?: unknown) {
        super(message, "UNAUTHORIZED", 401, true, details);
    }
}

export class ForbiddenError extends AppError {
    constructor(message: string = "Forbidden", details?: unknown) {
        super(message, "FORBIDDEN", 403, true, details);
    }
}

export class BadRequestError extends AppError {
    constructor(message: string = "Bad Request", details?: unknown) {
        super(message, "BAD_REQUEST", 400, true, details);
    }
}

export class ValidationError extends AppError {
    constructor(message: string = "Validation Error", details?: unknown) {
        super(message, "VALIDATION_ERROR", 400, true, details);
    }
}

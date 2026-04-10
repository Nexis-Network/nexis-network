import { describe, it, expect } from "vitest";
import { ZodError, z } from "zod";
import { apiResponse } from "./response";

describe("apiResponse", () => {
  describe("success", () => {
    it("returns 200 with success: true and data", async () => {
      const data = { id: 1, name: "Test" };
      const response = apiResponse.success(data);
      
      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.success).toBe(true);
      expect(json.data).toEqual(data);
    });

    it("includes meta when provided", async () => {
      const data = [{ id: 1 }];
      const meta = { page: 1, limit: 10, total: 100, hasMore: true };
      const response = apiResponse.success(data, meta);
      
      const json = await response.json();
      expect(json.meta).toEqual(meta);
    });
  });

  describe("created", () => {
    it("returns 201 with success: true and data", async () => {
      const data = { id: 123 };
      const response = apiResponse.created(data);
      
      expect(response.status).toBe(201);
      const json = await response.json();
      expect(json.success).toBe(true);
      expect(json.data).toEqual(data);
    });
  });

  describe("noContent", () => {
    it("returns 204 with no body", () => {
      const response = apiResponse.noContent();
      
      expect(response.status).toBe(204);
      expect(response.body).toBeNull();
    });
  });

  describe("error", () => {
    it("returns custom status with error structure", async () => {
      const response = apiResponse.error("CUSTOM_ERROR", "Something went wrong", 418);
      
      expect(response.status).toBe(418);
      const json = await response.json();
      expect(json.success).toBe(false);
      expect(json.error.code).toBe("CUSTOM_ERROR");
      expect(json.error.message).toBe("Something went wrong");
    });

    it("includes details and requestId when provided", async () => {
      const details = { field: "email", reason: "invalid" };
      const response = apiResponse.error("ERR", "msg", 400, details, "req-123");
      
      const json = await response.json();
      expect(json.error.details).toEqual(details);
      expect(json.error.requestId).toBe("req-123");
    });
  });

  describe("validationError", () => {
    it("returns 400 with VALIDATION_ERROR code", async () => {
      const schema = z.object({ email: z.string().email() });
      let zodError: ZodError;
      try {
        schema.parse({ email: "not-an-email" });
        throw new Error("Should not reach");
      } catch (e) {
        zodError = e as ZodError;
      }
      
      const response = apiResponse.validationError(zodError);
      
      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json.success).toBe(false);
      expect(json.error.code).toBe("VALIDATION_ERROR");
      expect(json.error.details).toHaveProperty("email");
    });
  });

  describe("unauthorized", () => {
    it("returns 401 with UNAUTHORIZED code", async () => {
      const response = apiResponse.unauthorized();
      
      expect(response.status).toBe(401);
      const json = await response.json();
      expect(json.success).toBe(false);
      expect(json.error.code).toBe("UNAUTHORIZED");
    });

    it("accepts custom message", async () => {
      const response = apiResponse.unauthorized("Session expired");
      
      const json = await response.json();
      expect(json.error.message).toBe("Session expired");
    });
  });

  describe("forbidden", () => {
    it("returns 403 with FORBIDDEN code", async () => {
      const response = apiResponse.forbidden();
      
      expect(response.status).toBe(403);
      const json = await response.json();
      expect(json.error.code).toBe("FORBIDDEN");
    });
  });

  describe("notFound", () => {
    it("returns 404 with NOT_FOUND code", async () => {
      const response = apiResponse.notFound();
      
      expect(response.status).toBe(404);
      const json = await response.json();
      expect(json.error.code).toBe("NOT_FOUND");
    });

    it("accepts custom message", async () => {
      const response = apiResponse.notFound("User not found");
      
      const json = await response.json();
      expect(json.error.message).toBe("User not found");
    });
  });

  describe("badRequest", () => {
    it("returns 400 with BAD_REQUEST code", async () => {
      const response = apiResponse.badRequest();
      
      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json.error.code).toBe("BAD_REQUEST");
    });
  });

  describe("paymentRequired", () => {
    it("returns 402 with PAYMENT_REQUIRED code", async () => {
      const response = apiResponse.paymentRequired();
      
      expect(response.status).toBe(402);
      const json = await response.json();
      expect(json.error.code).toBe("PAYMENT_REQUIRED");
    });
  });

  describe("serviceUnavailable", () => {
    it("returns 503 with SERVICE_UNAVAILABLE code", async () => {
      const response = apiResponse.serviceUnavailable();
      
      expect(response.status).toBe(503);
      const json = await response.json();
      expect(json.error.code).toBe("SERVICE_UNAVAILABLE");
    });
  });

  describe("internalError", () => {
    it("returns 500 with INTERNAL_ERROR code", async () => {
      const response = apiResponse.internalError();
      
      expect(response.status).toBe(500);
      const json = await response.json();
      expect(json.success).toBe(false);
      expect(json.error.code).toBe("INTERNAL_ERROR");
    });

    it("includes requestId when provided", async () => {
      const response = apiResponse.internalError("Server error", "req-456");
      
      const json = await response.json();
      expect(json.error.requestId).toBe("req-456");
    });
  });
});

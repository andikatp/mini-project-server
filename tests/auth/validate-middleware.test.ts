import { describe, expect, it, mock } from "bun:test";
import { z, ZodError } from "zod";
import { errorHandler } from "../../src/middlewares/errorHandler";
import { validate } from "../../src/middlewares/validate.middleware";

describe("validate Middleware & errorHandler Integration", () => {
  const schema = z.object({
    email: z.email(),
    age: z.number().min(18),
  });

  it("should pass through when body is valid and parse types", async () => {
    const req: any = { body: { email: "valid@example.com", age: 25 } };
    const res: any = {};
    const next = mock(() => {});

    const middleware = validate({ body: schema });
    await middleware(req, res, next);

    expect(next).toHaveBeenCalledWith();
    expect(req.body).toEqual({ email: "valid@example.com", age: 25 });
  });

  it("should forward ZodError to next() when body is invalid", async () => {
    const req: any = { body: { email: "not-an-email", age: 10 } };
    const res: any = {};
    let passedError: any;
    const next = mock((err?: any) => {
      passedError = err;
    });

    const middleware = validate({ body: schema });
    await middleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(passedError).toBeInstanceOf(ZodError);

    // Verify errorHandler converts ZodError into a 400 response
    const mockRes: any = {
      statusCode: 200,
      jsonPayload: null,
      status(code: number) {
        this.statusCode = code;
        return this;
      },
      json(data: any) {
        this.jsonPayload = data;
        return this;
      },
    };

    errorHandler(passedError, req, mockRes, () => {});

    expect(mockRes.statusCode).toBe(400);
    expect(mockRes.jsonPayload.status).toBe("error");
    expect(mockRes.jsonPayload.message).toContain("email");
  });
});

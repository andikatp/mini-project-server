import type { NextFunction, Request, Response } from "express";
import type { ZodType } from "zod";

interface RequestValidationSchemas {
  body?: ZodType;
  query?: ZodType;
  params?: ZodType;
}

/**
 * Express middleware to validate request body, query, and params against Zod schemas.
 * Automatically casts/parses validated fields onto the request object or forwards ZodError to errorHandler.
 */
export function validate(schemas: RequestValidationSchemas) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (schemas.body) {
        req.body = await schemas.body.parseAsync(req.body);
      }
      if (schemas.query) {
        const parsedQuery = await schemas.query.parseAsync(req.query);
        try {
          (req as any).query = parsedQuery;
        } catch {
          Object.defineProperty(req, "query", {
            value: parsedQuery,
            writable: true,
            enumerable: true,
            configurable: true,
          });
        }
      }
      if (schemas.params) {
        const parsedParams = await schemas.params.parseAsync(req.params);
        try {
          (req as any).params = parsedParams;
        } catch {
          Object.defineProperty(req, "params", {
            value: parsedParams,
            writable: true,
            enumerable: true,
            configurable: true,
          });
        }
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

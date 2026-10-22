import type { NextFunction, Request, Response } from "express";
import type { ZodType } from "zod";

export interface RequestValidationSchemas {
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
        (req as any).query = await schemas.query.parseAsync(req.query);
      }
      if (schemas.params) {
        (req as any).params = await schemas.params.parseAsync(req.params);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

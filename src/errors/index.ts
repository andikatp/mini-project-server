// Base application error with HTTP status code
export class AppError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
  }
}

/**
 * Error thrown when authentication fails, e.g., invalid credentials.
 */
export class AuthenticationError extends AppError {
  constructor(message: string) {
    super(message, 401);
    this.name = "AuthenticationError";
  }
}


/**
 * Error thrown when a resource already exists (e.g., duplicate email).
 */
export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409);
    this.name = "ConflictError";
  }
}

/**
 * Error thrown for invalid input or validation failures.
 */
export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400);
    this.name = "ValidationError";
  }
}



/**
 * Error thrown when a requested resource is not found.
 */
export class NotFoundError extends AppError {
  constructor(message: string = "Resource not found") {
    super(message, 404);
    this.name = "NotFoundError";
  }
}


// Custom authentication and token errors
/**
 * Error thrown when authentication fails, e.g., invalid credentials.
 */
export class AuthenticationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthenticationError';
  }
}
/**
 * Error thrown for issues related to refresh tokens, such as invalid or expired tokens.
 */
export class TokenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TokenError';
  }
}

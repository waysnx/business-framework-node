import { WBFError } from './WBFError';

/**
 * AuthorizationError
 * Raised when authorization check fails
 */
export class AuthorizationError extends WBFError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 'AuthorizationError', context);
    this.name = 'AuthorizationError';
    Object.setPrototypeOf(this, AuthorizationError.prototype);
  }
}

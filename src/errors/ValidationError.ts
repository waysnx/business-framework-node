import { WBFError } from './WBFError';

/**
 * ValidationError
 * Raised when validation fails (business validation, not HTTP request validation)
 */
export class ValidationError extends WBFError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 'ValidationError', context);
    this.name = 'ValidationError';
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

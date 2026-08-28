import { WBFError } from './WBFError';

/**
 * ConflictError
 * Raised when operation conflicts with current state
 */
export class ConflictError extends WBFError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 'Conflict', context);
    this.name = 'ConflictError';
    Object.setPrototypeOf(this, ConflictError.prototype);
  }
}

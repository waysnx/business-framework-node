import { WBFError } from './WBFError';

/**
 * RegistryError
 * Raised when registry operations fail
 */
export class RegistryError extends WBFError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 'RegistryError', context);
    this.name = 'RegistryError';
    Object.setPrototypeOf(this, RegistryError.prototype);
  }
}

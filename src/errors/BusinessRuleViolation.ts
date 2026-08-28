import { WBFError } from './WBFError';

/**
 * BusinessRuleViolation
 * Raised when business rules prevent execution
 */
export class BusinessRuleViolation extends WBFError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 'BusinessRuleViolation', context);
    this.name = 'BusinessRuleViolation';
    Object.setPrototypeOf(this, BusinessRuleViolation.prototype);
  }
}

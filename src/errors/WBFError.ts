/**
 * WBFError
 * Base class for all WaysNX Business Framework errors
 */
export class WBFError extends Error {
  readonly category: string;
  readonly context: Record<string, any>;
  readonly timestamp: Date;

  constructor(
    message: string,
    category: string,
    context?: Record<string, any>
  ) {
    super(message);
    this.name = 'WBFError';
    this.category = category;
    this.context = context || {};
    this.timestamp = new Date();

    // Maintain proper prototype chain for every subclass (NOD-01).
    // Using WBFError.prototype here reset subclasses that did not re-apply
    // setPrototypeOf themselves (ExecutionError and its subclasses), so
    // `instanceof RequestValidationError` was false and validation failures
    // were misclassified. new.target is the constructor actually invoked.
    Object.setPrototypeOf(this, new.target.prototype);
  }

  /**
   * Serialize error to JSON
   */
  toJSON(): Record<string, any> {
    return {
      name: this.name,
      message: this.message,
      category: this.category,
      context: this.context,
      timestamp: this.timestamp.toISOString(),
    };
  }

  /**
   * Get error as plain object
   */
  toObject(): Record<string, any> {
    return this.toJSON();
  }
}

/**
 * BusinessFunctionResult
 * Structured result from Business Function execution
 * Tracks success/failure, response data, and execution metadata
 */
export class BusinessFunctionResult {
  readonly executionId: string;
  readonly functionId: string;
  readonly status: 'success' | 'failure' | 'validation_failure' | 'rule_failure';
  readonly response?: any;
  readonly error?: Error;
  readonly errorCategory?: string;
  readonly eventsPublished: readonly string[];
  readonly duration: number;
  readonly timestamp: number;
  readonly metadata: Readonly<Record<string, any>>;

  constructor(props: {
    executionId: string;
    functionId: string;
    status: 'success' | 'failure' | 'validation_failure' | 'rule_failure';
    response?: any;
    error?: Error;
    errorCategory?: string;
    eventsPublished?: string[];
    duration: number;
    metadata?: Record<string, any>;
  }) {
    if (!props.executionId) throw new Error('BusinessFunctionResult requires executionId');
    if (!props.functionId) throw new Error('BusinessFunctionResult requires functionId');
    if (!props.status) throw new Error('BusinessFunctionResult requires status');
    if (typeof props.duration !== 'number' || props.duration < 0) {
      throw new Error('BusinessFunctionResult requires valid duration');
    }

    this.executionId = props.executionId;
    this.functionId = props.functionId;
    this.status = props.status;
    this.response = props.response;
    this.error = props.error;
    this.errorCategory = props.errorCategory;
    this.eventsPublished = Object.freeze([...(props.eventsPublished || [])]);
    this.duration = props.duration;
    this.timestamp = Date.now();
    this.metadata = Object.freeze({ ...(props.metadata || {}) });

    Object.freeze(this);
  }

  /**
   * Check if execution succeeded
   */
  succeeded(): boolean {
    return this.status === 'success' && !this.error;
  }

  /**
   * Check if execution failed
   */
  failed(): boolean {
    return this.status === 'failure' || !!this.error;
  }

  /**
   * Check if validation failed
   */
  isValidationFailure(): boolean {
    return this.status === 'validation_failure';
  }

  /**
   * Check if business rule failed
   */
  isRuleFailure(): boolean {
    return this.status === 'rule_failure';
  }

  /**
   * Get error message if failed
   */
  getErrorMessage(): string | undefined {
    return this.error?.message;
  }

  /**
   * Convert to object
   */
  toObject(): Record<string, any> {
    return {
      executionId: this.executionId,
      functionId: this.functionId,
      status: this.status,
      response: this.response,
      error: this.error ? { message: this.error.message, category: this.errorCategory } : undefined,
      eventsPublished: [...this.eventsPublished],
      duration: this.duration,
      timestamp: this.timestamp,
      metadata: { ...this.metadata },
    };
  }

  /**
   * Convert to JSON
   */
  toJson(): string {
    return JSON.stringify(this.toObject());
  }
}

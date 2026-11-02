/**
 * WBF Business Function result statuses (WBF-SPEC-0006, ADR-0009, decision D1,
 * approved 2026-11-01). Replaces the pre-0.1 values 'failure' and 'rule_failure'.
 */
export type BusinessFunctionStatus =
  | 'success'
  | 'validation_failure'
  | 'authorization_failure'
  | 'not_found'
  | 'business_rule_failure'
  | 'execution_failure';

export const BUSINESS_FUNCTION_STATUSES: readonly BusinessFunctionStatus[] = Object.freeze([
  'success',
  'validation_failure',
  'authorization_failure',
  'not_found',
  'business_rule_failure',
  'execution_failure',
]);

/**
 * Stable public message for unexpected failures (BF-ERR-03, ADR-0009
 * amendment 2026-11-01). Identical to the Laravel runtime's
 * ExecutionResult::SAFE_MESSAGE.
 */
export const EXECUTION_FAILURE_SAFE_MESSAGE =
  'An internal error occurred while executing the business function.';

/** Public message for an execution_failure with the given reference. */
export function executionFailureSafeMessage(reference: string): string {
  return `${EXECUTION_FAILURE_SAFE_MESSAGE} Reference: ${reference}`;
}

/**
 * BusinessFunctionResult
 * Structured result from Business Function execution
 * Tracks success/failure, response data, and execution metadata
 *
 * Public vs. diagnostic error data (ADR-0009 amendment):
 * - errorMessage / errorReference / errorCategory are PUBLIC. For
 *   execution_failure, errorMessage is always the fixed safe message plus the
 *   reference (the executionId), never the raw error message.
 * - error is the original error for SERVER-SIDE diagnostics. It is
 *   non-enumerable and excluded from toObject() / toJSON(), so spreading or
 *   serializing a result does not expose it.
 */
export class BusinessFunctionResult {
  readonly executionId: string;
  readonly functionId: string;
  readonly status: BusinessFunctionStatus;
  readonly response?: any;
  declare readonly error?: Error;
  readonly errorCategory?: string;
  readonly errorMessage?: string;
  readonly errorReference?: string;
  readonly eventsPublished: readonly string[];
  readonly duration: number;
  readonly timestamp: number;
  readonly metadata: Readonly<Record<string, any>>;

  constructor(props: {
    executionId: string;
    functionId: string;
    status: BusinessFunctionStatus;
    response?: any;
    error?: Error;
    errorCategory?: string;
    errorMessage?: string;
    eventsPublished?: string[];
    duration: number;
    metadata?: Record<string, any>;
  }) {
    if (!props.executionId) throw new Error('BusinessFunctionResult requires executionId');
    if (!props.functionId) throw new Error('BusinessFunctionResult requires functionId');
    if (!props.status) throw new Error('BusinessFunctionResult requires status');
    if (!BUSINESS_FUNCTION_STATUSES.includes(props.status)) {
      throw new Error(`BusinessFunctionResult status '${props.status}' is not a WBF result status`);
    }
    if (typeof props.duration !== 'number' || props.duration < 0) {
      throw new Error('BusinessFunctionResult requires valid duration');
    }

    this.executionId = props.executionId;
    this.functionId = props.functionId;
    this.status = props.status;
    this.response = props.response;
    Object.defineProperty(this, 'error', {
      value: props.error,
      enumerable: false,
      writable: false,
      configurable: false,
    });
    this.errorCategory = props.errorCategory;
    const failed = props.status !== 'success';
    this.errorReference = failed ? props.executionId : undefined;
    // Invariant: an execution_failure never carries a supplied or
    // error-derived message, whoever constructs the result.
    this.errorMessage =
      props.status === 'execution_failure'
        ? executionFailureSafeMessage(props.executionId)
        : failed
          ? props.errorMessage ?? props.error?.message
          : undefined;
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
    return this.status !== 'success';
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
    return this.status === 'business_rule_failure';
  }

  /**
   * Public error message if failed (safe message for execution_failure)
   */
  getErrorMessage(): string | undefined {
    return this.errorMessage;
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
      error:
        this.status !== 'success'
          ? { message: this.errorMessage, category: this.errorCategory, reference: this.errorReference }
          : undefined,
      eventsPublished: [...this.eventsPublished],
      duration: this.duration,
      timestamp: this.timestamp,
      metadata: { ...this.metadata },
    };
  }

  /**
   * JSON.stringify(result) uses the public form (never the raw error)
   */
  toJSON(): Record<string, any> {
    return this.toObject();
  }

  /**
   * Convert to JSON
   */
  toJson(): string {
    return JSON.stringify(this.toObject());
  }
}

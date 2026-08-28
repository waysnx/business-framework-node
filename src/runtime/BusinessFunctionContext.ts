/**
 * BusinessFunctionContext
 * Immutable execution context for Business Function runtime
 * Tracks execution state, correlation, timing, and metadata
 */
export class BusinessFunctionContext {
  readonly functionId: string;
  readonly executionId: string;
  readonly correlationId: string;
  readonly moduleId: string;
  readonly request: Readonly<Record<string, any>>;
  readonly caller?: string | number;
  readonly startTime: number;
  readonly metadata: Readonly<Record<string, any>>;

  constructor(props: {
    functionId: string;
    executionId: string;
    correlationId: string;
    moduleId: string;
    request: Record<string, any>;
    caller?: string | number;
    metadata?: Record<string, any>;
  }) {
    if (!props.functionId) throw new Error('BusinessFunctionContext requires functionId');
    if (!props.executionId) throw new Error('BusinessFunctionContext requires executionId');
    if (!props.correlationId) throw new Error('BusinessFunctionContext requires correlationId');
    if (!props.moduleId) throw new Error('BusinessFunctionContext requires moduleId');
    if (!props.request) throw new Error('BusinessFunctionContext requires request');

    this.functionId = props.functionId;
    this.executionId = props.executionId;
    this.correlationId = props.correlationId;
    this.moduleId = props.moduleId;
    this.request = Object.freeze({ ...props.request });
    this.caller = props.caller;
    this.startTime = Date.now();
    this.metadata = Object.freeze({ ...(props.metadata || {}) });

    Object.freeze(this);
  }

  /**
   * Get elapsed time in milliseconds
   */
  elapsedTime(): number {
    return Date.now() - this.startTime;
  }

  /**
   * Convert to object
   */
  toObject(): Record<string, any> {
    return {
      functionId: this.functionId,
      executionId: this.executionId,
      correlationId: this.correlationId,
      moduleId: this.moduleId,
      request: { ...this.request },
      caller: this.caller,
      startTime: this.startTime,
      metadata: { ...this.metadata },
    };
  }
}

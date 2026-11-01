/**
 * ValidationIssue
 * Result of a single validation check
 * Contains severity, message, and context about the violation
 */
export class ValidationIssue {
  readonly validationId: string;
  readonly severity: 'error' | 'warning';
  readonly message: string;
  readonly context: Readonly<Record<string, any>>;
  /**
   * Structured issue code (e.g. 'WBF.VALIDATION.REQUIRED',
   * 'WBF.VALIDATION.UNKNOWN_RULE', or an application rule code).
   * Optional for backward compatibility; framework-generated issues set it.
   */
  readonly code?: string;

  constructor(props: {
    validationId: string;
    severity: 'error' | 'warning';
    message: string;
    context?: Record<string, any>;
    code?: string;
  }) {
    if (!props.validationId) throw new Error('ValidationIssue requires validationId');
    if (!props.severity) throw new Error('ValidationIssue requires severity');
    if (!props.message) throw new Error('ValidationIssue requires message');

    this.validationId = props.validationId;
    this.severity = props.severity;
    this.message = props.message;
    this.context = Object.freeze({ ...(props.context || {}) });
    if (props.code !== undefined) this.code = props.code;

    Object.freeze(this);
  }

  /**
   * Check if this is an error (execution-blocking)
   */
  isError(): boolean {
    return this.severity === 'error';
  }

  /**
   * Check if this is a warning (non-blocking)
   */
  isWarning(): boolean {
    return this.severity === 'warning';
  }

  /**
   * Convert to object
   */
  toObject(): Record<string, any> {
    return {
      validationId: this.validationId,
      severity: this.severity,
      message: this.message,
      ...(this.code !== undefined ? { code: this.code } : {}),
      context: { ...this.context },
    };
  }
}

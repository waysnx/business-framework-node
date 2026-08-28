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

  constructor(props: {
    validationId: string;
    severity: 'error' | 'warning';
    message: string;
    context?: Record<string, any>;
  }) {
    if (!props.validationId) throw new Error('ValidationIssue requires validationId');
    if (!props.severity) throw new Error('ValidationIssue requires severity');
    if (!props.message) throw new Error('ValidationIssue requires message');

    this.validationId = props.validationId;
    this.severity = props.severity;
    this.message = props.message;
    this.context = Object.freeze({ ...(props.context || {}) });

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
      context: { ...this.context },
    };
  }
}

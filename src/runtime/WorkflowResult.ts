/**
 * WorkflowResult
 * Immutable result from Workflow execution
 * Captures complete workflow outcome including steps, errors, and duration
 */
export class WorkflowResult {
  readonly executionId: string;
  readonly workflowId: string;
  readonly status: 'completed' | 'failed'; // 'completed' if all steps succeeded, 'failed' if any step failed
  readonly completedSteps: readonly string[]; // Step IDs that succeeded
  readonly failedSteps: readonly string[]; // Step IDs that failed (empty if succeeded)
  readonly currentStepId?: string; // Step where failure occurred (if failed)
  readonly errors: readonly string[]; // Error messages
  readonly warnings: readonly string[]; // Warning messages
  readonly duration: number;
  readonly timestamp: number;
  readonly metadata: Readonly<Record<string, any>>;

  constructor(props: {
    executionId: string;
    workflowId: string;
    status: 'completed' | 'failed';
    completedSteps?: string[];
    failedSteps?: string[];
    currentStepId?: string;
    errors?: string[];
    warnings?: string[];
    duration: number;
    metadata?: Record<string, any>;
  }) {
    if (!props.executionId) throw new Error('WorkflowResult requires executionId');
    if (!props.workflowId) throw new Error('WorkflowResult requires workflowId');
    if (!props.status) throw new Error('WorkflowResult requires status');
    if (typeof props.duration !== 'number' || props.duration < 0) {
      throw new Error('WorkflowResult requires valid duration');
    }

    this.executionId = props.executionId;
    this.workflowId = props.workflowId;
    this.status = props.status;
    this.completedSteps = Object.freeze([...(props.completedSteps || [])]);
    this.failedSteps = Object.freeze([...(props.failedSteps || [])]);
    this.currentStepId = props.currentStepId;
    this.errors = Object.freeze([...(props.errors || [])]);
    this.warnings = Object.freeze([...(props.warnings || [])]);
    this.duration = props.duration;
    this.timestamp = Date.now();
    this.metadata = Object.freeze({ ...(props.metadata || {}) });

    Object.freeze(this);
  }

  /**
   * Check if workflow succeeded
   */
  succeeded(): boolean {
    return this.status === 'completed' && this.failedSteps.length === 0;
  }

  /**
   * Check if workflow failed
   */
  failed(): boolean {
    return this.status === 'failed' || this.failedSteps.length > 0;
  }

  /**
   * Get total steps executed (completed + failed)
   */
  totalSteps(): number {
    return this.completedSteps.length + this.failedSteps.length;
  }

  /**
   * Get completion percentage
   */
  completionPercentage(): number {
    const total = this.totalSteps();
    if (total === 0) return 0;
    return (this.completedSteps.length / total) * 100;
  }

  /**
   * Get error count
   */
  errorCount(): number {
    return this.errors.length;
  }

  /**
   * Get warning count
   */
  warningCount(): number {
    return this.warnings.length;
  }

  /**
   * Check if has errors
   */
  hasErrors(): boolean {
    return this.errors.length > 0;
  }

  /**
   * Check if has warnings
   */
  hasWarnings(): boolean {
    return this.warnings.length > 0;
  }

  /**
   * Get human-readable summary
   */
  summary(): string {
    if (this.succeeded()) {
      return `Workflow completed successfully. ${this.completedSteps.length} steps executed in ${this.duration}ms.`;
    }

    if (this.failedSteps.length > 0) {
      const failedAt = this.currentStepId ? ` at step '${this.currentStepId}'.` : '.';
      return `Workflow failed${failedAt} ${this.completedSteps.length} steps completed, ${this.failedSteps.length} failed. Duration: ${this.duration}ms.`;
    }

    return `Workflow failed. Status: ${this.status}. Duration: ${this.duration}ms.`;
  }

  /**
   * Convert to object
   */
  toObject(): Record<string, any> {
    return {
      executionId: this.executionId,
      workflowId: this.workflowId,
      status: this.status,
      completedSteps: [...this.completedSteps],
      failedSteps: [...this.failedSteps],
      currentStepId: this.currentStepId,
      errors: [...this.errors],
      warnings: [...this.warnings],
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

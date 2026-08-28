/**
 * WorkflowContext
 * Immutable execution context for Workflow runtime
 * Carries workflow execution state, entity, and metadata through orchestration
 */
export class WorkflowContext {
  readonly workflowId: string;
  readonly executionId: string;
  readonly correlationId: string;
  readonly moduleId: string;
  readonly entity: any; // Business object being processed
  readonly inputData: Readonly<Record<string, any>>;
  readonly caller?: string | number;
  readonly startTime: number;
  readonly metadata: Readonly<Record<string, any>>;
  readonly options: Readonly<Record<string, any>>;
  readonly completedSteps: readonly string[]; // Step IDs that succeeded
  readonly failedSteps: readonly string[]; // Step IDs that failed
  readonly currentStepId?: string; // Currently executing step

  constructor(props: {
    workflowId: string;
    executionId: string;
    correlationId: string;
    moduleId: string;
    entity: any;
    inputData?: Record<string, any>;
    caller?: string | number;
    metadata?: Record<string, any>;
    options?: Record<string, any>;
    completedSteps?: string[];
    failedSteps?: string[];
    currentStepId?: string;
  }) {
    if (!props.workflowId) throw new Error('WorkflowContext requires workflowId');
    if (!props.executionId) throw new Error('WorkflowContext requires executionId');
    if (!props.correlationId) throw new Error('WorkflowContext requires correlationId');
    if (!props.moduleId) throw new Error('WorkflowContext requires moduleId');
    if (props.entity === null || props.entity === undefined) {
      throw new Error('WorkflowContext requires entity');
    }

    this.workflowId = props.workflowId;
    this.executionId = props.executionId;
    this.correlationId = props.correlationId;
    this.moduleId = props.moduleId;
    this.entity = props.entity;
    this.inputData = Object.freeze({ ...(props.inputData || {}) });
    this.caller = props.caller;
    this.startTime = Date.now();
    this.metadata = Object.freeze({ ...(props.metadata || {}) });
    this.options = Object.freeze({ ...(props.options || {}) });
    this.completedSteps = Object.freeze([...(props.completedSteps || [])]);
    this.failedSteps = Object.freeze([...(props.failedSteps || [])]);
    this.currentStepId = props.currentStepId;

    Object.freeze(this);
  }

  /**
   * Create a derived context with updated step tracking
   */
  withCompletedStep(stepId: string): WorkflowContext {
    return new WorkflowContext({
      workflowId: this.workflowId,
      executionId: this.executionId,
      correlationId: this.correlationId,
      moduleId: this.moduleId,
      entity: this.entity,
      inputData: { ...this.inputData },
      caller: this.caller,
      metadata: { ...this.metadata },
      options: { ...this.options },
      completedSteps: [...this.completedSteps, stepId],
      failedSteps: this.failedSteps as any,
    });
  }

  /**
   * Create a derived context with failed step
   */
  withFailedStep(stepId: string): WorkflowContext {
    return new WorkflowContext({
      workflowId: this.workflowId,
      executionId: this.executionId,
      correlationId: this.correlationId,
      moduleId: this.moduleId,
      entity: this.entity,
      inputData: { ...this.inputData },
      caller: this.caller,
      metadata: { ...this.metadata },
      options: { ...this.options },
      completedSteps: this.completedSteps as any,
      failedSteps: [...this.failedSteps, stepId],
    });
  }

  /**
   * Create a derived context with updated current step
   */
  withCurrentStep(stepId: string): WorkflowContext {
    return new WorkflowContext({
      workflowId: this.workflowId,
      executionId: this.executionId,
      correlationId: this.correlationId,
      moduleId: this.moduleId,
      entity: this.entity,
      inputData: { ...this.inputData },
      caller: this.caller,
      metadata: { ...this.metadata },
      options: { ...this.options },
      completedSteps: this.completedSteps as any,
      failedSteps: this.failedSteps as any,
      currentStepId: stepId,
    });
  }

  /**
   * Get elapsed time in milliseconds
   */
  elapsedTime(): number {
    return Date.now() - this.startTime;
  }

  /**
   * Get execution option
   */
  getOption(key: string, defaultValue?: any): any {
    return this.options[key] !== undefined ? this.options[key] : defaultValue;
  }

  /**
   * Check if option exists
   */
  hasOption(key: string): boolean {
    return key in this.options;
  }

  /**
   * Get metadata value
   */
  getMetadataValue(key: string, defaultValue?: any): any {
    return this.metadata[key] !== undefined ? this.metadata[key] : defaultValue;
  }

  /**
   * Check if metadata key exists
   */
  hasMetadata(key: string): boolean {
    return key in this.metadata;
  }

  /**
   * Convert to object
   */
  toObject(): Record<string, any> {
    return {
      workflowId: this.workflowId,
      executionId: this.executionId,
      correlationId: this.correlationId,
      moduleId: this.moduleId,
      entity: this.entity,
      inputData: { ...this.inputData },
      caller: this.caller,
      startTime: this.startTime,
      metadata: { ...this.metadata },
      options: { ...this.options },
      completedSteps: [...this.completedSteps],
      failedSteps: [...this.failedSteps],
      currentStepId: this.currentStepId,
    };
  }

  /**
   * Convert to JSON
   */
  toJson(): string {
    return JSON.stringify(this.toObject());
  }
}

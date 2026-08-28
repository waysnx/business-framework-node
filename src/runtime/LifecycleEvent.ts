/**
 * LifecycleEvent
 * Event that fires during Business Function or Workflow execution
 * Standard event names published at key lifecycle points
 */
export class LifecycleEvent {
  readonly name: string;
  readonly timestamp: number;
  readonly metadata: Readonly<Record<string, any>>;

  constructor(props: {
    name: string;
    timestamp?: number;
    metadata?: Record<string, any>;
  }) {
    if (!props.name) throw new Error('LifecycleEvent requires name');

    this.name = props.name;
    this.timestamp = props.timestamp || Date.now();
    this.metadata = Object.freeze({ ...(props.metadata || {}) });

    Object.freeze(this);
  }

  /**
   * Convert to object
   */
  toObject(): Record<string, any> {
    return {
      name: this.name,
      timestamp: this.timestamp,
      metadata: { ...this.metadata },
    };
  }
}

/**
 * Standard lifecycle event names
 */
export const LifecycleEventNames = {
  // Business Function events
  BEFORE_FUNCTION: 'beforeFunction',
  AFTER_FUNCTION: 'afterFunction',
  FUNCTION_COMPLETED: 'functionCompleted',
  FUNCTION_FAILED: 'functionFailed',

  // Validation events
  BEFORE_VALIDATION: 'beforeValidation',
  AFTER_VALIDATION: 'afterValidation',
  VALIDATION_COMPLETED: 'validationCompleted',
  VALIDATION_FAILED: 'validationFailed',

  // Workflow events (for future use)
  BEFORE_WORKFLOW: 'beforeWorkflow',
  AFTER_WORKFLOW: 'afterWorkflow',
  WORKFLOW_COMPLETED: 'workflowCompleted',
  WORKFLOW_FAILED: 'workflowFailed',
  BEFORE_STEP: 'beforeStep',
  STEP_COMPLETED: 'stepCompleted',
  STEP_FAILED: 'stepFailed',
} as const;

/**
 * WorkflowStep
 * Immutable definition of a step in a workflow
 */
export class WorkflowStep {
  readonly id: string;
  readonly sequence: number;
  readonly businessFunctionId: string;
  readonly displayName: string;
  readonly description: string;
  readonly metadata: Readonly<Record<string, any>>;

  constructor(props: {
    id: string;
    sequence: number;
    businessFunctionId: string;
    displayName?: string;
    description?: string;
    metadata?: Record<string, any>;
  }) {
    if (!props.id) throw new Error('WorkflowStep requires id');
    if (typeof props.sequence !== 'number' || props.sequence < 0) {
      throw new Error('WorkflowStep requires valid sequence');
    }
    if (!props.businessFunctionId) throw new Error('WorkflowStep requires businessFunctionId');

    this.id = props.id;
    this.sequence = props.sequence;
    this.businessFunctionId = props.businessFunctionId;
    this.displayName = props.displayName || '';
    this.description = props.description || '';
    this.metadata = Object.freeze({ ...(props.metadata || {}) });

    Object.freeze(this);
  }

  /**
   * Serialize to object
   */
  toObject(): Record<string, any> {
    return {
      id: this.id,
      sequence: this.sequence,
      businessFunctionId: this.businessFunctionId,
      displayName: this.displayName,
      description: this.description,
      metadata: { ...this.metadata },
    };
  }

  /**
   * Serialize to JSON
   */
  toJson(): string {
    return JSON.stringify(this.toObject());
  }
}

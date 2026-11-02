import { WorkflowDefinitionError } from '../errors/WorkflowDefinitionError';

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
    // WBF-SPEC-0007 / decision D8 (approved 2026-11-01): sequence is required,
    // must be an integer, and must be >= 0. There is no implicit default; 0 is valid.
    const sequence: unknown = props.sequence;
    if (sequence === undefined || sequence === null) {
      throw new WorkflowDefinitionError(
        `Workflow step '${props.id}': sequence is required`,
        'missing_sequence',
        { stepId: props.id }
      );
    }
    if (typeof sequence !== 'number' || !Number.isInteger(sequence)) {
      throw new WorkflowDefinitionError(
        `Workflow step '${props.id}': sequence must be an integer, got ${typeof sequence === 'number' ? sequence : typeof sequence}`,
        'invalid_sequence',
        { stepId: props.id }
      );
    }
    if (sequence < 0) {
      throw new WorkflowDefinitionError(
        `Workflow step '${props.id}': sequence must be >= 0, got ${sequence}`,
        'negative_sequence',
        { stepId: props.id }
      );
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

import { WBFError } from './WBFError';

/**
 * Reasons a workflow definition is rejected (WBF-SPEC-0007, decision D8).
 */
export type WorkflowDefinitionErrorReason =
  | 'missing_sequence'
  | 'invalid_sequence'
  | 'negative_sequence'
  | 'duplicate_sequence';

/**
 * WorkflowDefinitionError
 * Raised when a workflow step or workflow definition violates the sequencing
 * contract: sequence missing, not an integer, negative, or duplicated within
 * one workflow definition. Detected at construction, before any execution.
 * `context.reason` carries the machine-readable reason.
 */
export class WorkflowDefinitionError extends WBFError {
  readonly reason: WorkflowDefinitionErrorReason;

  constructor(message: string, reason: WorkflowDefinitionErrorReason, context?: Record<string, any>) {
    super(message, 'WorkflowDefinitionError', { ...context, reason });
    this.name = 'WorkflowDefinitionError';
    this.reason = reason;
  }
}

import { WBFError } from './WBFError';

/**
 * ExecutionError
 * Base class for runtime execution errors
 */
export abstract class ExecutionError extends WBFError {
  readonly stepName: string; // Which step failed (validate, authorize, rules, execute, etc.)

  constructor(message: string, category: string, stepName: string, context?: Record<string, any>) {
    super(message, category, context);
    this.stepName = stepName;
    this.name = 'ExecutionError';
  }
}

/**
 * RequestValidationError
 * Thrown when request doesn't match request contract
 */
export class RequestValidationError extends ExecutionError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 'RequestValidationError', 'validateRequest', context);
    this.name = 'RequestValidationError';
  }
}

/**
 * ResponseValidationError
 * Thrown when response doesn't match response contract
 */
export class ResponseValidationError extends ExecutionError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 'ResponseValidationError', 'transformToResponse', context);
    this.name = 'ResponseValidationError';
  }
}

/**
 * ExecutionTimeoutError
 * Thrown when execution exceeds timeout
 */
export class ExecutionTimeoutError extends ExecutionError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 'ExecutionTimeoutError', 'execute', context);
    this.name = 'ExecutionTimeoutError';
  }
}

/**
 * HandlerNotFoundError
 * Thrown when business function handler not found
 */
export class HandlerNotFoundError extends ExecutionError {
  constructor(functionId: string, context?: Record<string, any>) {
    super(
      `No handler found for business function '${functionId}'`,
      'HandlerNotFoundError',
      'executeBusiness',
      context
    );
    this.name = 'HandlerNotFoundError';
  }
}

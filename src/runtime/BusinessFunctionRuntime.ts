import { BusinessFunctionDefinition } from '../definitions';
import { ValidationFramework } from './ValidationFramework';
import { LifecycleManager } from './LifecycleManager';
import { BusinessFunctionContext } from './BusinessFunctionContext';
import { BusinessFunctionResult } from './BusinessFunctionResult';
import { LifecycleEvent, LifecycleEventNames } from './LifecycleEvent';
import { LifecycleContext } from './LifecycleContext';
import { BusinessFunctionStatus } from './BusinessFunctionResult';
import {
  WBFError,
  ValidationError,
  AuthorizationError,
  BusinessRuleViolation,
  ResourceNotFound,
  RequestValidationError,
  ResponseValidationError,
  HandlerNotFoundError,
} from '../errors';

/**
 * BusinessFunctionHandler
 * Interface for executable business logic
 * Application implements this to provide the core business operation
 */
export type BusinessFunctionHandler = (
  request: any,
  context: BusinessFunctionContext
) => Promise<any>;

/**
 * AuthorizationDecision
 * Explicit outcome of an authorization check. Only `{ allowed: true }`
 * permits execution. Status: public API, approved (decision D6, ADR-0010, 2026-11-01).
 */
export interface AuthorizationDecision {
  allowed: boolean;
  reason?: string;
}

/**
 * Authorizer
 * Host-application supplied decision point. WBF does not authenticate users
 * or own policies; the caller in `context` is identity input to the decision,
 * never proof of authorization by itself.
 */
export type Authorizer = (
  request: any,
  context: BusinessFunctionContext,
  definition: BusinessFunctionDefinition
) => AuthorizationDecision | Promise<AuthorizationDecision>;

/**
 * Convenience constructors for explicit decisions.
 */
export const AuthorizationDecisions = Object.freeze({
  allow: (reason?: string): AuthorizationDecision => ({ allowed: true, reason }),
  deny: (reason = 'Access denied'): AuthorizationDecision => ({ allowed: false, reason }),
});

/**
 * Context passed to an ErrorReporter for an unexpected failure.
 * `error` is the original error, with its message and stack.
 */
export interface UnexpectedErrorReport {
  reference: string;
  executionId: string;
  correlationId: string;
  functionId: string;
  errorCategory: string;
  error: unknown;
}

/**
 * ErrorReporter
 * Server-side sink for unexpected failures (execution_failure). The public
 * result only carries a safe message and the reference (ADR-0009 amendment,
 * BF-ERR-03); the full detail goes here, correlated by the same reference.
 * Compatible with `logger.error(message, meta)` style loggers.
 */
export type ErrorReporter = (message: string, report: UnexpectedErrorReport) => void;

/** Default reporter: console.error with the original error (message + stack). */
export const defaultErrorReporter: ErrorReporter = (message, report) => {
  // eslint-disable-next-line no-console
  console.error(message, report.error);
};

/**
 * BusinessFunctionRuntime
 * Executes business functions with the fixed 6-step pipeline
 * 
 * Pipeline sequence (non-negotiable):
 * 1. validateRequest - Validate request structure against contract
 * 2. checkAuthorization - Check caller has required permissions
 * 3. evaluateBusinessRules - Execute validation rules
 * 4. executeBusiness - Call the core business logic handler
 * 5. publishEvents - Publish domain events
 * 6. transformToResponse - Ensure response matches contract
 */
export class BusinessFunctionRuntime {
  private handlers: Map<string, BusinessFunctionHandler> = new Map();
  private errorReporter: ErrorReporter = defaultErrorReporter;

  constructor(
    private definition: BusinessFunctionDefinition,
    private validationFramework?: ValidationFramework,
    private lifecycleManager?: LifecycleManager,
    private authorizer?: Authorizer
  ) {
    if (!definition) throw new Error('BusinessFunctionRuntime requires BusinessFunctionDefinition');
  }

  /**
   * Register a handler for this business function
   */
  registerHandler(handler: BusinessFunctionHandler): this {
    if (!handler) throw new Error('Cannot register null handler');
    this.handlers.set(this.definition.id, handler);
    return this;
  }

  /**
   * Execute the business function
   * Returns a BusinessFunctionResult with execution details
   */
  async execute(
    request: any,
    caller?: string | number,
    metadata?: Record<string, any>
  ): Promise<BusinessFunctionResult> {
    const executionId = this.generateExecutionId();
    const correlationId = metadata?.correlationId || executionId;
    const startTime = Date.now();

    // Create execution context.
    // NOD-06: a null/non-object request must yield a structured
    // validation_failure result, not an uncontrolled rejection. The context
    // therefore never receives an invalid request; validateRequest() below
    // rejects the original value inside the normal failure path.
    const context = new BusinessFunctionContext({
      functionId: this.definition.id,
      executionId,
      correlationId,
      moduleId: this.definition.moduleId,
      request: BusinessFunctionRuntime.isPlainObjectRequest(request) ? request : {},
      caller,
      metadata: { ...metadata, caller },
    });

    // Track published events
    const publishedEvents: string[] = [];
    let response: any;

    try {
      // Dispatch lifecycle event: beforeFunction
      await this.dispatchLifecycleEvent(LifecycleEventNames.BEFORE_FUNCTION, context);

      // Step 1: Validate request
      await this.validateRequest(request);

      // Step 2: Check authorization (fails closed, NOD-03)
      await this.checkAuthorization(request, context);

      // Step 3: Evaluate business rules
      await this.evaluateBusinessRules(request);

      // Step 4: Execute core business logic
      response = await this.executeBusiness(request, context);

      // Step 5: Publish events
      publishedEvents.push(...(await this.publishEvents()));

      // Step 6: Transform to response
      response = await this.transformToResponse(response);

      // Dispatch lifecycle event: functionCompleted
      await this.dispatchLifecycleEvent(LifecycleEventNames.FUNCTION_COMPLETED, context);

      // Return successful result
      const duration = Date.now() - startTime;
      return new BusinessFunctionResult({
        executionId,
        functionId: this.definition.id,
        status: 'success',
        response,
        eventsPublished: publishedEvents,
        duration,
        metadata: {
          correlationId,
          caller,
        },
      });
    } catch (error) {
      // Classify into the WBF result statuses (WBF-SPEC-0006, decision D1)
      const { status, errorCategory } = BusinessFunctionRuntime.classify(error);

      if (status === 'execution_failure') {
        // Public result: safe message + reference only (BF-ERR-03).
        // Server side: full detail, correlated by the same reference.
        this.reportUnexpected(error, executionId, correlationId, errorCategory);
      }

      // Dispatch lifecycle event: functionFailed
      await this.dispatchLifecycleEvent(LifecycleEventNames.FUNCTION_FAILED, context);

      // Return failure result
      const duration = Date.now() - startTime;
      return new BusinessFunctionResult({
        executionId,
        functionId: this.definition.id,
        status,
        error: error as Error,
        errorCategory,
        eventsPublished: publishedEvents,
        duration,
        metadata: {
          correlationId,
          caller,
        },
      });
    }
  }

  /**
   * Step 1: Validate request
   * Ensure request is a plain object matching the request contract
   */
  private async validateRequest(request: any): Promise<void> {
    if (!request) {
      throw new RequestValidationError('Request is required', {
        functionId: this.definition.id,
        step: 'validateRequest',
      });
    }

    // Ensure it's an object (not array or primitive)
    if (typeof request !== 'object' || Array.isArray(request)) {
      throw new RequestValidationError('Request must be a plain object', {
        functionId: this.definition.id,
        step: 'validateRequest',
        requestType: Array.isArray(request) ? 'array' : typeof request,
      });
    }

    // For now, we accept any object structure
    // In a full implementation, this would validate against the contract schema
    // Example: check required fields, validate types, etc.
  }

  /**
   * Step 2: Check authorization
   *
   * Authorization FAILS CLOSED (Phase 0 decision D6, NOD-03). Execution
   * proceeds only when the configured Authorizer returns a decision object
   * whose `allowed` property is exactly `true`. Previously any truthy caller
   * value was accepted, which treated caller-supplied data as proof of
   * authorization.
   *
   * Failure modes (all raise AuthorizationError, category 'AuthorizationError'):
   * - no authorizer configured             → context.reason 'no_authorizer'
   * - authorizer returned a non-decision   → context.reason 'invalid_decision'
   * - authorizer returned allowed: false   → context.reason 'denied'
   */
  private async checkAuthorization(request: any, context: BusinessFunctionContext): Promise<void> {
    const base = { functionId: this.definition.id, step: 'checkAuthorization' };

    if (!this.authorizer) {
      throw new AuthorizationError(
        `Authorization required for '${this.definition.id}': no authorizer configured`,
        { ...base, reason: 'no_authorizer' }
      );
    }

    const decision: unknown = await this.authorizer(request, context, this.definition);

    if (
      decision === null ||
      typeof decision !== 'object' ||
      typeof (decision as AuthorizationDecision).allowed !== 'boolean'
    ) {
      throw new AuthorizationError(
        `Authorization failed for '${this.definition.id}': authorizer returned an invalid decision`,
        { ...base, reason: 'invalid_decision' }
      );
    }

    if ((decision as AuthorizationDecision).allowed !== true) {
      const reason = (decision as AuthorizationDecision).reason || 'Access denied';
      throw new AuthorizationError(`Authorization denied for '${this.definition.id}': ${reason}`, {
        ...base,
        reason: 'denied',
      });
    }
  }

  /**
   * Set the authorizer (explicit authorization decision point).
   * Status: public API, approved (decision D6, ADR-0010, 2026-11-01).
   */
  setAuthorizer(authorizer: Authorizer): this {
    if (typeof authorizer !== 'function') throw new Error('Authorizer must be a function');
    this.authorizer = authorizer;
    return this;
  }

  /**
   * Set the server-side reporter for unexpected failures (default:
   * console.error). See ErrorReporter.
   */
  setErrorReporter(reporter: ErrorReporter): this {
    if (typeof reporter !== 'function') throw new Error('ErrorReporter must be a function');
    this.errorReporter = reporter;
    return this;
  }

  private reportUnexpected(
    error: unknown,
    executionId: string,
    correlationId: string,
    errorCategory: string
  ): void {
    const message = `WBF execution_failure in business function '${this.definition.id}' (reference ${executionId})`;
    const report: UnexpectedErrorReport = {
      reference: executionId,
      executionId,
      correlationId,
      functionId: this.definition.id,
      errorCategory,
      error,
    };
    try {
      this.errorReporter(message, report);
    } catch (reporterError) {
      // A failing reporter must neither hide the original error nor turn the
      // structured result into a rejection. Fall back to the default sink.
      defaultErrorReporter(message, report);
      defaultErrorReporter(`WBF error reporter failed while reporting reference ${executionId}`, {
        ...report,
        error: reporterError,
      });
    }
  }

  /**
   * Whether an authorizer is configured.
   */
  hasAuthorizer(): boolean {
    return !!this.authorizer;
  }

  /**
   * Map a failure to a WBF result status (WBF-SPEC-0006 §3, decision D1).
   *
   * - Request validation errors          → validation_failure     (ValidationError)
   * - AuthorizationError                 → authorization_failure  (AuthorizationError)
   * - ResourceNotFound (business resource) → not_found            (ResourceNotFound)
   * - BusinessRuleViolation              → business_rule_failure  (BusinessRuleViolation)
   * - everything else, including a missing handler, an invalid response and
   *   any unexpected error               → execution_failure      (own category or InternalSystemError)
   *
   * Registry NotFoundError (framework artifact lookup) is not a business
   * resource and therefore maps to execution_failure, not not_found.
   */
  static classify(error: unknown): { status: BusinessFunctionStatus; errorCategory: string } {
    if (error instanceof RequestValidationError || error instanceof ValidationError) {
      return { status: 'validation_failure', errorCategory: 'ValidationError' };
    }
    if (error instanceof AuthorizationError) {
      return { status: 'authorization_failure', errorCategory: 'AuthorizationError' };
    }
    if (error instanceof ResourceNotFound) {
      return { status: 'not_found', errorCategory: 'ResourceNotFound' };
    }
    if (error instanceof BusinessRuleViolation) {
      return { status: 'business_rule_failure', errorCategory: 'BusinessRuleViolation' };
    }
    const category = error instanceof WBFError ? error.category : 'InternalSystemError';
    return { status: 'execution_failure', errorCategory: category || 'InternalSystemError' };
  }

  /**
   * True when the request is a non-null, non-array object.
   */
  private static isPlainObjectRequest(request: unknown): request is Record<string, any> {
    return request !== null && typeof request === 'object' && !Array.isArray(request);
  }

  /**
   * Step 3: Evaluate business rules
   * Execute validation rules using ValidationFramework
   */
  private async evaluateBusinessRules(request: any): Promise<void> {
    if (!this.validationFramework) {
      // Validation framework optional for Phase 2
      return;
    }

    // Get scope for validation lookup
    const scope = this.definition.moduleId;

    // Evaluate all validations for this scope
    const issues = await this.validationFramework.evaluate(request, scope);

    // Check for error-level issues
    const errorIssues = issues.filter((issue) => issue.isError());

    if (errorIssues.length > 0) {
      // Throw on first error
      const firstError = errorIssues[0];
      throw new BusinessRuleViolation(firstError.message, {
        functionId: this.definition.id,
        step: 'evaluateBusinessRules',
        validationId: firstError.validationId,
        issues: issues.map((i) => i.toObject()),
      });
    }
  }

  /**
   * Step 4: Execute business logic
   * Call the registered handler with the request
   */
  private async executeBusiness(request: any, context: BusinessFunctionContext): Promise<any> {
    const handler = this.handlers.get(this.definition.id);

    if (!handler) {
      throw new HandlerNotFoundError(this.definition.id, {
        step: 'executeBusiness',
        registeredHandlers: Array.from(this.handlers.keys()),
      });
    }

    // Execute handler
    try {
      return await handler(request, context);
    } catch (error) {
      // Wrap handler errors
      throw error;
    }
  }

  /**
   * Step 5: Publish events
   * Publish domain events declared in eventsPublished
   * Returns list of published event names
   */
  private async publishEvents(): Promise<string[]> {
    const eventsPublished = (this.definition as any).eventsPublished || [];

    // In Phase 2, we just track that events would be published
    // In a full implementation, this would call an event bus
    // Example: await eventBus.publish(eventsPublished[0], result);

    return eventsPublished;
  }

  /**
   * Step 6: Transform to response
   * Ensure response matches the response contract
   */
  private async transformToResponse(response: any): Promise<any> {
    // For now, we accept any response
    // In a full implementation, this would validate against the contract schema
    // Example: validate response has required fields, correct types, etc.

    // Ensure we return an object (can be empty)
    if (response === null || response === undefined) {
      return {};
    }

    if (typeof response !== 'object') {
      throw new ResponseValidationError('Response must be an object', {
        functionId: this.definition.id,
        step: 'transformToResponse',
        responseType: typeof response,
      });
    }

    return response;
  }

  /**
   * Dispatch lifecycle event
   */
  private async dispatchLifecycleEvent(
    eventName: string,
    context: BusinessFunctionContext
  ): Promise<void> {
    if (!this.lifecycleManager) {
      return; // Lifecycle manager optional
    }

    if (!this.lifecycleManager.hasHandlersFor(eventName)) {
      return; // No handlers for this event
    }

    const event = new LifecycleEvent({
      name: eventName,
      metadata: {
        functionId: this.definition.id,
        executionId: context.executionId,
        correlationId: context.correlationId,
      },
    });

    const lifecycleContext = new LifecycleContext({
      entityId: context.executionId,
      entityType: 'BusinessFunction',
      action: 'execute',
      actor: context.caller || 'system',
      metadata: context.metadata,
    });

    await this.lifecycleManager.dispatch(event, lifecycleContext);
  }

  /**
   * Generate unique execution ID
   */
  private generateExecutionId(): string {
    // Use UUID v4 for unique execution ID
    // Since crypto.randomUUID is not imported, create simple ID
    return `exec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get the definition
   */
  getDefinition(): BusinessFunctionDefinition {
    return this.definition;
  }

  /**
   * Check if handler is registered
   */
  hasHandler(): boolean {
    return this.handlers.has(this.definition.id);
  }
}

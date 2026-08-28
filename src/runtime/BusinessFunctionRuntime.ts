import { BusinessFunctionDefinition } from '../definitions';
import { ValidationFramework } from './ValidationFramework';
import { LifecycleManager } from './LifecycleManager';
import { BusinessFunctionContext } from './BusinessFunctionContext';
import { BusinessFunctionResult } from './BusinessFunctionResult';
import { LifecycleEvent, LifecycleEventNames } from './LifecycleEvent';
import { LifecycleContext } from './LifecycleContext';
import {
  ValidationError,
  AuthorizationError,
  BusinessRuleViolation,
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

  constructor(
    private definition: BusinessFunctionDefinition,
    private validationFramework?: ValidationFramework,
    private lifecycleManager?: LifecycleManager
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

    // Create execution context
    const context = new BusinessFunctionContext({
      functionId: this.definition.id,
      executionId,
      correlationId,
      moduleId: this.definition.moduleId,
      request,
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

      // Step 2: Check authorization
      await this.checkAuthorization(caller);

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
      // Determine error status and category
      let status: 'failure' | 'validation_failure' | 'rule_failure' = 'failure';
      let errorCategory = (error as any).category || 'InternalSystemError';

      // Check error type for status determination
      if (error instanceof RequestValidationError || error instanceof ResponseValidationError) {
        status = 'validation_failure';
      } else if (error instanceof ValidationError || error instanceof RequestValidationError) {
        status = 'validation_failure';
        errorCategory = 'ValidationError';
      } else if (error instanceof BusinessRuleViolation) {
        status = 'rule_failure';
        errorCategory = 'BusinessRuleViolation';
      } else if (error instanceof AuthorizationError) {
        errorCategory = 'AuthorizationError';
      }
      
      // Override with category name for clarity
      if (error instanceof RequestValidationError) {
        errorCategory = 'ValidationError';
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
   * Verify caller provided if authorization requirements exist
   * Note: Phase 2 checks caller presence only. Permission verification deferred to Phase 3+
   */
  private async checkAuthorization(
    caller: string | number | undefined
  ): Promise<void> {
    const authRequirements = (this.definition as any).authorizationRequirements || {};

    // If no specific requirements, skip
    if (!authRequirements.permissions || authRequirements.permissions.length === 0) {
      return;
    }

    // If no caller provided but permissions required, deny
    if (!caller) {
      throw new AuthorizationError('Caller required for this operation', {
        functionId: this.definition.id,
        step: 'checkAuthorization',
        requiredPermissions: authRequirements.permissions,
      });
    }

    // In a full implementation, this would check caller against required permissions
    // For now, we just accept any caller who is authenticated
    // Example: const hasPermission = await authService.check(caller, authRequirements.permissions);
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

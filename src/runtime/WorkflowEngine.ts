import { WorkflowDefinition } from '../definitions';
import { WorkflowRegistry } from '../registries';
import { LifecycleManager } from './LifecycleManager';
import { BusinessFunctionRuntime } from './BusinessFunctionRuntime';
import { WorkflowContext } from './WorkflowContext';
import { WorkflowResult } from './WorkflowResult';
import { LifecycleEvent } from './LifecycleEvent';
import { LifecycleContext } from './LifecycleContext';
import { NotFoundError } from '../errors';

/**
 * WorkflowEngine
 * Orchestrates multi-step business processes
 * Coordinates workflow execution through sequential business functions
 * Integration point for ValidationFramework and LifecycleManager
 */
export class WorkflowEngine {
  private businessFunctionRuntimes: Map<string, BusinessFunctionRuntime> = new Map();

  constructor(
    private registry: WorkflowRegistry,
    private lifecycleManager?: LifecycleManager
  ) {
    if (!registry) throw new Error('WorkflowEngine requires WorkflowRegistry');
  }

  /**
   * Register a BusinessFunctionRuntime for a specific function
   * Called by application to configure business logic for workflow steps
   */
  registerBusinessFunction(
    functionId: string,
    runtime: BusinessFunctionRuntime
  ): this {
    if (!functionId) throw new Error('Cannot register null function ID');
    if (!runtime) throw new Error('Cannot register null runtime');
    this.businessFunctionRuntimes.set(functionId, runtime);
    return this;
  }

  /**
   * Check if runtime is registered for function
   */
  hasBusinessFunction(functionId: string): boolean {
    return this.businessFunctionRuntimes.has(functionId);
  }

  /**
   * Execute a workflow
   * Main entry point for workflow orchestration
   */
  async execute(workflowId: string, context: WorkflowContext): Promise<WorkflowResult> {
    const startTime = Date.now();
    let executionContext = context;
    const errors: string[] = [];
    const warnings: string[] = [];
    const completedSteps: string[] = [];
    const failedSteps: string[] = [];

    try {
      // Load workflow definition
      const workflow = this.registry.findById(workflowId);
      if (!workflow) {
        throw new NotFoundError('Workflow', workflowId);
      }

      // Dispatch lifecycle event: beforeWorkflow
      await this.dispatchLifecycleEvent('beforeWorkflow', executionContext);

      // Execute each step in sequence
      for (const step of workflow.steps) {
        // Update context with current step
        executionContext = executionContext.withCurrentStep(step.id);

        // Dispatch lifecycle event: beforeStep
        await this.dispatchLifecycleEvent('beforeStep', executionContext);

        try {
          // Execute the step
          await this.executeStep(step, executionContext);

          // Step succeeded
          executionContext = executionContext.withCompletedStep(step.id);
          completedSteps.push(step.id);

          // Dispatch lifecycle event: stepCompleted
          await this.dispatchLifecycleEvent('stepCompleted', executionContext);
        } catch (error) {
          // Step failed
          const errorMessage = error instanceof Error ? error.message : String(error);
          errors.push(
            `Step '${step.id}' failed: ${errorMessage}`
          );

          executionContext = executionContext.withFailedStep(step.id);
          failedSteps.push(step.id);

          // Dispatch lifecycle event: stepFailed
          await this.dispatchLifecycleEvent('stepFailed', executionContext);

          // Fail-fast: stop workflow on first step failure
          break;
        }

        // Dispatch lifecycle event: afterStep
        await this.dispatchLifecycleEvent('afterStep', executionContext);
      }

      // Determine workflow status
      const status = failedSteps.length === 0 ? 'completed' : 'failed';
      const duration = Date.now() - startTime;

      // Dispatch lifecycle event: workflowCompleted or workflowFailed
      const finalEvent =
        status === 'completed' ? 'workflowCompleted' : 'workflowFailed';
      await this.dispatchLifecycleEvent(finalEvent, executionContext);

      // Dispatch lifecycle event: afterWorkflow
      await this.dispatchLifecycleEvent('afterWorkflow', executionContext);

      // Return workflow result
      return new WorkflowResult({
        executionId: executionContext.executionId,
        workflowId,
        status,
        completedSteps,
        failedSteps,
        currentStepId: failedSteps.length > 0 ? failedSteps[failedSteps.length - 1] : undefined,
        errors,
        warnings,
        duration,
        metadata: {
          correlationId: executionContext.correlationId,
          caller: executionContext.caller,
        },
      });
    } catch (error) {
      // Workflow failed during execution
      const errorMessage = error instanceof Error ? error.message : String(error);
      errors.push(`Workflow execution failed: ${errorMessage}`);

      const duration = Date.now() - startTime;

      // Dispatch lifecycle event: workflowFailed
      await this.dispatchLifecycleEvent('workflowFailed', executionContext);

      // Dispatch lifecycle event: afterWorkflow
      await this.dispatchLifecycleEvent('afterWorkflow', executionContext);

      return new WorkflowResult({
        executionId: executionContext.executionId,
        workflowId,
        status: 'failed',
        completedSteps,
        failedSteps,
        errors,
        warnings,
        duration,
        metadata: {
          correlationId: executionContext.correlationId,
          caller: executionContext.caller,
        },
      });
    }
  }

  /**
   * Execute a single workflow step
   * This is the core orchestration logic for a step
   */
  private async executeStep(step: any, context: WorkflowContext): Promise<void> {
    // Get the business function runtime for this step
    const runtime = this.businessFunctionRuntimes.get(step.businessFunctionId);
    if (!runtime) {
      throw new Error(
        `No business function runtime registered for '${step.businessFunctionId}'`
      );
    }

    // Execute the business function
    // Application provides the request mapping via executeBusinessFunction
    const result = await this.executeBusinessFunction(
      step.businessFunctionId,
      context
    );

    // Check if execution succeeded
    if (!result.succeeded()) {
      throw new Error(
        `Business function '${step.businessFunctionId}' failed: ${result.error?.message || 'Unknown error'}`
      );
    }
  }

  /**
   * Execute business function for a step
   * Extension point: application overrides this to map workflow context to function request
   * Default implementation: simple pass-through of input data as request
   */
  protected async executeBusinessFunction(
    functionId: string,
    context: WorkflowContext
  ): Promise<any> {
    const runtime = this.businessFunctionRuntimes.get(functionId);
    if (!runtime) {
      throw new Error(`No business function runtime for '${functionId}'`);
    }

    // Default: use workflow input data as function request
    // Application should override this to customize request mapping
    const request = { ...context.inputData };

    // Execute the business function
    const result = await runtime.execute(request, context.caller);

    // Note: result stored in metadata by application if needed
    // (WorkflowContext.metadata is immutable, updates via new context)

    return result;
  }

  /**
   * Dispatch lifecycle event
   */
  private async dispatchLifecycleEvent(
    eventName: string,
    context: WorkflowContext
  ): Promise<void> {
    if (!this.lifecycleManager) {
      return; // Lifecycle manager optional
    }

    const event = new LifecycleEvent({
      name: eventName,
      metadata: {
        workflowId: context.workflowId,
        executionId: context.executionId,
        correlationId: context.correlationId,
        currentStepId: context.currentStepId,
      },
    });

    const lifecycleContext = new LifecycleContext({
      entityId: context.executionId,
      entityType: 'Workflow',
      action: 'execute',
      actor: context.caller || 'system',
      metadata: {
        workflowId: context.workflowId,
        correlationId: context.correlationId,
      },
    });

    await this.lifecycleManager.dispatch(event, lifecycleContext);
  }

  /**
   * Get workflow definition
   */
  getWorkflow(workflowId: string): WorkflowDefinition {
    const workflow = this.registry.findById(workflowId);
    if (!workflow) {
      throw new NotFoundError('Workflow', workflowId);
    }
    return workflow;
  }
}

import {
  WorkflowEngine,
  WorkflowContext,
  WorkflowResult,
  BusinessFunctionRuntime,
  LifecycleManager,
  LifecycleEvent,
} from '../runtime';
import {
  WorkflowDefinition,
  WorkflowStep,
  BusinessFunctionDefinition,
} from '../definitions';
import { WorkflowRegistry } from '../registries';

describe('Phase 3 Workflow', () => {
  describe('WorkflowContext', () => {
    test('should create context', () => {
      const context = new WorkflowContext({
        workflowId: 'wf-001',
        executionId: 'exec-001',
        correlationId: 'corr-001',
        moduleId: 'HR',
        entity: { id: 'emp-001', name: 'John Doe' },
        inputData: { leaveType: 'vacation', days: 5 },
        caller: 'user-001',
      });

      expect(context.workflowId).toBe('wf-001');
      expect(context.executionId).toBe('exec-001');
      expect(context.correlationId).toBe('corr-001');
      expect(context.moduleId).toBe('HR');
      expect(context.entity.id).toBe('emp-001');
      expect(context.caller).toBe('user-001');
      expect(context.elapsedTime()).toBeGreaterThanOrEqual(0);
    });

    test('should track completed steps', () => {
      const context = new WorkflowContext({
        workflowId: 'wf-001',
        executionId: 'exec-001',
        correlationId: 'corr-001',
        moduleId: 'HR',
        entity: { id: 'emp-001' },
      });

      expect(context.completedSteps).toEqual([]);

      const updated = context.withCompletedStep('step-1');
      expect(updated.completedSteps).toContain('step-1');
      expect(context.completedSteps).toEqual([]); // Original immutable
    });

    test('should track failed steps', () => {
      const context = new WorkflowContext({
        workflowId: 'wf-001',
        executionId: 'exec-001',
        correlationId: 'corr-001',
        moduleId: 'HR',
        entity: { id: 'emp-001' },
      });

      const updated = context.withFailedStep('step-2');
      expect(updated.failedSteps).toContain('step-2');
      expect(context.failedSteps).toEqual([]); // Original immutable
    });

    test('should track current step', () => {
      const context = new WorkflowContext({
        workflowId: 'wf-001',
        executionId: 'exec-001',
        correlationId: 'corr-001',
        moduleId: 'HR',
        entity: { id: 'emp-001' },
      });

      const updated = context.withCurrentStep('step-1');
      expect(updated.currentStepId).toBe('step-1');
      expect(context.currentStepId).toBeUndefined(); // Original immutable
    });

    test('should support options and metadata', () => {
      const context = new WorkflowContext({
        workflowId: 'wf-001',
        executionId: 'exec-001',
        correlationId: 'corr-001',
        moduleId: 'HR',
        entity: { id: 'emp-001' },
        options: { retry: true, timeout: 5000 },
        metadata: { source: 'api', version: '1.0' },
      });

      expect(context.getOption('retry')).toBe(true);
      expect(context.getOption('missing')).toBeUndefined();
      expect(context.hasOption('retry')).toBe(true);

      expect(context.getMetadataValue('source')).toBe('api');
      expect(context.getMetadataValue('missing')).toBeUndefined();
      expect(context.hasMetadata('source')).toBe(true);
    });

    test('should serialize context', () => {
      const context = new WorkflowContext({
        workflowId: 'wf-001',
        executionId: 'exec-001',
        correlationId: 'corr-001',
        moduleId: 'HR',
        entity: { id: 'emp-001' },
        inputData: { data: 'test' },
      });

      const obj = context.toObject();
      expect(obj.workflowId).toBe('wf-001');
      expect(obj.executionId).toBe('exec-001');

      const json = context.toJson();
      expect(JSON.parse(json).workflowId).toBe('wf-001');
    });

    test('should be deeply immutable', () => {
      const context = new WorkflowContext({
        workflowId: 'wf-001',
        executionId: 'exec-001',
        correlationId: 'corr-001',
        moduleId: 'HR',
        entity: { id: 'emp-001' },
      });

      // Attempt to modify should fail
      expect(() => {
        (context as any).workflowId = 'different';
      }).toThrow();
    });
  });

  describe('WorkflowResult', () => {
    test('should create result', () => {
      const result = new WorkflowResult({
        executionId: 'exec-001',
        workflowId: 'wf-001',
        status: 'completed',
        completedSteps: ['step-1', 'step-2'],
        duration: 500,
      });

      expect(result.executionId).toBe('exec-001');
      expect(result.workflowId).toBe('wf-001');
      expect(result.status).toBe('completed');
      expect(result.succeeded()).toBe(true);
      expect(result.failed()).toBe(false);
    });

    test('should track failed result', () => {
      const result = new WorkflowResult({
        executionId: 'exec-001',
        workflowId: 'wf-001',
        status: 'failed',
        completedSteps: ['step-1'],
        failedSteps: ['step-2'],
        currentStepId: 'step-2',
        duration: 250,
      });

      expect(result.failed()).toBe(true);
      expect(result.succeeded()).toBe(false);
      expect(result.totalSteps()).toBe(2);
      expect(result.completionPercentage()).toBe(50);
    });

    test('should track errors and warnings', () => {
      const result = new WorkflowResult({
        executionId: 'exec-001',
        workflowId: 'wf-001',
        status: 'failed',
        errors: ['Error 1', 'Error 2'],
        warnings: ['Warning 1'],
        duration: 300,
      });

      expect(result.errorCount()).toBe(2);
      expect(result.warningCount()).toBe(1);
      expect(result.hasErrors()).toBe(true);
      expect(result.hasWarnings()).toBe(true);
    });

    test('should generate summary', () => {
      const successResult = new WorkflowResult({
        executionId: 'exec-001',
        workflowId: 'wf-001',
        status: 'completed',
        completedSteps: ['step-1', 'step-2'],
        duration: 500,
      });

      const summary = successResult.summary();
      expect(summary).toContain('successfully');
      expect(summary).toContain('2 steps');

      const failedResult = new WorkflowResult({
        executionId: 'exec-002',
        workflowId: 'wf-001',
        status: 'failed',
        completedSteps: ['step-1'],
        failedSteps: ['step-2'],
        currentStepId: 'step-2',
        duration: 250,
      });

      const failedSummary = failedResult.summary();
      expect(failedSummary).toContain('failed');
      expect(failedSummary).toContain('step-2');
    });

    test('should serialize result', () => {
      const result = new WorkflowResult({
        executionId: 'exec-001',
        workflowId: 'wf-001',
        status: 'completed',
        completedSteps: ['step-1'],
        duration: 500,
      });

      const obj = result.toObject();
      expect(obj.executionId).toBe('exec-001');
      expect(obj.completedSteps).toEqual(['step-1']);

      const json = result.toJson();
      expect(JSON.parse(json).workflowId).toBe('wf-001');
    });
  });

  describe('WorkflowEngine', () => {
    let registry: WorkflowRegistry;
    let engine: WorkflowEngine;
    let lifecycleManager: LifecycleManager;

    beforeEach(() => {
      registry = new WorkflowRegistry();
      lifecycleManager = new LifecycleManager();
      engine = new WorkflowEngine(registry, lifecycleManager);
    });

    test('should create engine', () => {
      expect(engine).toBeDefined();
    });

    test('should execute single-step workflow', async () => {
      // Create step
      const step = new WorkflowStep({
        id: 'step-1',
        sequence: 0,
        businessFunctionId: 'HR.LEAVE.APPLY.APPLY_LEAVE',
        displayName: 'Apply Leave',
      });

      // Create workflow
      const workflow = new WorkflowDefinition({
        id: 'employee-onboarding',
        name: 'EmployeeOnboarding',
        displayName: 'Employee Onboarding',
        description: 'Onboarding workflow',
        moduleId: 'HR',
        steps: [step],
      });

      registry.register(workflow);

      // Create business function
      const fn = new BusinessFunctionDefinition({
        id: 'HR.LEAVE.APPLY.APPLY_LEAVE',
        name: 'ApplyLeave',
        displayName: 'Apply for Leave',
        description: 'Apply for leave',
        moduleId: 'HR',
        domain: 'LEAVE',
        capability: 'APPLY',
      });

      // Create runtime and register
      const runtime = new BusinessFunctionRuntime(fn);
      const handler = async () => ({ requestId: 'req-001', status: 'pending' });
      runtime.registerHandler(handler);

      engine.registerBusinessFunction('HR.LEAVE.APPLY.APPLY_LEAVE', runtime);

      // Create context
      const context = new WorkflowContext({
        workflowId: 'employee-onboarding',
        executionId: 'exec-001',
        correlationId: 'corr-001',
        moduleId: 'HR',
        entity: { id: 'emp-001', name: 'John Doe' },
      });

      // Execute
      const result = await engine.execute('employee-onboarding', context);

      expect(result.status).toBe('completed');
      expect(result.succeeded()).toBe(true);
      expect(result.completedSteps).toContain('step-1');
      expect(result.failedSteps).toEqual([]);
    });

    test('should execute multi-step workflow', async () => {
      // Create steps
      const step1 = new WorkflowStep({
        id: 'step-1',
        sequence: 0,
        businessFunctionId: 'HR.VALIDATE.VALIDATE_EMPLOYEE',
        displayName: 'Validate Employee',
      });

      const step2 = new WorkflowStep({
        id: 'step-2',
        sequence: 1,
        businessFunctionId: 'HR.ONBOARD.SEND_WELCOME',
        displayName: 'Send Welcome',
      });

      // Create workflow
      const workflow = new WorkflowDefinition({
        id: 'new-hire',
        name: 'NewHire',
        displayName: 'New Hire',
        description: 'New hire workflow',
        moduleId: 'HR',
        steps: [step1, step2],
      });

      registry.register(workflow);

      // Register functions
      const fn1 = new BusinessFunctionDefinition({
        id: 'HR.VALIDATE.VALIDATE_EMPLOYEE',
        name: 'ValidateEmployee',
        displayName: 'Validate',
        description: 'Validate',
        moduleId: 'HR',
        domain: 'VALIDATE',
        capability: 'VALIDATE_EMPLOYEE',
      });

      const fn2 = new BusinessFunctionDefinition({
        id: 'HR.ONBOARD.SEND_WELCOME',
        name: 'SendWelcome',
        displayName: 'Send Welcome',
        description: 'Send welcome',
        moduleId: 'HR',
        domain: 'ONBOARD',
        capability: 'SEND_WELCOME',
      });

      const runtime1 = new BusinessFunctionRuntime(fn1);
      runtime1.registerHandler(async () => ({ valid: true }));
      engine.registerBusinessFunction('HR.VALIDATE.VALIDATE_EMPLOYEE', runtime1);

      const runtime2 = new BusinessFunctionRuntime(fn2);
      runtime2.registerHandler(async () => ({ sent: true }));
      engine.registerBusinessFunction('HR.ONBOARD.SEND_WELCOME', runtime2);

      // Execute
      const context = new WorkflowContext({
        workflowId: 'new-hire',
        executionId: 'exec-001',
        correlationId: 'corr-001',
        moduleId: 'HR',
        entity: { id: 'emp-001' },
      });

      const result = await engine.execute('new-hire', context);

      expect(result.status).toBe('completed');
      expect(result.completedSteps).toHaveLength(2);
      expect(result.completedSteps).toContain('step-1');
      expect(result.completedSteps).toContain('step-2');
    });

    test('should fail on step failure', async () => {
      // Create step that will fail
      const step = new WorkflowStep({
        id: 'step-1',
        sequence: 0,
        businessFunctionId: 'HR.FAIL.FAIL_FUNCTION',
        displayName: 'Failing Step',
      });

      const workflow = new WorkflowDefinition({
        id: 'failing-workflow',
        name: 'FailingWorkflow',
        displayName: 'Failing',
        description: 'Will fail',
        moduleId: 'HR',
        steps: [step],
      });

      registry.register(workflow);

      const fn = new BusinessFunctionDefinition({
        id: 'HR.FAIL.FAIL_FUNCTION',
        name: 'FailFunction',
        displayName: 'Fail',
        description: 'Fail',
        moduleId: 'HR',
        domain: 'FAIL',
        capability: 'FAIL_FUNCTION',
      });

      const runtime = new BusinessFunctionRuntime(fn);
      const handler = async () => {
        throw new Error('Business logic failed');
      };
      runtime.registerHandler(handler);
      engine.registerBusinessFunction('HR.FAIL.FAIL_FUNCTION', runtime);

      const context = new WorkflowContext({
        workflowId: 'failing-workflow',
        executionId: 'exec-001',
        correlationId: 'corr-001',
        moduleId: 'HR',
        entity: { id: 'emp-001' },
      });

      const result = await engine.execute('failing-workflow', context);

      expect(result.status).toBe('failed');
      expect(result.failed()).toBe(true);
      expect(result.failedSteps).toContain('step-1');
      expect(result.errors.length).toBeGreaterThan(0);
    });

    test('should fail-fast on step failure', async () => {
      // Create workflow with 3 steps - second will fail
      const step1 = new WorkflowStep({
        id: 'step-1',
        sequence: 0,
        businessFunctionId: 'HR.FUNC1',
        displayName: 'Step 1',
      });

      const step2 = new WorkflowStep({
        id: 'step-2',
        sequence: 1,
        businessFunctionId: 'HR.FUNC2',
        displayName: 'Step 2 (will fail)',
      });

      const step3 = new WorkflowStep({
        id: 'step-3',
        sequence: 2,
        businessFunctionId: 'HR.FUNC3',
        displayName: 'Step 3 (will not execute)',
      });

      const workflow = new WorkflowDefinition({
        id: 'multi-step',
        name: 'MultiStep',
        displayName: 'Multi',
        description: 'Multi-step',
        moduleId: 'HR',
        steps: [step1, step2, step3],
      });

      registry.register(workflow);

      // Register functions
      for (const fnId of ['HR.FUNC1', 'HR.FUNC2', 'HR.FUNC3']) {
        const fn = new BusinessFunctionDefinition({
          id: fnId,
          name: fnId,
          displayName: fnId,
          description: fnId,
          moduleId: 'HR',
          domain: 'TEST',
          capability: fnId,
        });

        const runtime = new BusinessFunctionRuntime(fn);

        if (fnId === 'HR.FUNC2') {
          runtime.registerHandler(async () => {
            throw new Error('Step 2 failed');
          });
        } else {
          runtime.registerHandler(async () => ({ success: true }));
        }

        engine.registerBusinessFunction(fnId, runtime);
      }

      const context = new WorkflowContext({
        workflowId: 'multi-step',
        executionId: 'exec-001',
        correlationId: 'corr-001',
        moduleId: 'HR',
        entity: { id: 'emp-001' },
      });

      const result = await engine.execute('multi-step', context);

      // Step 1 completed, Step 2 failed, Step 3 never executed
      expect(result.completedSteps).toEqual(['step-1']);
      expect(result.failedSteps).toEqual(['step-2']);
      expect(result.status).toBe('failed');
    });

    test('should dispatch lifecycle events', async () => {
      const events: string[] = [];

      const step = new WorkflowStep({
        id: 'step-1',
        sequence: 0,
        businessFunctionId: 'HR.FUNC',
        displayName: 'Step 1',
      });

      const workflow = new WorkflowDefinition({
        id: 'lifecycle-test',
        name: 'LifecycleTest',
        displayName: 'Test',
        description: 'Test',
        moduleId: 'HR',
        steps: [step],
      });

      registry.register(workflow);

      const fn = new BusinessFunctionDefinition({
        id: 'HR.FUNC',
        name: 'Func',
        displayName: 'Func',
        description: 'Func',
        moduleId: 'HR',
        domain: 'TEST',
        capability: 'FUNC',
      });

      const runtime = new BusinessFunctionRuntime(fn);
      runtime.registerHandler(async () => ({ ok: true }));
      engine.registerBusinessFunction('HR.FUNC', runtime);

      // Track events
      const callback = async (event: LifecycleEvent) => {
        events.push(event.name);
      };

      lifecycleManager.registerCallback({
        id: 'test-handler',
        callback,
        events: [
          'beforeWorkflow',
          'beforeStep',
          'stepCompleted',
          'afterStep',
          'workflowCompleted',
          'afterWorkflow',
        ],
      });

      const context = new WorkflowContext({
        workflowId: 'lifecycle-test',
        executionId: 'exec-001',
        correlationId: 'corr-001',
        moduleId: 'HR',
        entity: { id: 'emp-001' },
      });

      await engine.execute('lifecycle-test', context);

      expect(events).toContain('beforeWorkflow');
      expect(events).toContain('beforeStep');
      expect(events).toContain('stepCompleted');
      expect(events).toContain('afterStep');
      expect(events).toContain('workflowCompleted');
      expect(events).toContain('afterWorkflow');
    });

    test('should handle missing workflow', async () => {
      const context = new WorkflowContext({
        workflowId: 'missing-workflow',
        executionId: 'exec-001',
        correlationId: 'corr-001',
        moduleId: 'HR',
        entity: { id: 'emp-001' },
      });

      const result = await engine.execute('missing-workflow', context);

      expect(result.status).toBe('failed');
      expect(result.failed()).toBe(true);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    test('should handle missing business function', async () => {
      const step = new WorkflowStep({
        id: 'step-1',
        sequence: 0,
        businessFunctionId: 'HR.MISSING',
        displayName: 'Missing',
      });

      const workflow = new WorkflowDefinition({
        id: 'missing-fn',
        name: 'MissingFn',
        displayName: 'Missing',
        description: 'Missing',
        moduleId: 'HR',
        steps: [step],
      });

      registry.register(workflow);

      const context = new WorkflowContext({
        workflowId: 'missing-fn',
        executionId: 'exec-001',
        correlationId: 'corr-001',
        moduleId: 'HR',
        entity: { id: 'emp-001' },
      });

      const result = await engine.execute('missing-fn', context);

      expect(result.status).toBe('failed');
      expect(result.failedSteps).toContain('step-1');
    });

    test('should preserve correlation ID', async () => {
      const step = new WorkflowStep({
        id: 'step-1',
        sequence: 0,
        businessFunctionId: 'HR.FUNC',
        displayName: 'Step',
      });

      const workflow = new WorkflowDefinition({
        id: 'corr-test',
        name: 'CorrTest',
        displayName: 'Test',
        description: 'Test',
        moduleId: 'HR',
        steps: [step],
      });

      registry.register(workflow);

      const fn = new BusinessFunctionDefinition({
        id: 'HR.FUNC',
        name: 'Func',
        displayName: 'Func',
        description: 'Func',
        moduleId: 'HR',
        domain: 'TEST',
        capability: 'FUNC',
      });

      const runtime = new BusinessFunctionRuntime(fn);
      runtime.registerHandler(async () => ({ ok: true }));
      engine.registerBusinessFunction('HR.FUNC', runtime);

      const context = new WorkflowContext({
        workflowId: 'corr-test',
        executionId: 'exec-001',
        correlationId: 'corr-12345',
        moduleId: 'HR',
        entity: { id: 'emp-001' },
      });

      const result = await engine.execute('corr-test', context);

      expect(result.metadata.correlationId).toBe('corr-12345');
    });
  });
});

import {
  BusinessFunctionRuntime,
  BusinessFunctionContext,
  BusinessFunctionResult,
  LifecycleManager,
  LifecycleEvent,
  LifecycleContext,
  ValidationFramework,
  ValidationIssue,
} from '../runtime';
import { BusinessFunctionDefinition, ValidationDefinition } from '../definitions';
import { ValidationRegistry } from '../registries';

describe('Phase 2 Runtime', () => {
  describe('BusinessFunctionRuntime', () => {
    let definition: BusinessFunctionDefinition;
    let runtime: BusinessFunctionRuntime;

    beforeEach(() => {
      definition = new BusinessFunctionDefinition({
        id: 'HR.LEAVE.APPLY.APPLY_LEAVE',
        name: 'ApplyLeave',
        displayName: 'Apply for Leave',
        description: 'Apply for employee leave',
        moduleId: 'HR',
        domain: 'LEAVE',
        capability: 'APPLY',
        requestContract: {
          employeeId: 'string',
          startDate: 'date',
          endDate: 'date',
        },
        responseContract: {
          requestId: 'string',
          status: 'string',
        },
        validationRules: ['employee-active', 'leave-balance-sufficient'],
        authorizationRequirements: {
          permissions: ['leave.apply'],
        },
      });

      runtime = new BusinessFunctionRuntime(definition);
    });

    test('should create runtime from definition', () => {
      expect(runtime).toBeDefined();
      expect(runtime.getDefinition().id).toBe('HR.LEAVE.APPLY.APPLY_LEAVE');
      expect(runtime.hasHandler()).toBe(false);
    });

    test('should register handler', () => {
      const handler = async (_request: any) => ({ requestId: 'req-001', status: 'pending' });
      runtime.registerHandler(handler);
      expect(runtime.hasHandler()).toBe(true);
    });

    test('should execute successful request', async () => {
      const handler = async (_request: any) => ({ requestId: 'req-001', status: 'pending' });
      runtime.registerHandler(handler);

      const request = { employeeId: 'emp-001', startDate: '2026-08-15', endDate: '2026-08-20' };
      const result = await runtime.execute(request, 'user-001');

      expect(result).toBeDefined();
      expect(result.status).toBe('success');
      expect(result.succeeded()).toBe(true);
      expect(result.response).toEqual({ requestId: 'req-001', status: 'pending' });
      expect(result.duration).toBeGreaterThanOrEqual(0);
      expect(result.executionId).toBeDefined();
    });

    test('should fail when handler not registered', async () => {
      const request = { employeeId: 'emp-001' };
      const result = await runtime.execute(request, 'user-001');

      expect(result.status).toBe('failure');
      expect(result.succeeded()).toBe(false);
      expect(result.failed()).toBe(true);
      expect(result.error).toBeDefined();
      expect(result.errorCategory).toBe('HandlerNotFoundError');
    });

    test('should accept empty request (contract validation deferred to Phase 3+)', async () => {
      // Phase 2 validates request is an object
      // Contract schema validation deferred to Phase 3+
      const handler = async () => ({});
      runtime.registerHandler(handler);

      const result = await runtime.execute({}, 'user-001');

      expect(result.status).toBe('success');
      expect(result.succeeded()).toBe(true);
    });

    test('should reject array as request', async () => {
      const handler = async () => ({});
      runtime.registerHandler(handler);

      const result = await runtime.execute([] as any, 'user-001');

      // Array should fail validation
      expect(result.failed()).toBe(true);
      expect(result.status).toMatch(/validation_failure|failure/);
    });

    test('should handle authorization check', async () => {
      const def = new BusinessFunctionDefinition({
        id: 'HR.ADMIN.CONFIG',
        name: 'ConfigureHR',
        displayName: 'Configure HR System',
        description: 'Admin configuration',
        moduleId: 'HR',
        domain: 'ADMIN',
        capability: 'CONFIG',
        authorizationRequirements: {
          permissions: ['admin.hr'],
        },
      });

      const rt = new BusinessFunctionRuntime(def);
      const handler = async () => ({});
      rt.registerHandler(handler);

      // Execute WITH caller - should succeed (Phase 2 accepts any authenticated caller)
      const request = { config: {} };
      const result = await rt.execute(request, 'user-001');
      expect(result.succeeded()).toBe(true);

      // Execute WITHOUT caller - should fail on authorization
      const resultNoCaller = await rt.execute(request);
      expect(resultNoCaller.failed()).toBe(true);
      expect(resultNoCaller.errorCategory).toBe('AuthorizationError');
    });

    test('should track execution context', async () => {
      let capturedContext: BusinessFunctionContext | undefined;
      const handler = async (_request: any, context: BusinessFunctionContext) => {
        capturedContext = context;
        return { ok: true };
      };
      runtime.registerHandler(handler);

      const request = { test: 'data' };
      const result = await runtime.execute(request, 'user-001', { custom: 'metadata' });

      expect(capturedContext).toBeDefined();
      expect(capturedContext!.functionId).toBe('HR.LEAVE.APPLY.APPLY_LEAVE');
      expect(capturedContext!.executionId).toBe(result.executionId);
      expect(capturedContext!.moduleId).toBe('HR');
      expect(capturedContext!.caller).toBe('user-001');
      expect(capturedContext!.elapsedTime()).toBeGreaterThanOrEqual(0);
    });

    test('should track published events', async () => {
      const defWithEvents = new BusinessFunctionDefinition({
        id: 'HR.LEAVE.APPLY.APPLY_LEAVE',
        name: 'ApplyLeave',
        displayName: 'Apply for Leave',
        description: 'Apply for leave',
        moduleId: 'HR',
        domain: 'LEAVE',
        capability: 'APPLY',
        eventsPublished: ['leave.applied', 'notification.sent'],
      });

      const rt = new BusinessFunctionRuntime(defWithEvents);
      const handler = async () => ({});
      rt.registerHandler(handler);

      const result = await rt.execute({}, 'user-001');

      expect(result.eventsPublished).toContain('leave.applied');
      expect(result.eventsPublished).toContain('notification.sent');
      expect(result.eventsPublished.length).toBe(2);
    });

    test('should serialize result', async () => {
      const handler = async () => ({ id: '123', status: 'ok' });
      runtime.registerHandler(handler);

      const result = await runtime.execute({}, 'user-001');
      const obj = result.toObject();

      expect(obj.executionId).toBeDefined();
      expect(obj.functionId).toBe('HR.LEAVE.APPLY.APPLY_LEAVE');
      expect(obj.status).toBe('success');
      expect(obj.response).toBeDefined();
      expect(obj.duration).toBeGreaterThanOrEqual(0);

      const json = result.toJson();
      expect(json).toBeTruthy();
      expect(() => JSON.parse(json)).not.toThrow();
    });
  });

  describe('LifecycleManager', () => {
    let manager: LifecycleManager;

    beforeEach(() => {
      manager = new LifecycleManager();
    });

    test('should create manager', () => {
      expect(manager).toBeDefined();
      expect(manager.count()).toBe(0);
      expect(manager.hasHandlers()).toBe(false);
    });

    test('should register handler', () => {
      const called: string[] = [];
      const callback = async () => {
        called.push('handler1');
      };

      manager.registerCallback({
        id: 'h1',
        callback,
        events: ['testEvent'],
      });

      expect(manager.count()).toBe(1);
      expect(manager.exists('h1')).toBe(true);
      expect(manager.hasHandlersFor('testEvent')).toBe(true);
      expect(manager.handlerCountFor('testEvent')).toBe(1);
    });

    test('should dispatch event to handlers', async () => {
      const called: string[] = [];
      const callback1 = async () => {
        called.push('h1');
      };
      const callback2 = async () => {
        called.push('h2');
      };

      manager
        .registerCallback({
          id: 'h1',
          callback: callback1,
          events: ['testEvent'],
          priority: 10,
        })
        .registerCallback({
          id: 'h2',
          callback: callback2,
          events: ['testEvent'],
          priority: 20, // Higher priority, executes first
        });

      const event = new LifecycleEvent({ name: 'testEvent' });
      const context = new LifecycleContext({
        entityId: '123',
        entityType: 'TestEntity',
        action: 'test',
        actor: 'tester',
      });

      await manager.dispatch(event, context);

      expect(called).toEqual(['h2', 'h1']); // Higher priority first
    });

    test('should respect handler priority order', async () => {
      const order: number[] = [];

      for (let i = 0; i < 3; i++) {
        manager.registerCallback({
          id: `h${i}`,
          callback: async () => {
            order.push(i);
          },
          events: ['evt'],
          priority: i,
        });
      }

      const event = new LifecycleEvent({ name: 'evt' });
      const context = new LifecycleContext({
        entityId: 'id',
        entityType: 'type',
        action: 'act',
        actor: 'user',
      });

      await manager.dispatch(event, context);

      expect(order).toEqual([2, 1, 0]); // Descending order (highest priority first)
    });

    test('should skip disabled handlers', async () => {
      const called: string[] = [];

      const handler1 = {
        id: 'h1',
        callable: async () => {
          called.push('h1');
        },
        supportedEvents: ['evt'],
        priority: 0,
        enabled: true,
      };

      const handler2 = {
        id: 'h2',
        callable: async () => {
          called.push('h2');
        },
        supportedEvents: ['evt'],
        priority: 0,
        enabled: false,
      };

      manager.register(handler1).register(handler2);

      const event = new LifecycleEvent({ name: 'evt' });
      const context = new LifecycleContext({
        entityId: 'id',
        entityType: 'type',
        action: 'act',
        actor: 'user',
      });

      await manager.dispatch(event, context);

      expect(called).toEqual(['h1']); // h2 skipped
    });

    test('should unregister handler', () => {
      manager.registerCallback({
        id: 'h1',
        callback: async () => {},
        events: ['evt'],
      });

      expect(manager.count()).toBe(1);

      manager.unregister('h1');

      expect(manager.count()).toBe(0);
      expect(manager.exists('h1')).toBe(false);
      expect(manager.hasHandlersFor('evt')).toBe(false);
    });

    test('should clear all handlers', () => {
      manager
        .registerCallback({
          id: 'h1',
          callback: async () => {},
          events: ['evt1'],
        })
        .registerCallback({
          id: 'h2',
          callback: async () => {},
          events: ['evt2'],
        });

      expect(manager.count()).toBe(2);

      manager.clear();

      expect(manager.count()).toBe(0);
      expect(manager.supportedEvents().length).toBe(0);
    });
  });

  describe('ValidationFramework', () => {
    let registry: ValidationRegistry;
    let framework: ValidationFramework;

    beforeEach(() => {
      registry = new ValidationRegistry();
      framework = new ValidationFramework(registry);
    });

    test('should create validation framework', () => {
      expect(framework).toBeDefined();
    });

    test('should evaluate empty validation set as valid', async () => {
      const request = { field: 'value' };
      const issues = await framework.evaluate(request, 'HR');

      expect(issues).toEqual([]);
    });

    test('should create validation issues', async () => {
      const validation = new ValidationDefinition({
        id: 'VAL-001',
        name: 'EmployeeActive',
        displayName: 'Employee Must Be Active',
        description: 'Employee must have active status',
        moduleId: 'HR',
        scope: 'HR',
        severity: 'error',
        rules: {
          'rule-1': {
            type: 'required',
            field: 'status',
            message: 'Status is required',
          },
        },
      });

      registry.register(validation);

      const request = { name: 'John', status: '' }; // status is empty
      const issues = await framework.evaluate(request, 'HR');

      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0].isError()).toBe(true);
      expect(issues[0].validationId).toBe('VAL-001');
    });

    test('should handle validation errors separately from warnings', async () => {
      const errorValidation = new ValidationDefinition({
        id: 'VAL-ERROR',
        name: 'ErrorRule',
        displayName: 'Error Rule',
        description: 'Error validation',
        moduleId: 'HR',
        scope: 'HR',
        severity: 'error',
        rules: {
          'r1': {
            type: 'required',
            field: 'required_field',
            severity: 'error',
          },
        },
      });

      const warningValidation = new ValidationDefinition({
        id: 'VAL-WARNING',
        name: 'WarningRule',
        displayName: 'Warning Rule',
        description: 'Warning validation',
        moduleId: 'HR',
        scope: 'HR',
        severity: 'warning',
        rules: {
          'r2': {
            type: 'required',
            field: 'optional_field',
            severity: 'warning',
          },
        },
      });

      registry.register(errorValidation).register(warningValidation);

      // required_field is missing (required), optional_field is also missing (warning)
      const request = {};
      const issues = await framework.evaluate(request, 'HR');

      const errors = issues.filter((i) => i.isError());
      const warnings = issues.filter((i) => i.isWarning());

      expect(errors.length).toBeGreaterThan(0);
      expect(warnings.length).toBeGreaterThan(0);
    });
  });

  describe('ValidationIssue', () => {
    test('should create validation issue', () => {
      const issue = new ValidationIssue({
        validationId: 'VAL-001',
        severity: 'error',
        message: 'Validation failed',
        context: { field: 'test' },
      });

      expect(issue.validationId).toBe('VAL-001');
      expect(issue.isError()).toBe(true);
      expect(issue.isWarning()).toBe(false);
      expect(issue.message).toBe('Validation failed');
    });

    test('should serialize validation issue', () => {
      const issue = new ValidationIssue({
        validationId: 'VAL-001',
        severity: 'warning',
        message: 'Warning issued',
      });

      const obj = issue.toObject();
      expect(obj.validationId).toBe('VAL-001');
      expect(obj.severity).toBe('warning');
      expect(obj.message).toBe('Warning issued');
    });
  });

  describe('BusinessFunctionContext', () => {
    test('should create context', () => {
      const context = new BusinessFunctionContext({
        functionId: 'HR.LEAVE.APPLY',
        executionId: 'exec-001',
        correlationId: 'corr-001',
        moduleId: 'HR',
        request: { employeeId: 'emp-001' },
        caller: 'user-001',
      });

      expect(context.functionId).toBe('HR.LEAVE.APPLY');
      expect(context.executionId).toBe('exec-001');
      expect(context.correlationId).toBe('corr-001');
      expect(context.moduleId).toBe('HR');
      expect(context.caller).toBe('user-001');
      expect(context.elapsedTime()).toBeGreaterThanOrEqual(0);
    });

    test('should serialize context', () => {
      const context = new BusinessFunctionContext({
        functionId: 'HR.LEAVE.APPLY',
        executionId: 'exec-001',
        correlationId: 'corr-001',
        moduleId: 'HR',
        request: { test: 'data' },
      });

      const obj = context.toObject();
      expect(obj.functionId).toBe('HR.LEAVE.APPLY');
      expect(obj.request).toEqual({ test: 'data' });
    });
  });

  describe('BusinessFunctionResult', () => {
    test('should create successful result', () => {
      const result = new BusinessFunctionResult({
        executionId: 'exec-001',
        functionId: 'HR.LEAVE.APPLY',
        status: 'success',
        response: { id: '123' },
        duration: 100,
      });

      expect(result.succeeded()).toBe(true);
      expect(result.failed()).toBe(false);
      expect(result.isValidationFailure()).toBe(false);
      expect(result.isRuleFailure()).toBe(false);
    });

    test('should create failed result', () => {
      const error = new Error('Test error');
      const result = new BusinessFunctionResult({
        executionId: 'exec-001',
        functionId: 'HR.LEAVE.APPLY',
        status: 'failure',
        error,
        errorCategory: 'TestError',
        duration: 100,
      });

      expect(result.succeeded()).toBe(false);
      expect(result.failed()).toBe(true);
      expect(result.getErrorMessage()).toBe('Test error');
    });

    test('should serialize result to JSON', () => {
      const result = new BusinessFunctionResult({
        executionId: 'exec-001',
        functionId: 'HR.LEAVE.APPLY',
        status: 'success',
        response: { id: '123' },
        duration: 100,
      });

      const json = result.toJson();
      expect(json).toBeTruthy();

      const obj = JSON.parse(json);
      expect(obj.executionId).toBe('exec-001');
      expect(obj.status).toBe('success');
      expect(obj.response.id).toBe('123');
    });
  });
});

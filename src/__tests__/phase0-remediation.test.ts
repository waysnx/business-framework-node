/**
 * Phase 0 (M0) regression tests.
 *
 * Each describe block targets one audit finding and asserts the corrected
 * contract. Assertions are exact; loose matching (e.g. regex on status) is
 * intentionally avoided because it previously hid NOD-01.
 */
import {
  BusinessFunctionRuntime,
  BusinessFunctionContext,
  AuthorizationDecisions,
  Authorizer,
  LifecycleManager,
  LifecycleEvent,
  LifecycleContext,
  ValidationFramework,
  ValidationIssue,
  WorkflowEngine,
  WorkflowContext,
  BUSINESS_FUNCTION_STATUSES,
  BusinessFunctionResult,
  UnexpectedErrorReport,
  EXECUTION_FAILURE_SAFE_MESSAGE,
  executionFailureSafeMessage,
} from '../runtime';
import {
  BusinessFunctionDefinition,
  ValidationDefinition,
  WorkflowDefinition,
  WorkflowStep,
} from '../definitions';
import { ValidationRegistry, WorkflowRegistry } from '../registries';
import {
  WBFError,
  ExecutionError,
  RequestValidationError,
  ResponseValidationError,
  ExecutionTimeoutError,
  HandlerNotFoundError,
  AuthorizationError,
  ValidationError,
  WorkflowDefinitionError,
  ResourceNotFound,
  BusinessRuleViolation,
  NotFoundError,
} from '../errors';

const allow: Authorizer = () => AuthorizationDecisions.allow('test');

function bfDefinition(id = 'T.BF.RUN.RUN'): BusinessFunctionDefinition {
  return new BusinessFunctionDefinition({
    id,
    name: id,
    displayName: id,
    description: 'Phase 0 test function',
    moduleId: 'T',
    domain: 'BF',
    capability: 'RUN',
  });
}

describe('NOD-01: execution error classification', () => {
  test.each([
    ['RequestValidationError', () => new RequestValidationError('x'), RequestValidationError],
    ['ResponseValidationError', () => new ResponseValidationError('x'), ResponseValidationError],
    ['ExecutionTimeoutError', () => new ExecutionTimeoutError('x'), ExecutionTimeoutError],
    ['HandlerNotFoundError', () => new HandlerNotFoundError('F'), HandlerNotFoundError],
  ])('%s keeps its prototype chain', (_name, make, Ctor) => {
    const err = make();
    expect(err).toBeInstanceOf(Ctor);
    expect(err).toBeInstanceOf(ExecutionError);
    expect(err).toBeInstanceOf(WBFError);
    expect(err).toBeInstanceOf(Error);
  });

  test('other WBFError subclasses are unaffected', () => {
    expect(new AuthorizationError('x')).toBeInstanceOf(AuthorizationError);
    expect(new ValidationError('x')).toBeInstanceOf(ValidationError);
  });

  test.each([
    ['string', 'abc'],
    ['number', 42],
    ['array', [1, 2]],
    ['boolean', true],
  ])('a %s request is a validation_failure', async (_kind, request) => {
    const rt = new BusinessFunctionRuntime(bfDefinition(), undefined, undefined, allow);
    rt.registerHandler(async () => ({ ok: true }));

    const result = await rt.execute(request as any, 'user-1');

    expect(result.status).toBe('validation_failure');
    expect(result.errorCategory).toBe('ValidationError');
    expect(result.error).toBeInstanceOf(RequestValidationError);
  });

  test('a valid object request is not misclassified', async () => {
    const rt = new BusinessFunctionRuntime(bfDefinition(), undefined, undefined, allow);
    rt.registerHandler(async () => ({ ok: true }));

    const result = await rt.execute({ a: 1 }, 'user-1');

    expect(result.status).toBe('success');
  });
});

describe('NOD-06: null / undefined execution input', () => {
  test.each([
    ['null', null],
    ['undefined', undefined],
  ])('%s request returns a structured validation_failure (no rejection)', async (_kind, request) => {
    const rt = new BusinessFunctionRuntime(bfDefinition(), undefined, undefined, allow);
    let handlerRan = false;
    rt.registerHandler(async () => {
      handlerRan = true;
      return {};
    });

    const result = await rt.execute(request as any, 'user-1');

    expect(result.status).toBe('validation_failure');
    expect(result.errorCategory).toBe('ValidationError');
    expect(handlerRan).toBe(false);
  });

  test('lifecycle functionFailed fires for invalid input', async () => {
    const lm = new LifecycleManager();
    const seen: string[] = [];
    lm.registerCallback({
      id: 'obs',
      events: ['beforeFunction', 'functionFailed', 'functionCompleted'],
      callback: async (e: LifecycleEvent) => {
        seen.push(e.name);
      },
    });
    const rt = new BusinessFunctionRuntime(bfDefinition(), undefined, lm, allow);
    rt.registerHandler(async () => ({}));

    await rt.execute(null as any, 'user-1');

    expect(seen).toEqual(['beforeFunction', 'functionFailed']);
  });
});

describe('NOD-03: authorization fails closed', () => {
  function runtimeWith(authorizer?: Authorizer) {
    const rt = new BusinessFunctionRuntime(bfDefinition(), undefined, undefined, authorizer);
    const calls: string[] = [];
    rt.registerHandler(async () => {
      calls.push('handler');
      return { ok: true };
    });
    return { rt, calls };
  }

  test('explicitly allowed', async () => {
    const { rt, calls } = runtimeWith(() => AuthorizationDecisions.allow());
    const result = await rt.execute({}, 'user-1');
    expect(result.status).toBe('success');
    expect(calls).toEqual(['handler']);
  });

  test('explicitly denied', async () => {
    const { rt, calls } = runtimeWith(() => AuthorizationDecisions.deny('no permission'));
    const result = await rt.execute({}, 'user-1');
    expect(result.status).toBe('authorization_failure'); // D1 (was 'failure')
    expect(result.errorCategory).toBe('AuthorizationError');
    expect((result.error as WBFError).context.reason).toBe('denied');
    expect(result.error?.message).toContain('no permission');
    expect(calls).toEqual([]);
  });

  test('missing authorizer (no authorization context)', async () => {
    const { rt, calls } = runtimeWith(undefined);
    const result = await rt.execute({}, 'user-1');
    expect(result.errorCategory).toBe('AuthorizationError');
    expect((result.error as WBFError).context.reason).toBe('no_authorizer');
    expect(calls).toEqual([]);
  });

  test.each([
    ['true', true],
    ['null', null],
    ['string', 'allow'],
    ['object without boolean allowed', { allowed: 'yes' }],
    ['empty object', {}],
  ])('invalid decision (%s) is denied', async (_kind, decision) => {
    const { rt, calls } = runtimeWith((() => decision) as unknown as Authorizer);
    const result = await rt.execute({}, 'user-1');
    expect(result.errorCategory).toBe('AuthorizationError');
    expect((result.error as WBFError).context.reason).toBe('invalid_decision');
    expect(calls).toEqual([]);
  });

  test('caller-supplied values are not proof of authorization', async () => {
    const def = new BusinessFunctionDefinition({
      id: 'T.BF.RUN.ADMIN',
      name: 'Admin',
      displayName: 'Admin',
      description: 'Admin test function',
      moduleId: 'T',
      domain: 'BF',
      capability: 'RUN',
      authorizationRequirements: { permissions: ['admin'] },
    });
    const rt = new BusinessFunctionRuntime(def);
    rt.registerHandler(async () => ({}));

    // Previously any truthy caller satisfied declared permissions.
    const result = await rt.execute({ isAdmin: true }, 'admin', { roles: ['admin'] });

    expect(result.errorCategory).toBe('AuthorizationError');
  });

  test('authorizer receives request, context (with caller) and definition', async () => {
    let seen: [any, BusinessFunctionContext, BusinessFunctionDefinition] | undefined;
    const { rt } = runtimeWith((req, ctx, def) => {
      seen = [req, ctx, def];
      return AuthorizationDecisions.allow();
    });

    await rt.execute({ x: 1 }, 'user-9');

    expect(seen![0]).toEqual({ x: 1 });
    expect(seen![1].caller).toBe('user-9');
    expect(seen![2].id).toBe('T.BF.RUN.RUN');
  });

  test('async authorizer is supported', async () => {
    const { rt } = runtimeWith(async () => AuthorizationDecisions.allow());
    expect((await rt.execute({}, 'u')).status).toBe('success');
  });

  test('setAuthorizer configures an existing runtime', async () => {
    const { rt } = runtimeWith(undefined);
    expect(rt.hasAuthorizer()).toBe(false);
    rt.setAuthorizer(() => AuthorizationDecisions.allow());
    expect(rt.hasAuthorizer()).toBe(true);
    expect((await rt.execute({}, 'u')).status).toBe('success');
  });

  test('validation still runs before authorization', async () => {
    const { rt } = runtimeWith(undefined);
    const result = await rt.execute('not-an-object' as any, 'u');
    expect(result.status).toBe('validation_failure');
  });
});

describe('NOD-02: workflow sequence', () => {
  async function runWorkflow(steps: WorkflowStep[], failing: string[] = []) {
    const registry = new WorkflowRegistry();
    registry.register(
      new WorkflowDefinition({ id: 'wf', name: 'wf', displayName: 'wf', description: 'test', moduleId: 'T', steps })
    );
    const engine = new WorkflowEngine(registry);
    const order: string[] = [];
    for (const fnId of ['A', 'B', 'C']) {
      const rt = new BusinessFunctionRuntime(bfDefinition(fnId), undefined, undefined, allow);
      rt.registerHandler(async () => {
        order.push(fnId);
        if (failing.includes(fnId)) throw new Error(`${fnId} failed`);
        return {};
      });
      engine.registerBusinessFunction(fnId, rt);
    }
    const result = await engine.execute(
      'wf',
      new WorkflowContext({
        workflowId: 'wf',
        executionId: 'e1',
        correlationId: 'c1',
        moduleId: 'T',
        entity: { id: 1 },
        inputData: {},
        caller: 'wf-user',
      })
    );
    return { result, order };
  }

  const step = (id: string, sequence: number, fn: string) =>
    new WorkflowStep({ id, sequence, businessFunctionId: fn });

  test('sequential workflow', async () => {
    const { result, order } = await runWorkflow([step('s1', 1, 'A'), step('s2', 2, 'B'), step('s3', 3, 'C')]);
    expect(result.status).toBe('completed');
    expect(order).toEqual(['A', 'B', 'C']);
  });

  test('unordered steps [1, 3, 2] execute by sequence', async () => {
    const { result, order } = await runWorkflow([step('s1', 1, 'A'), step('s3', 3, 'C'), step('s2', 2, 'B')]);
    expect(result.status).toBe('completed');
    expect(order).toEqual(['A', 'B', 'C']);
    expect(result.completedSteps).toEqual(['s1', 's2', 's3']);
  });

  test('reverse-declared steps execute by sequence', async () => {
    const { order } = await runWorkflow([step('s3', 30, 'C'), step('s2', 20, 'B'), step('s1', 10, 'A')]);
    expect(order).toEqual(['A', 'B', 'C']);
  });

  test('duplicate sequence is rejected at definition construction (D8)', () => {
    let error: unknown;
    try {
      new WorkflowDefinition({
        id: 'wf',
        name: 'wf',
        displayName: 'wf',
        description: 'test',
        moduleId: 'T',
        steps: [step('s1', 1, 'A'), step('s2', 1, 'B')],
      });
    } catch (e) {
      error = e;
    }
    expect(error).toBeInstanceOf(WorkflowDefinitionError);
    expect((error as WorkflowDefinitionError).reason).toBe('duplicate_sequence');
    expect((error as Error).message).toContain('duplicate sequence 1');
  });

  test.each([
    ['float', 1.5],
    ['NaN', NaN],
    ['Infinity', Infinity],
    ['numeric string', '1'],
    ['boolean', true],
  ])('non-integer sequence (%s) is rejected at step construction (D8)', (_kind, sequence) => {
    expect(() => new WorkflowStep({ id: 's1', sequence: sequence as any, businessFunctionId: 'A' })).toThrow(
      WorkflowDefinitionError
    );
  });

  test('negative sequence is rejected at step construction (D8)', () => {
    let error: unknown;
    try {
      new WorkflowStep({ id: 's1', sequence: -1, businessFunctionId: 'A' });
    } catch (e) {
      error = e;
    }
    expect((error as WorkflowDefinitionError).reason).toBe('negative_sequence');
  });

  test('sequence zero is valid and runs first (D8)', async () => {
    const { result, order } = await runWorkflow([step('s1', 1, 'B'), step('s0', 0, 'A')]);
    expect(result.status).toBe('completed');
    expect(order).toEqual(['A', 'B']);
  });

  test('duplicate step id fails before any step executes', async () => {
    const { result, order } = await runWorkflow([step('s1', 1, 'A'), step('s1', 2, 'B')]);
    expect(result.status).toBe('failed');
    expect(order).toEqual([]);
    expect(result.errors.join(' ')).toContain("duplicate step id 's1'");
  });

  test.each([
    ['omitted', undefined],
    ['null', null],
  ])('missing sequence (%s) is rejected at step construction with a clear WBF error (D8)', (_kind, sequence) => {
    let error: unknown;
    try {
      new WorkflowStep({ id: 's1', sequence, businessFunctionId: 'A' } as any);
    } catch (e) {
      error = e;
    }
    expect(error).toBeInstanceOf(WorkflowDefinitionError);
    expect((error as WorkflowDefinitionError).reason).toBe('missing_sequence');
    expect((error as Error).message).toBe("Workflow step 's1': sequence is required");
  });

  test('failed step stops the workflow', async () => {
    const { result, order } = await runWorkflow(
      [step('s1', 1, 'A'), step('s2', 2, 'B'), step('s3', 3, 'C')],
      ['B']
    );
    expect(result.status).toBe('failed');
    expect(order).toEqual(['A', 'B']);
    expect(result.completedSteps).toEqual(['s1']);
    expect(result.failedSteps).toEqual(['s2']);
  });
});

describe('NOD-07: lifecycle handler enablement', () => {
  const event = () => new LifecycleEvent({ name: 'beforeStep' });
  const ctx = () =>
    new LifecycleContext({ entityId: 'e', entityType: 'Workflow', action: 'execute', actor: 'system' });

  async function dispatchWith(handler: Record<string, unknown>) {
    const lm = new LifecycleManager();
    let fired = 0;
    lm.register({
      id: 'h',
      supportedEvents: ['beforeStep'],
      callable: async () => {
        fired++;
      },
      ...handler,
    } as any);
    await lm.dispatch(event(), ctx());
    return { lm, fired };
  }

  test('enabled: true fires', async () => {
    expect((await dispatchWith({ enabled: true, priority: 0 })).fired).toBe(1);
  });

  test('enabled: false does not fire', async () => {
    const { lm, fired } = await dispatchWith({ enabled: false });
    expect(fired).toBe(0);
    expect(lm.isDisabled('h')).toBe(true);
  });

  test('unspecified enabled fires (documented default) and priority defaults to 0', async () => {
    const { lm, fired } = await dispatchWith({});
    expect(fired).toBe(1);
    expect(lm.isEnabled('h')).toBe(true);
  });

  test('non-boolean enabled is rejected at registration instead of silently disabling', () => {
    const lm = new LifecycleManager();
    expect(() =>
      lm.register({
        id: 'h',
        supportedEvents: ['beforeStep'],
        callable: async () => undefined,
        enabled: 'false',
      } as any)
    ).toThrow("'enabled' must be a boolean");
  });

  test('handlers without priority sort as priority 0', async () => {
    const lm = new LifecycleManager();
    const order: string[] = [];
    lm.register({ id: 'low', supportedEvents: ['beforeStep'], callable: async () => void order.push('low'), priority: -1 });
    lm.register({ id: 'none', supportedEvents: ['beforeStep'], callable: async () => void order.push('none') });
    lm.register({ id: 'high', supportedEvents: ['beforeStep'], callable: async () => void order.push('high'), priority: 5 });

    await lm.dispatch(event(), ctx());

    expect(order).toEqual(['high', 'none', 'low']);
  });
});

describe('Validation fails closed (D2, cross-runtime XR-01)', () => {
  async function evaluate(rules: Record<string, any>, request: any): Promise<ValidationIssue[]> {
    const registry = new ValidationRegistry();
    registry.register(
      new ValidationDefinition({ id: 'v', name: 'v', displayName: 'v', description: 'test', moduleId: 'T', scope: 'S', rules })
    );
    return new ValidationFramework(registry).evaluate(request, 'S');
  }
  const errors = (issues: ValidationIssue[]) => issues.filter((i) => i.isError());

  test('required present passes', async () => {
    expect(await evaluate({ r1: { type: 'required', field: 'name' } }, { name: 'Alice' })).toEqual([]);
  });

  test.each([
    ['missing', {}],
    ['null', { name: null }],
    ['empty string', { name: '' }],
    ['whitespace only', { name: '  ' }],
    ['empty array', { name: [] }],
  ])('required %s fails with WBF.VALIDATION.REQUIRED', async (_k, req) => {
    const issues = errors(await evaluate({ r1: { type: 'required', field: 'name' } }, req));
    expect(issues).toHaveLength(1);
    expect(issues[0].code).toBe('WBF.VALIDATION.REQUIRED');
    expect(issues[0].context.field).toBe('name');
    expect(issues[0].message).toBe("Field 'name' is required");
  });

  test('0 and false are present values', async () => {
    const issues = await evaluate(
      { r1: { type: 'required', field: 'n' }, r2: { type: 'required', field: 'f' } },
      { n: 0, f: false }
    );
    expect(issues).toEqual([]);
  });

  test('unknown rule type fails closed', async () => {
    const issues = errors(await evaluate({ r1: { type: 'no-such-rule', field: 'name' } }, { name: 'A' }));
    expect(issues).toHaveLength(1);
    expect(issues[0].code).toBe('WBF.VALIDATION.UNKNOWN_RULE');
  });

  test('custom rule without application implementation fails closed', async () => {
    const issues = errors(await evaluate({ r1: { type: 'custom', field: 'name' } }, { name: 'A' }));
    expect(issues[0].code).toBe('WBF.VALIDATION.UNKNOWN_RULE');
  });

  test('unknown rule declared as warning is still an error', async () => {
    const issues = await evaluate({ r1: { type: 'nope', severity: 'warning' } }, {});
    expect(issues[0].severity).toBe('error');
  });

  test('required rule without field fails closed', async () => {
    const issues = errors(await evaluate({ r1: { type: 'required' } }, { name: 'A' }));
    expect(issues[0].code).toBe('WBF.VALIDATION.INVALID_RULE');
  });

  test('warning alone does not produce errors', async () => {
    const issues = await evaluate(
      { r1: { type: 'required', field: 'name' }, w1: { type: 'required', field: 'nick', severity: 'warning' } },
      { name: 'A' }
    );
    expect(errors(issues)).toEqual([]);
    expect(issues.filter((i) => i.isWarning())).toHaveLength(1);
  });

  test('multiple errors are all reported', async () => {
    const issues = errors(
      await evaluate({ r1: { type: 'required', field: 'a' }, r2: { type: 'required', field: 'b' } }, {})
    );
    expect(issues.map((i) => i.context.ruleId)).toEqual(['r1', 'r2']);
  });

  test('applications implement custom rules by overriding evaluateCustom', async () => {
    class AppValidation extends ValidationFramework {
      protected async evaluateCustom(validationId: string, _ruleId: string, rule: any, request: any) {
        return request[rule.field] >= 18
          ? undefined
          : new ValidationIssue({ validationId, severity: 'error', message: 'too young', code: 'APP.AGE' });
      }
    }
    const registry = new ValidationRegistry();
    registry.register(
      new ValidationDefinition({
        id: 'v',
        name: 'v',
        displayName: 'v',
        description: 'test',
        moduleId: 'T',
        scope: 'S',
        rules: { c1: { type: 'custom', field: 'age' } },
      })
    );
    const fw = new AppValidation(registry);

    expect(await fw.evaluate({ age: 20 }, 'S')).toEqual([]);
    expect((await fw.evaluate({ age: 10 }, 'S'))[0].code).toBe('APP.AGE');
  });
});

describe('D1 (Phase 0.1): standard Business Function result statuses', () => {
  // `null` means "no authorizer configured" (undefined would select the default)
  async function run(handler: () => Promise<any>, authorizer: Authorizer | null = allow, request: any = {}) {
    const rt = new BusinessFunctionRuntime(bfDefinition(), undefined, undefined, authorizer ?? undefined);
    rt.registerHandler(handler);
    rt.setErrorReporter(() => undefined); // keep test output clean; reporting is tested below
    return rt.execute(request, 'user-1');
  }

  test('success', async () => {
    const r = await run(async () => ({ ok: true }));
    expect(r.status).toBe('success');
    expect(r.failed()).toBe(false);
  });

  test('validation_failure', async () => {
    const r = await run(async () => ({}), allow, 'not-an-object');
    expect(r.status).toBe('validation_failure');
    expect(r.isValidationFailure()).toBe(true);
    expect(r.failed()).toBe(true);
  });

  test('authorization_failure (all three fail-closed reasons)', async () => {
    expect((await run(async () => ({}), null)).status).toBe('authorization_failure');
    expect((await run(async () => ({}), () => AuthorizationDecisions.deny())).status).toBe('authorization_failure');
    expect((await run(async () => ({}), (() => true) as unknown as Authorizer)).status).toBe('authorization_failure');
  });

  test('not_found for a missing business resource', async () => {
    const r = await run(async () => {
      throw new ResourceNotFound('Order', 'O-1');
    });
    expect(r.status).toBe('not_found');
    expect(r.errorCategory).toBe('ResourceNotFound');
  });

  test('business_rule_failure is distinct from execution_failure', async () => {
    const rule = await run(async () => {
      throw new BusinessRuleViolation('balance insufficient');
    });
    const boom = await run(async () => {
      throw new Error('unexpected');
    });
    expect(rule.status).toBe('business_rule_failure');
    expect(rule.isRuleFailure()).toBe(true);
    expect(rule.errorCategory).toBe('BusinessRuleViolation');
    expect(boom.status).toBe('execution_failure');
    expect(boom.isRuleFailure()).toBe(false);
    expect(boom.errorCategory).toBe('InternalSystemError');
  });

  test('missing handler is execution_failure, not not_found', async () => {
    const rt = new BusinessFunctionRuntime(bfDefinition(), undefined, undefined, allow);
    const r = await rt.execute({}, 'user-1');
    expect(r.status).toBe('execution_failure');
    expect(r.errorCategory).toBe('HandlerNotFoundError');
  });

  test('registry NotFoundError (framework artifact) is execution_failure, not not_found', async () => {
    const r = await run(async () => {
      throw new NotFoundError('Workflow', 'wf-x');
    });
    expect(r.status).toBe('execution_failure');
  });

  test('invalid handler response is execution_failure (was validation_failure before D1)', async () => {
    const r = await run(async () => 'not-an-object');
    expect(r.status).toBe('execution_failure');
    expect(r.errorCategory).toBe('ResponseValidationError');
  });

  test('ValidationError thrown by the handler is validation_failure', async () => {
    const r = await run(async () => {
      throw new ValidationError('bad field');
    });
    expect(r.status).toBe('validation_failure');
  });

  test('every result status is one of the six WBF statuses', () => {
    expect([...BUSINESS_FUNCTION_STATUSES]).toEqual([
      'success',
      'validation_failure',
      'authorization_failure',
      'not_found',
      'business_rule_failure',
      'execution_failure',
    ]);
  });
});

describe('Phase 0.1 review: authorization has no exception fallback', () => {
  async function run(authorizer: Authorizer) {
    const reports: UnexpectedErrorReport[] = [];
    const rt = new BusinessFunctionRuntime(bfDefinition(), undefined, undefined, authorizer);
    let logicInvoked = false;
    rt.registerHandler(async () => {
      logicInvoked = true;
      return { ok: true };
    });
    rt.setErrorReporter((_message, report) => reports.push(report));
    const result = await rt.execute({}, 'user-1');
    return { result, reports, logicInvoked };
  }

  test('an authorizer that throws a plain error is execution_failure, not authorization_failure', async () => {
    const { result, reports, logicInvoked } = await run(() => {
      throw new Error('policy store unavailable at 10.0.0.5');
    });
    expect(result.status).toBe('execution_failure');
    expect(result.errorCategory).toBe('InternalSystemError');
    expect(logicInvoked).toBe(false);
    expect(reports).toHaveLength(1);
  });

  test('an authorizer that rejects asynchronously is execution_failure', async () => {
    const { result } = await run(async () => {
      throw new TypeError('cannot read properties of undefined');
    });
    expect(result.status).toBe('execution_failure');
  });

  test('explicit denials remain authorization_failure and are not reported as unexpected', async () => {
    const { result, reports } = await run(() => AuthorizationDecisions.deny('not a manager'));
    expect(result.status).toBe('authorization_failure');
    expect((result.error as WBFError).context.reason).toBe('denied');
    expect(result.errorMessage).toContain('not a manager');
    expect(reports).toHaveLength(0);
  });

  test('an AuthorizationError raised by the authorizer is an explicit (categorized) denial', async () => {
    const { result } = await run(() => {
      throw new AuthorizationError('blocked by policy', { reason: 'denied' });
    });
    expect(result.status).toBe('authorization_failure');
  });
});

describe('ADR-0009 amendment (BF-ERR-03): no internal details in public results', () => {
  const SECRET =
    'ECONNREFUSED postgres://app:hunter2@10.0.0.7:5432/prod at /srv/app/db.js:42';

  async function run(handler: () => Promise<any>) {
    const reports: Array<{ message: string; report: UnexpectedErrorReport }> = [];
    const rt = new BusinessFunctionRuntime(bfDefinition(), undefined, undefined, allow);
    rt.registerHandler(handler);
    rt.setErrorReporter((message, report) => reports.push({ message, report }));
    const result = await rt.execute({}, 'user-1', { correlationId: 'corr-1' });
    return { result, reports };
  }

  test('an unexpected error yields the safe message and a reference', async () => {
    const { result } = await run(async () => {
      throw new Error(SECRET);
    });
    expect(result.status).toBe('execution_failure');
    expect(result.errorMessage).toBe(executionFailureSafeMessage(result.executionId));
    expect(result.errorMessage).toContain(EXECUTION_FAILURE_SAFE_MESSAGE);
    expect(result.errorReference).toBe(result.executionId);
    expect(result.getErrorMessage()).toBe(result.errorMessage);
  });

  test('no serialized or spread form of the result contains internal details', async () => {
    const original = new Error(SECRET);
    const { result } = await run(async () => {
      throw original;
    });
    const forms = [
      JSON.stringify(result),
      result.toJson(),
      JSON.stringify(result.toObject()),
      JSON.stringify({ ...result }),
      Object.keys(result).join(','),
    ].join('\n');
    for (const needle of ['ECONNREFUSED', 'hunter2', '10.0.0.7', '/srv/app', 'db.js', 'at ']) {
      expect(forms).not.toContain(needle);
    }
    expect(result.error).toBe(original); // diagnostics remain available in-process
  });

  test('framework errors with internal context are also safe (missing handler, response)', async () => {
    const rt = new BusinessFunctionRuntime(bfDefinition(), undefined, undefined, allow);
    rt.setErrorReporter(() => undefined);
    const missing = await rt.execute({}, 'user-1');
    expect(missing.status).toBe('execution_failure');
    expect(JSON.stringify(missing)).not.toContain('registeredHandlers');
    expect(missing.errorMessage).toBe(executionFailureSafeMessage(missing.executionId));

    const { result: badResponse } = await run(async () => 'not-an-object');
    expect(badResponse.errorMessage).toBe(executionFailureSafeMessage(badResponse.executionId));
  });

  test('the full error is reported server-side with the same reference', async () => {
    const original = new Error(SECRET);
    const { result, reports } = await run(async () => {
      throw original;
    });
    expect(reports).toHaveLength(1);
    const { message, report } = reports[0];
    expect(message).toContain(result.executionId);
    expect(report.reference).toBe(result.errorReference);
    expect(report.correlationId).toBe('corr-1');
    expect(report.functionId).toBe(result.functionId);
    expect(report.error).toBe(original);
    expect((report.error as Error).stack).toBeDefined();
  });

  test('expected failures keep their user-facing messages and are not reported', async () => {
    const rule = await run(async () => {
      throw new BusinessRuleViolation('Insufficient leave balance');
    });
    const missing = await run(async () => {
      throw new ResourceNotFound('Order', 'O-1');
    });
    const invalid = await run(async () => {
      throw new ValidationError('startDate is required');
    });
    expect(rule.result.errorMessage).toBe('Insufficient leave balance');
    expect(missing.result.errorMessage).toContain('O-1');
    expect(invalid.result.errorMessage).toBe('startDate is required');
    for (const r of [rule, missing, invalid]) {
      expect(r.result.errorReference).toBe(r.result.executionId);
      expect(r.reports).toHaveLength(0);
    }
  });

  test('a constructed execution_failure result never carries a supplied message', () => {
    const r = new BusinessFunctionResult({
      executionId: 'E-1',
      functionId: 'F',
      status: 'execution_failure',
      error: new Error('raw internal'),
      errorMessage: 'raw internal',
      duration: 0,
    });
    expect(r.errorMessage).toBe(executionFailureSafeMessage('E-1'));
    expect(JSON.stringify(r)).not.toContain('raw internal');
  });

  test('success carries no error message or reference', async () => {
    const { result } = await run(async () => ({ ok: true }));
    expect(result.errorMessage).toBeUndefined();
    expect(result.errorReference).toBeUndefined();
    expect(result.toObject().error).toBeUndefined();
  });

  test('the default reporter logs the full error via console.error', async () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    try {
      const rt = new BusinessFunctionRuntime(bfDefinition(), undefined, undefined, allow);
      const original = new Error(SECRET);
      rt.registerHandler(async () => {
        throw original;
      });
      const result = await rt.execute({}, 'user-1');
      expect(spy).toHaveBeenCalledTimes(1);
      expect(String(spy.mock.calls[0][0])).toContain(result.executionId);
      expect(spy.mock.calls[0][1]).toBe(original);
    } finally {
      spy.mockRestore();
    }
  });

  test('a failing reporter does not break execution or lose the detail', async () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    try {
      const rt = new BusinessFunctionRuntime(bfDefinition(), undefined, undefined, allow);
      const original = new Error(SECRET);
      rt.registerHandler(async () => {
        throw original;
      });
      rt.setErrorReporter(() => {
        throw new Error('logger down');
      });
      const result = await rt.execute({}, 'user-1');
      expect(result.status).toBe('execution_failure');
      expect(spy.mock.calls.some((c) => c[1] === original)).toBe(true);
      expect(spy.mock.calls.some((c) => (c[1] as Error)?.message === 'logger down')).toBe(true);
    } finally {
      spy.mockRestore();
    }
  });

  test('workflow step errors use the public message, not the raw error', async () => {
    const registry = new WorkflowRegistry();
    registry.register(
      new WorkflowDefinition({
        id: 'wf-safe',
        name: 'wf-safe',
        displayName: 'wf-safe',
        description: 'test',
        moduleId: 'T',
        steps: [new WorkflowStep({ id: 's1', sequence: 1, businessFunctionId: 'A' })],
      })
    );
    const rt = new BusinessFunctionRuntime(bfDefinition('A'), undefined, undefined, allow);
    rt.registerHandler(async () => {
      throw new Error(SECRET);
    });
    rt.setErrorReporter(() => undefined);
    const engine = new WorkflowEngine(registry);
    engine.registerBusinessFunction('A', rt);
    const result = await engine.execute(
      'wf-safe',
      new WorkflowContext({
        workflowId: 'wf-safe',
        executionId: 'wf-exec-1',
        correlationId: 'c1',
        moduleId: 'T',
        entity: { id: 1 },
        inputData: {},
        caller: 'user-1',
      })
    );
    expect(result.status).toBe('failed');
    expect(JSON.stringify(result.toObject())).not.toContain('hunter2');
    expect(result.errors.join(' ')).toContain(EXECUTION_FAILURE_SAFE_MESSAGE);
  });
});

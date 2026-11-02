/**
 * WBF cross-runtime conformance adapter (Node.js).
 *
 * Executes the technology-independent fixtures owned by the Core repository
 * (waysnx-business-framework/tests/conformance/fixtures) against this runtime
 * and compares NORMALIZED business outcomes with the fixture expectations.
 *
 * - Fixture location: $WBF_CONFORMANCE_FIXTURES, or the sibling checkout
 *   ../waysnx-business-framework/tests/conformance/fixtures. When neither
 *   exists the suite is skipped locally. With WBF_CONFORMANCE_REQUIRED=1
 *   (CI) a missing checkout is a CONFIGURATION ERROR failure instead.
 * - Known differences: conformance-known-differences.json in this directory.
 *   Listed fixtures run as `test.failing` (they must still fail; if one
 *   starts passing, the test fails so the list is kept accurate).
 * - Report: set $WBF_CONFORMANCE_REPORT to a file path to write a JSON report.
 *
 * Normalization rules: CROSS_RUNTIME_CONFORMANCE.md §6. No other
 * normalization is permitted.
 *
 * This file is a test (excluded from the build and from coverage); it must not
 * be imported by runtime code.
 */
import * as fs from 'fs';
import * as path from 'path';
import {
  BusinessFunctionRuntime,
  AuthorizationDecisions,
  Authorizer,
  BusinessFunctionResult,
  LifecycleManager,
  LifecycleEvent,
  LifecycleContext,
  ValidationFramework,
  WorkflowEngine,
  WorkflowContext,
} from '../runtime';
import {
  BusinessFunctionDefinition,
  ValidationDefinition,
  WorkflowDefinition,
  WorkflowStep,
} from '../definitions';
import { ValidationRegistry, WorkflowRegistry } from '../registries';
import { BusinessRuleViolation, ResourceNotFound, WBFError, WorkflowDefinitionError, DuplicateError } from '../errors';

type Json = any;

interface Fixture {
  id: string;
  description: string;
  input: Json;
  expected: Record<string, Json>;
  metadata?: Json;
}

const FIXTURE_DIR =
  process.env.WBF_CONFORMANCE_FIXTURES ||
  path.resolve(__dirname, '../../../waysnx-business-framework/tests/conformance/fixtures');
/** suite.json and fixture.schema.json live one level above fixtures/. */
const SUITE_DIR = path.dirname(FIXTURE_DIR);
/** CI sets WBF_CONFORMANCE_REQUIRED=1: missing fixtures are a configuration failure, never a skip. */
const REQUIRED = process.env.WBF_CONFORMANCE_REQUIRED === '1';

const KNOWN: Record<string, string> = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'conformance-known-differences.json'), 'utf8')
).knownDifferences;

interface ContractManifest {
  file: string;
  expectedKeys: string[];
  statuses: string[];
  fixtureIds: string[];
}
interface SuiteManifest {
  suiteVersion: string;
  contracts: Record<string, ContractManifest>;
  fixtureCount: number;
}

function readJson(file: string): Json {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

/**
 * Suite integrity (suite.json + fixture.schema.json rules). Returns a list of
 * problems; an empty list means the fixture set is valid and identical to the
 * manifest, i.e. both runtime adapters execute the same fixture set.
 */
function suiteProblems(suite: SuiteManifest): string[] {
  const problems: string[] = [];
  const seen = new Set<string>();
  let count = 0;
  for (const [contract, spec] of Object.entries(suite.contracts)) {
    const file = path.join(SUITE_DIR, spec.file);
    if (!fs.existsSync(file)) {
      problems.push(`${contract}: missing fixture file ${spec.file}`);
      continue;
    }
    const data = readJson(file);
    if (data.contract !== contract) problems.push(`${spec.file}: contract '${data.contract}' != '${contract}'`);
    if (data.suiteVersion !== suite.suiteVersion) {
      problems.push(`${spec.file}: suiteVersion '${data.suiteVersion}' != manifest '${suite.suiteVersion}'`);
    }
    if (typeof data.description !== 'string' || data.description === '') problems.push(`${spec.file}: missing description`);
    if (!Array.isArray(data.fixtures)) {
      problems.push(`${spec.file}: 'fixtures' is not an array`);
      continue;
    }
    const ids: string[] = [];
    for (const fx of data.fixtures) {
      count++;
      const where = `${spec.file}#${fx?.id ?? '?'}`;
      if (typeof fx?.id !== 'string' || !/^[A-Z]+-\d{3}$/.test(fx.id)) problems.push(`${where}: invalid id`);
      if (seen.has(fx?.id)) problems.push(`${where}: duplicate fixture id`);
      seen.add(fx?.id);
      ids.push(fx?.id);
      for (const key of Object.keys(fx ?? {})) {
        if (!['id', 'description', 'input', 'expected', 'metadata'].includes(key)) problems.push(`${where}: unknown property '${key}'`);
      }
      if (typeof fx?.description !== 'string' || fx.description === '') problems.push(`${where}: missing description`);
      if (fx?.input === null || typeof fx?.input !== 'object') problems.push(`${where}: missing input`);
      if (fx?.expected === null || typeof fx?.expected !== 'object' || Object.keys(fx.expected).length === 0) {
        problems.push(`${where}: missing or empty expected`);
        continue;
      }
      for (const key of Object.keys(fx.expected)) {
        if (!spec.expectedKeys.includes(key)) problems.push(`${where}: expected key '${key}' not allowed for ${contract}`);
      }
      if ('status' in fx.expected && !spec.statuses.includes(fx.expected.status)) {
        problems.push(`${where}: status '${fx.expected.status}' not allowed for ${contract}`);
      }
    }
    if (JSON.stringify(ids) !== JSON.stringify(spec.fixtureIds)) {
      problems.push(`${spec.file}: fixture ids ${JSON.stringify(ids)} != manifest ${JSON.stringify(spec.fixtureIds)}`);
    }
  }
  if (count !== suite.fixtureCount) problems.push(`fixture count ${count} != manifest fixtureCount ${suite.fixtureCount}`);
  return problems;
}

/** Canonical JSON (object keys sorted, list order kept) for outcome comparison. */
function canonical(value: Json): string {
  const sort = (v: Json): Json =>
    Array.isArray(v)
      ? v.map(sort)
      : v !== null && typeof v === 'object'
        ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, sort(v[k])]))
        : v;
  return JSON.stringify(sort(value));
}

// ---------------------------------------------------------------------------
// Normalization (CROSS_RUNTIME_CONFORMANCE.md §6)
// ---------------------------------------------------------------------------

/**
 * §6.2 (suite 0.1.0): BusinessFunctionResult.status IS the WBF result status
 * (WBF-SPEC-0006, D1). No status normalization is applied any more; the value
 * is used verbatim. (The pre-D1 renaming layer was removed in Phase 0.1.)
 */
function resultStatus(result: BusinessFunctionResult): string {
  return result.status;
}

/** §6.4 workflow error message → error kind. */
function workflowErrorKind(message: string): string {
  if (/No business function (runtime )?registered/i.test(message)) return 'function_not_registered';
  if (/duplicate sequence/i.test(message)) return 'duplicate_sequence';
  if (/duplicate step id/i.test(message)) return 'duplicate_step_id';
  if (/Step '[^']+' failed/i.test(message)) return 'step_failed';
  return 'unclassified';
}

// ---------------------------------------------------------------------------
// Drivers
// ---------------------------------------------------------------------------

async function runValidation(input: Json) {
  const rules: Record<string, Json> = {};
  for (const r of input.rules) {
    const { id, ...rule } = r;
    rules[id] = rule;
  }
  const registry = new ValidationRegistry();
  registry.register(
    new ValidationDefinition({
      id: 'conformance',
      name: 'conformance',
      displayName: 'conformance',
      description: 'conformance fixture',
      moduleId: 'CONF',
      scope: 'CONF',
      rules,
    })
  );
  const issues = await new ValidationFramework(registry).evaluate(input.data, 'CONF');
  const map = (sev: string) =>
    issues
      .filter((i) => i.severity === sev)
      .map((i) => ({ ruleId: i.context.ruleId, field: i.context.field, code: i.code }));
  const errors = map('error');
  return { status: errors.length === 0 ? 'passed' : 'failed', errors, warnings: map('warning') };
}

function authorizerFor(mode: string): Authorizer | undefined {
  switch (mode) {
    case 'allow':
      return () => AuthorizationDecisions.allow('fixture');
    case 'deny':
      return () => AuthorizationDecisions.deny('fixture deny');
    case 'invalid':
      return (() => true) as unknown as Authorizer;
    case 'none':
      return undefined;
    default:
      throw new Error(`Unknown authorization mode '${mode}'`);
  }
}

async function runBusinessFunction(input: Json) {
  const def = new BusinessFunctionDefinition({
    id: input.function.id,
    name: input.function.id,
    displayName: input.function.id,
    description: 'conformance fixture',
    moduleId: input.function.module,
    domain: input.function.domain,
    capability: input.function.capability,
  });
  const rt = new BusinessFunctionRuntime(def, undefined, undefined, authorizerFor(input.authorization));
  // Muted only to keep test output clean; fixtures compare statuses, and
  // server-side reporting is covered by phase0-remediation.test.ts.
  rt.setErrorReporter(() => undefined);
  let logicInvoked = false;
  rt.registerHandler(async () => {
    logicInvoked = true;
    // Declarative fixture behaviors. Node has no separate business-rules hook,
    // so both rule behaviors raise the categorized BusinessRuleViolation.
    if (input.behavior === 'rule_violation' || input.behavior === 'rule_violation_in_logic') {
      throw new BusinessRuleViolation('fixture rule violated');
    }
    if (input.behavior === 'resource_missing') throw new ResourceNotFound('FixtureResource', 'R-1');
    if (input.behavior === 'throw') throw new Error('fixture unexpected error');
    return input.response;
  });

  const result = await rt.execute(input.request, input.caller);
  const status = resultStatus(result);
  const authorizationReason =
    status === 'success'
      ? 'allowed'
      : result.errorCategory === 'AuthorizationError'
        ? (result.error as WBFError).context.reason
        : undefined;

  return { status, logicInvoked, response: result.response, authorizationReason };
}

async function runWorkflow(input: Json) {
  const order: string[] = [];
  const functionRequests: Record<string, Json> = {};

  // §6.4: only the contract's definition errors normalize to
  // `definition_rejected` (WorkflowDefinitionError from step/definition
  // construction, DuplicateError from registration). Anything else propagates.
  const registry = new WorkflowRegistry();
  try {
    const steps: WorkflowStep[] = input.steps.map(
      (s: Json) => new WorkflowStep({ id: s.id, sequence: s.sequence, businessFunctionId: s.function })
    );
    registry.register(
      new WorkflowDefinition({ id: 'wf', name: 'wf', displayName: 'wf', description: 'fixture', moduleId: 'CONF', steps })
    );
  } catch (error) {
    if (error instanceof WorkflowDefinitionError || error instanceof DuplicateError) {
      return { status: 'definition_rejected', executionOrder: order };
    }
    throw error;
  }

  const engine = new WorkflowEngine(registry);
  for (const [fnId, spec] of Object.entries<Json>(input.functions)) {
    const rt = new BusinessFunctionRuntime(
      new BusinessFunctionDefinition({
        id: fnId,
        name: fnId,
        displayName: fnId,
        description: 'conformance fixture',
        moduleId: 'CONF',
        domain: 'WF',
        capability: 'STEP',
      }),
      undefined,
      undefined,
      (_req, ctx) =>
        ctx.caller === input.caller ? AuthorizationDecisions.allow() : AuthorizationDecisions.deny('caller')
    );
    rt.setErrorReporter(() => undefined);
    rt.registerHandler(async (request: Json) => {
      order.push(fnId);
      functionRequests[fnId] = { ...request };
      if (spec.behavior === 'fail') throw new Error(`${fnId} failed`);
      return {};
    });
    engine.registerBusinessFunction(fnId, rt);
  }

  const result = await engine.execute(
    'wf',
    new WorkflowContext({
      workflowId: 'wf',
      executionId: 'conformance',
      correlationId: 'conformance',
      moduleId: 'CONF',
      entity: {},
      inputData: input.data,
      caller: input.caller,
    })
  );

  return {
    status: result.status,
    executionOrder: order,
    completedSteps: [...result.completedSteps],
    failedSteps: [...result.failedSteps],
    errors: result.errors.map(workflowErrorKind),
    functionRequests,
  };
}

async function runLifecycle(input: Json) {
  const lm = new LifecycleManager();
  let fired = 0;
  const handler: Json = {
    id: input.handler.id,
    supportedEvents: input.handler.events,
    callable: async () => {
      fired++;
    },
  };
  if ('enabled' in input.handler) handler.enabled = input.handler.enabled;
  lm.register(handler);
  await lm.dispatch(
    new LifecycleEvent({ name: input.dispatch }),
    new LifecycleContext({ entityId: 'conformance', entityType: 'Workflow', action: 'execute', actor: 'system' })
  );
  return { fired };
}

// ---------------------------------------------------------------------------
// Runner
// ---------------------------------------------------------------------------

const SUITES: Array<[string, string, (input: Json) => Promise<Record<string, Json>>]> = [
  ['validation', 'validation.json', runValidation],
  ['workflow', 'workflow.json', runWorkflow],
  ['business-function', 'business-function.json', runBusinessFunction],
  ['authorization', 'authorization.json', runBusinessFunction],
  ['lifecycle', 'lifecycle.json', runLifecycle],
];

const DRIVERS: Record<string, (input: Json) => Promise<Record<string, Json>>> = Object.fromEntries(
  SUITES.map(([contract, , driver]) => [contract, driver])
);

const report: Array<{ id: string; contract: string; outcome: string; normalized: Json; knownDifference?: string }> = [];

function pick(actual: Record<string, Json>, expected: Record<string, Json>) {
  const out: Record<string, Json> = {};
  for (const key of Object.keys(expected)) out[key] = actual[key] === undefined ? null : actual[key];
  return out;
}

const suiteFile = path.join(SUITE_DIR, 'suite.json');
const fixturesAvailable = fs.existsSync(FIXTURE_DIR) && fs.existsSync(suiteFile);

if (!fixturesAvailable) {
  describe('WBF cross-runtime conformance (Node.js adapter)', () => {
    const message =
      `WBF conformance fixtures not found at ${FIXTURE_DIR} (expected suite manifest ${suiteFile}). ` +
      'Set WBF_CONFORMANCE_FIXTURES to <core>/tests/conformance/fixtures.';
    if (REQUIRED) {
      // CI: a missing Core checkout is a configuration problem, never a pass.
      test('configuration: Core conformance fixtures must be present (WBF_CONFORMANCE_REQUIRED=1)', () => {
        throw new Error(`CONFIGURATION ERROR: ${message}`);
      });
    } else {
      // Local: Jest fails a file without tests, so register an explicit skip.
      test.skip(`${message} Suite skipped (set WBF_CONFORMANCE_REQUIRED=1 to fail instead).`, () => undefined);
    }
  });
}

if (fixturesAvailable) describe('WBF cross-runtime conformance (Node.js adapter)', () => {
  const suite: SuiteManifest = readJson(suiteFile);

  test(`suite integrity: manifest ${suite.suiteVersion}, fixture schema rules, unique ids, identical fixture set`, () => {
    expect(suiteProblems(suite)).toEqual([]);
  });

  for (const [contract, spec] of Object.entries(suite.contracts)) {
    const driver = DRIVERS[contract];
    describe(contract, () => {
      if (!driver) {
        test(`driver available for contract '${contract}'`, () => {
          throw new Error(`No Node driver for contract '${contract}'`);
        });
        return;
      }
      const file = path.join(SUITE_DIR, spec.file);
      const fixtures: Fixture[] = fs.existsSync(file) ? readJson(file).fixtures ?? [] : [];
      for (const fx of fixtures) {
        const known = KNOWN[fx.id];
        const name = `${fx.id} ${fx.description}${known ? ` [known difference: ${known}]` : ''}`;
        const body = async () => {
          const actual = await driver(fx.input);
          const projected = pick(actual, fx.expected);
          const passed = canonical(projected) === canonical(fx.expected);
          report.push({
            id: fx.id,
            contract,
            outcome: passed ? 'pass' : 'fail',
            normalized: projected,
            ...(known ? { knownDifference: known } : {}),
          });
          expect(JSON.parse(canonical(projected))).toEqual(JSON.parse(canonical(fx.expected)));
        };
        if (known) {
          test.failing(name, body);
        } else {
          test(name, body);
        }
      }
    });
  }

  afterAll(() => {
    const target = process.env.WBF_CONFORMANCE_REPORT;
    if (!target) return;
    const summary = {
      runtime: 'node',
      suiteVersion: suite.suiteVersion,
      integrityProblems: suiteProblems(suite),
      total: report.length,
      passed: report.filter((r) => r.outcome === 'pass').length,
      failed: report.filter((r) => r.outcome === 'fail').length,
      results: report,
    };
    fs.writeFileSync(target, JSON.stringify(summary, null, 2));
  });
});

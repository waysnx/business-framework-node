# WaysNX Business Framework - Node.js/TypeScript Implementation

**Version:** 0.4.0 (`package.json`; no release tag yet)  
**Status:** Early implementation (pre-production). See [WBF Compatibility Status](#wbf-compatibility-status).

> **Phase 0 behavior changes (2026-10-31).** Authorization now fails closed and requires an explicit `Authorizer` decision. Validation fails closed for unknown and unimplemented `custom` rules. Workflow steps run by `sequence`, not array order. Invalid or `null` requests return a structured `validation_failure`. See `docs/WBF_COMPATIBILITY_AUDIT.md`.
>
> **Phase 0.1 breaking changes (2026-11-01).** Result statuses changed: `rule_failure` → `business_rule_failure`, `failure` → `authorization_failure` / `not_found` / `execution_failure` (see [Result statuses](#result-statuses-phase-01-breaking)). Workflow step `sequence` must be an integer `>= 0`, and invalid or duplicate sequences throw `WorkflowDefinitionError` at construction.

## Overview

This is the Node.js/TypeScript implementation of the WaysNX Business Framework (WBF), a portable business framework that defines business-layer concepts and runtime infrastructure independent of HTTP frameworks, ORMs, or infrastructure concerns.

## Phase 1+2+3: Foundation + Runtime + Workflow Engine

**Phase 1** establishes core portable contracts (definitions, registries, errors).

**Phase 2** implements runtime execution infrastructure (BusinessFunctionRuntime, ValidationFramework, LifecycleManager).

**Phase 3** introduces workflow orchestration (WorkflowEngine, WorkflowContext, WorkflowResult).

## Project Structure

```
business-framework-node/
├── src/
│   ├── types/                          # Portable interface contracts
│   │   ├── EntityInterface.ts
│   │   ├── SerializableInterface.ts
│   │   ├── MetadataInterface.ts
│   │   ├── VersionableInterface.ts
│   │   ├── AuditableInterface.ts
│   │   └── index.ts
│   ├── definitions/                    # Immutable artifact definitions
│   │   ├── EntityDefinition.ts
│   │   ├── ModuleDefinition.ts
│   │   ├── BusinessFunctionDefinition.ts
│   │   ├── ValidationDefinition.ts
│   │   ├── WorkflowStep.ts
│   │   ├── WorkflowDefinition.ts
│   │   └── index.ts
│   ├── registries/                     # Artifact registries
│   │   ├── Registry.ts                 # Base universal pattern
│   │   ├── ModuleRegistry.ts
│   │   ├── EntityRegistry.ts
│   │   ├── BusinessFunctionRegistry.ts
│   │   ├── ValidationRegistry.ts
│   │   ├── WorkflowRegistry.ts
│   │   └── index.ts
│   ├── errors/                         # Error hierarchy
│   │   ├── WBFError.ts
│   │   ├── RegistryError.ts
│   │   ├── DuplicateError.ts
│   │   ├── NotFoundError.ts
│   │   ├── ValidationError.ts
│   │   ├── AuthorizationError.ts
│   │   ├── BusinessRuleViolation.ts
│   │   ├── ResourceNotFound.ts
│   │   ├── ConflictError.ts
│   │   ├── ExecutionError.ts            # Phase 2: ExecutionError + RequestValidationError,
│   │   │                                #   ResponseValidationError, ExecutionTimeoutError, HandlerNotFoundError
│   │   └── index.ts
│   ├── runtime/                        # Phase 2: Runtime execution
│   │   ├── BusinessFunctionRuntime.ts  # 6-step execution pipeline
│   │   ├── BusinessFunctionContext.ts  # Execution context (immutable)
│   │   ├── BusinessFunctionResult.ts   # Execution result (immutable)
│   │   ├── ValidationFramework.ts      # Business rule validation
│   │   ├── ValidationIssue.ts          # Validation error/warning
│   │   ├── LifecycleManager.ts         # Event handler dispatch
│   │   ├── LifecycleHandler.ts         # Handler interface
│   │   ├── LifecycleEvent.ts           # Event structure
│   │   ├── LifecycleContext.ts         # Event context (immutable)
│   │   ├── WorkflowEngine.ts           # Phase 3: Orchestration engine
│   │   ├── WorkflowContext.ts          # Phase 3: Workflow execution context
│   │   ├── WorkflowResult.ts           # Phase 3: Workflow execution result
│   │   └── index.ts
│   ├── cli/                            # Phase 4: `wbf` CLI (bin, commands, demo, tests)
│   ├── __tests__/                      # Test suites
│   │   ├── errors.test.ts              # Phase 1
│   │   ├── definitions.test.ts         # Phase 1
│   │   ├── registries.test.ts          # Phase 1
│   │   ├── runtime.test.ts             # Phase 2
│   │   ├── workflow.test.ts            # Phase 3
│   │   ├── phase0-remediation.test.ts  # Phase 0 regression tests (NOD-01/02/03/06/07, validation)
│   │   ├── conformance.test.ts         # Shared WBF conformance adapter
│   │   └── conformance-known-differences.json
│   └── index.ts
├── docs/                               # WBF compatibility audit and plans
├── package.json
├── tsconfig.json
├── jest.config.js
└── README.md
```

## Getting Started

### Installation

```bash
git clone https://github.com/waysnx/business-framework-node.git
cd business-framework-node
npm install
```

### Building

```bash
npm run build
```

### Testing

```bash
npm test                 # Run tests once
npm run test:watch      # Run tests in watch mode
```

### Linting

```bash
npm run lint
```

## Phase 2 Runtime

Phase 2 introduces runtime execution infrastructure for business function execution with validation, lifecycle management, and event dispatch.

### BusinessFunctionRuntime

Executes business functions with a fixed 6-step pipeline:

1. **validateRequest** - Validate request matches contract
2. **checkAuthorization** - **Fails closed.** Requires an explicit decision `{ allowed: true }` from the configured `Authorizer`. With no authorizer, an invalid decision or a deny, the result fails with `errorCategory: 'AuthorizationError'`
3. **evaluateBusinessRules** - Execute validation rules (optional)
4. **executeBusiness** - Execute handler logic
5. **publishEvents** - Publish domain events
6. **transformToResponse** - Ensure response matches contract

```typescript
import { BusinessFunctionRuntime, AuthorizationDecisions, Authorizer } from '@waysnx/business-framework';

// Host-supplied authorization decision point (WBF does not authenticate or own policies).
// The caller is identity input to the decision, never proof of authorization.
const authorizer: Authorizer = async (request, context, definition) =>
  (await myPolicyService.can(context.caller, definition.id))
    ? AuthorizationDecisions.allow()
    : AuthorizationDecisions.deny('Policy denied');

// Create runtime from definition (4th argument: authorizer; or call runtime.setAuthorizer(...))
const runtime = new BusinessFunctionRuntime(functionDefinition, undefined, undefined, authorizer);

// Register business logic handler
runtime.registerHandler(async (request) => {
  // Business logic
  return { requestId: 'req-001', status: 'completed' };
});

// Execute
const result = await runtime.execute(request, callerId);

if (result.succeeded()) {
  console.log('Response:', result.response);
} else {
  // Public, safe message (for execution_failure: generic text + reference)
  console.error('Error:', result.errorMessage, result.errorReference);
}
```

The runtime ensures:
- Frozen execution context and results (shallow `Object.freeze`)
- Request is a non-null plain object. Other values, including `null`, return `status: 'validation_failure'` (contract-schema validation is not yet implemented)
- Fail-closed authorization. `error.context.reason` is `no_authorizer`, `invalid_decision` or `denied` (API names final, ADR-0010 approved 2026-11-01)
- Business rule enforcement
- Event publishing
- Error propagation with detailed context

#### Result statuses (Phase 0.1, breaking)

`result.status` is one of six values (Core WBF-SPEC-0006, decision D1). Constructing a `BusinessFunctionResult` with any other value throws.

| Status | Raised by |
|---|---|
| `success` | — |
| `validation_failure` | `RequestValidationError`, `ValidationError` |
| `authorization_failure` | `AuthorizationError` |
| `not_found` | `ResourceNotFound` (missing **business** resource) |
| `business_rule_failure` | `BusinessRuleViolation` |
| `execution_failure` | everything else, including `HandlerNotFoundError`, registry `NotFoundError`, `ResponseValidationError` and unexpected errors |

Migration from earlier versions (values replaced directly, no compatibility alias):

| Before | After |
|---|---|
| `rule_failure` | `business_rule_failure` |
| `failure` with `errorCategory: 'AuthorizationError'` | `authorization_failure` |
| `failure` with `errorCategory: 'ResourceNotFound'` | `not_found` |
| `failure` otherwise (incl. missing handler) | `execution_failure` |
| `validation_failure` from `ResponseValidationError` | `execution_failure` |

`result.failed()` is `status !== 'success'`; `isRuleFailure()` checks `business_rule_failure`. Code that compared against `'failure'` or `'rule_failure'` must be updated. `BusinessFunctionRuntime.classify(error)` exposes the mapping.

An error thrown by the `Authorizer` itself (rather than returning a deny decision) is unexpected and yields `execution_failure`, not `authorization_failure`. Deny with `AuthorizationDecisions.deny()` or throw `AuthorizationError`.

#### Public error messages (ADR-0009 amendment A1, BF-ERR-03)

- For `execution_failure`, `result.errorMessage` / `getErrorMessage()` is always `An internal error occurred while executing the business function. Reference: <executionId>`, and `result.errorReference` is the execution ID. The raw error message is never in `toObject()`, `toJson()` or `JSON.stringify(result)`.
- The original error stays on `result.error` for in-process diagnostics. It is non-enumerable and never serialized.
- Every `execution_failure` is reported server-side with the same reference. The default reporter calls `console.error(message, error)`. Plug in your logger with `runtime.setErrorReporter((message, report) => logger.error(message, report))`; `report.error` is the original error.
- Validation, authorization, not-found and business-rule failures keep their messages and are not reported.
- Workflow step errors embed the public message, not the raw one.

Migration: code that read `result.error.message` or `getErrorMessage()` to show an internal error must use the log entry (by reference) or `result.error` instead.

### ValidationFramework

Evaluates business validation rules:

```typescript
const framework = new ValidationFramework(validationRegistry);

// Evaluate all validations for a scope
const issues = await framework.evaluate(request, scope);

// Separate errors from warnings
const errors = issues.filter(i => i.isError());
const warnings = issues.filter(i => i.isWarning());
```

Supports rule types:
- **required** - fails when the field is missing, `null`, an empty or whitespace-only string, or an empty array (`0`/`false` are present). Code `WBF.VALIDATION.REQUIRED`
- **range** - min/max value (or length) validation
- **format** - pattern/regex validation
- **custom** - **fails closed** (`WBF.VALIDATION.UNKNOWN_RULE`) unless your application subclasses `ValidationFramework` and overrides the protected `evaluateCustom()`
- **any other type** - fails closed as an error (`WBF.VALIDATION.UNKNOWN_RULE`), even if declared as a warning

Warnings are returned in the issue list and never block. Note: `BusinessFunctionRuntime` currently reports only error-level issues (as `business_rule_failure`) and does not surface warnings in its result (finding NOD-04, planned for M4).

### LifecycleManager

Manages lifecycle event handlers for observational logging, auditing, and monitoring:

```typescript
const lifecycle = new LifecycleManager();

// Register handlers
lifecycle.register({
  id: 'audit-handler',
  supportedEvents: ['execution.started', 'execution.completed'],
  priority: 100,
  enabled: true,
  callable: async (event, context) => {
    // Audit logging
    console.log('Event:', event.name, context.functionId);
  },
});

// Dispatch event
await lifecycle.dispatch(event, context);
```

Handlers:
- Execute in priority order (highest first). `priority` is optional and defaults to `0`
- Are enabled unless `enabled: false` is given. `enabled` is optional and **defaults to `true`**, the same as `registerCallback()` and the Laravel runtime. A non-boolean `enabled` is rejected at registration
- Receive lifecycle events and context
- Propagate exceptions to the caller. A throwing handler aborts the current dispatch, so handlers are not strictly observational

### Immutable Context & Results

Execution contexts and results are frozen with `Object.freeze`. The freeze is **shallow**: nested objects inside `request`, `entity` or `response` are not frozen.

```typescript
const context = new BusinessFunctionContext({
  functionId: 'HR.LEAVE.APPLY',
  executionId: 'exec-001',
  correlationId: 'corr-001',
  moduleId: 'HR',
  request: { /* ... */ },
  caller: 'user-123',
});

// Cannot modify
context.functionId = 'different'; // Error

const result = new BusinessFunctionResult({
  functionId: 'HR.LEAVE.APPLY',
  executionId: 'exec-001',
  status: 'success',
  response: { requestId: 'req-001' },
  duration: 145,
});

// Cannot modify
result.status = 'failed'; // Error
```

Both serialize to JSON for DQP integration and logging.

## Phase 3 Workflow Engine

Phase 3 introduces the WorkflowEngine for orchestrating multi-step business processes through sequential workflow execution, integrated with Phase 2 runtime infrastructure.

### WorkflowEngine

Orchestrates workflow execution by executing steps sequentially through registered BusinessFunctionRuntimes:

```typescript
// Create engine with registries
const engine = new WorkflowEngine(workflowRegistry, lifecycleManager);

// Register business function handlers for each step (each runtime needs an authorizer)
const applyLeaveRuntime = new BusinessFunctionRuntime(applyLeaveFn, undefined, undefined, authorizer);
applyLeaveRuntime.registerHandler(async (request) => {
  // Apply leave logic
  return { requestId: 'req-001', status: 'pending' };
});
engine.registerBusinessFunction('HR.LEAVE.APPLY.APPLY_LEAVE', applyLeaveRuntime);

// Create workflow context
const context = new WorkflowContext({
  workflowId: 'employee-onboarding',
  executionId: 'exec-001',
  correlationId: 'corr-001',
  moduleId: 'HR',
  entity: { id: 'emp-001', name: 'John Doe' },
  inputData: { leaveType: 'vacation', days: 5 },
  caller: 'manager-123',
});

// Execute workflow
const result = await engine.execute('employee-onboarding', context);

if (result.succeeded()) {
  console.log('Workflow completed successfully');
  console.log(`Steps: ${result.completedSteps.length} completed, ${result.failedSteps.length} failed`);
} else {
  console.error('Workflow failed:', result.summary());
  result.errors.forEach(err => console.error(`  - ${err}`));
}
```

The engine:
- Executes workflow steps in ascending `step.sequence` order, regardless of declaration (array) order
- Fails the run before any step executes when step IDs or `sequence` values are duplicated (defensive check)

Sequencing contract (Core WBF-SPEC-0007, decision D8): `sequence` is required and must be an integer `>= 0` (`0` is valid). `new WorkflowStep(...)` throws `WorkflowDefinitionError` (`reason`: `missing_sequence`, `invalid_sequence`, `negative_sequence`) and `new WorkflowDefinition(...)` throws it with `duplicate_sequence`. Previously a plain `Error` was thrown, non-integer values such as `1.5` were accepted, and duplicates were only detected at execution.
- Implements fail-fast semantics: stops on first step failure
- Integrates with Phase 2 LifecycleManager for event dispatch
- Publishes lifecycle events: beforeWorkflow, beforeStep, stepCompleted, stepFailed, afterStep, workflowCompleted, workflowFailed, afterWorkflow. `afterStep` is currently dispatched **only after a successful step** (finding NOD-08)
- Does not yet propagate the workflow `correlationId` to step executions (finding NOD-09)
- Tracks execution state immutably via WorkflowContext
- Returns immutable WorkflowResult with complete outcome

#### Extension Point: executeBusinessFunction

Applications override the protected `executeBusinessFunction` method to customize request mapping:

```typescript
// The engine's runtime map is private: keep your own reference to the runtimes you register.
class CustomWorkflowEngine extends WorkflowEngine {
  constructor(registry: WorkflowRegistry, private runtimes: Map<string, BusinessFunctionRuntime>) {
    super(registry);
    for (const [id, rt] of runtimes) this.registerBusinessFunction(id, rt);
  }

  protected async executeBusinessFunction(functionId: string, context: WorkflowContext) {
    // Map workflow context to business function request
    const request = { ...context.inputData, employeeId: context.entity.id };
    return this.runtimes.get(functionId)!.execute(request, context.caller, {
      correlationId: context.correlationId,
    });
  }
}
```

### WorkflowContext

Immutable execution context carrying workflow state through orchestration:

```typescript
const context = new WorkflowContext({
  workflowId: 'leave-approval',
  executionId: 'exec-001',
  correlationId: 'corr-001',
  moduleId: 'HR',
  entity: employee, // Business object being processed
  inputData: { days: 5, reason: 'vacation' },
  caller: 'user-123',
  metadata: { source: 'api', version: '1.0' },
  options: { retry: true, timeout: 5000 },
});

// Track completed steps
const updated = context.withCompletedStep('validate-employee');

// Track failed steps
const failed = context.withFailedStep('send-notification');

// Update current step being executed
const current = context.withCurrentStep('approve-leave');

// Query context
context.elapsedTime();                    // Milliseconds since creation
context.getOption('retry');               // Get option with default
context.getMetadataValue('source');       // Get metadata value
context.completedSteps;                   // Steps that succeeded
context.failedSteps;                      // Steps that failed
context.currentStepId;                    // Currently executing step

// Serialize for logging
context.toObject();                       // Plain object
context.toJson();                         // JSON string
```

Context is frozen (shallow): its own arrays are frozen and all updates return a new derived context. The `entity` object is stored by reference and is not frozen.

### WorkflowResult

Immutable outcome of workflow execution with complete status and diagnostics:

```typescript
const result = new WorkflowResult({
  executionId: 'exec-001',
  workflowId: 'leave-approval',
  status: 'completed', // 'completed' | 'failed'
  completedSteps: ['validate-employee', 'approve-leave'],
  failedSteps: [],
  duration: 1250,
  errors: [],
  warnings: ['Employee has pending requests'],
  metadata: { correlationId: 'corr-001' },
});

// Query result
result.succeeded();                       // status === 'completed' && no failed steps
result.failed();                          // status === 'failed' || has failed steps
result.totalSteps();                      // completedSteps + failedSteps
result.completionPercentage();            // (completed / total) * 100
result.errorCount();                      // Number of errors
result.hasErrors();                       // errors.length > 0
result.hasWarnings();                     // warnings.length > 0

// Human-readable summary
console.log(result.summary());
// "Workflow completed successfully. 2 steps executed in 1250ms."
// OR
// "Workflow failed at step 'approve-leave'. 1 steps completed, 1 failed. Duration: 500ms."

// Serialize for logging
result.toObject();                        // Plain object
result.toJson();                          // JSON string
```

Result is frozen (shallow).

### Lifecycle Integration

WorkflowEngine publishes 8 standard events through LifecycleManager:

```typescript
const lifecycle = new LifecycleManager();
engine = new WorkflowEngine(workflowRegistry, lifecycle);

lifecycle.register({
  id: 'workflow-logger',
  supportedEvents: [
    'beforeWorkflow',      // Workflow about to start
    'beforeStep',          // Step about to execute
    'stepCompleted',       // Step succeeded
    'stepFailed',          // Step failed
    'afterStep',           // Step done (currently only after success, NOD-08)
    'workflowCompleted',   // All steps succeeded
    'workflowFailed',      // Workflow stopped due to failure
    'afterWorkflow',       // Workflow done (success or fail)
  ],
  // `priority` (default 0) and `enabled` (default true) are optional.
  // Before Phase 0 a handler without `enabled: true` was silently never dispatched.
  callable: async (event, context) => {
    console.log(`Workflow Event: ${event.name}`);
    console.log(`  Execution: ${event.metadata.executionId}`);
    console.log(`  Current Step: ${event.metadata.currentStepId}`);
  },
});

// Events dispatched automatically during execute()
```



### Entity

Represents a business concept with stable identity. Implements `EntityInterface`:

```typescript
interface EntityInterface {
  getEntityId(): string | number;
  getEntityType(): string;
  getEntityVersion(): number;
  toArray(): Record<string, any>;
  toJson(): string;
}
```

### Module

Organizational/governance concept representing a domain of business functionality.

```typescript
const module = new ModuleDefinition({
  id: 'HR',
  name: 'Human Resources',
  displayName: 'HR Module',
  description: 'Human resource management',
  status: 'Operate',
});
```

### Business Function

Defines a single business operation with complete contract specification.

```typescript
const fn = new BusinessFunctionDefinition({
  id: 'HR.LEAVE.APPLY.APPLY_LEAVE',
  name: 'ApplyLeave',
  displayName: 'Apply for Leave',
  description: 'Apply for leave',
  moduleId: 'HR',
  domain: 'LEAVE',
  capability: 'APPLY',
  requestContract: { employeeId: 'string', startDate: 'date' },
  responseContract: { requestId: 'string', status: 'string' },
});
```

### Validation

Defines business validation rules for entity or operation scope.

```typescript
const validation = new ValidationDefinition({
  id: 'VAL-001',
  name: 'EmployeeMustBeActive',
  displayName: 'Employee Must Be Active',
  description: 'Employee must have active status',
  moduleId: 'HR',
  scope: 'Employee',
  severity: 'error',
});
```

### Workflow

Defines multi-step business process orchestration.

```typescript
const workflow = new WorkflowDefinition({
  id: 'wf-leave-approval',
  name: 'LeaveApproval',
  displayName: 'Leave Approval',
  description: 'Leave approval workflow',
  moduleId: 'HR',
  steps: [step1, step2, step3],
  triggerType: 'manual',
});
```

### Registries

All registries implement the universal pattern:

```typescript
const registry = new EntityRegistry();

// Register
registry.register(definition);

// Find
registry.findById('id');
registry.findByName('name');
registry.findByAlias('alias');

// Query
registry.all();
registry.count();
registry.exists('id');

// Alias support
registry.alias('id', 'alias');
registry.removeAlias('alias');
```

Specialized registries add domain-specific queries:

- **BusinessFunctionRegistry**: `findByModule()`, `findByCategory()`, `findByTag()`, `requiringPermission()`
- **ValidationRegistry**: `findByScope()`, `findBySeverity()`
- **WorkflowRegistry**: `findByModule()`, `findByTrigger()`, `findByEntity()`
- **ModuleRegistry**: `findByDomain()`, `active()`, `withDependencies()`

### Error Handling

Standard error categories:

```typescript
throw new ValidationError('Invalid input');
throw new AuthorizationError('Access denied');
throw new BusinessRuleViolation('Rule violated');
throw new ResourceNotFound('Employee', 'emp-001');
throw new DuplicateError('Entity', 'entity-001');
```

## Design Principles

1. **Framework Neutral** - No HTTP, ORM, or framework dependencies
2. **Portable** - Same contracts work across PHP, Node, Java, etc.
3. **Definition-First** - Separates specification from runtime
4. **Immutable Definitions** - Definitions never change after creation
5. **Machine Readable** - All definitions serialize to JSON for tooling
6. **Type Safe** - Full TypeScript strict mode support
7. **Zero Dependencies** - Core has no external dependencies

## Acceptance Criteria

### Phase 1: Foundation

#### ✓ Core Interfaces Compile

All portable contracts defined and TypeScript strict compilation passes:
- EntityInterface
- SerializableInterface
- MetadataInterface
- VersionableInterface
- AuditableInterface

#### ✓ Definition Objects Work

Six immutable definition classes created:
- EntityDefinition
- ModuleDefinition
- BusinessFunctionDefinition
- ValidationDefinition
- WorkflowStep
- WorkflowDefinition

#### ✓ Definitions are Immutable

All properties frozen via Object.freeze()
Cannot be modified after construction

#### ✓ Definitions Serialize Correctly

All definitions implement:
- `toObject()` - Returns plain object
- `toJson()` - Returns JSON string

#### ✓ Generic Registry Works

Base Registry class implements universal pattern:
- register/unregister
- findById/findByName/findByAlias
- all/count/exists
- nameExists/aliasExists
- alias/removeAlias/getAliasesFor
- clear

#### ✓ All Five Registries Work

Specialized registries tested:
- ModuleRegistry (findByDomain, active, withDependencies)
- EntityRegistry (findByClass, findByTag)
- BusinessFunctionRegistry (findByModule, findByCategory, findByTag, supportingEntity, requiringPermission)
- ValidationRegistry (findByScope, findBySeverity)
- WorkflowRegistry (findByModule, findByTrigger, findByEntity)

#### ✓ Error Hierarchy Works

Error categories implemented:
- WBFError (base)
- RegistryError
- DuplicateError
- NotFoundError
- ValidationError
- AuthorizationError
- BusinessRuleViolation
- ResourceNotFound
- ConflictError

#### ✓ No HTTP/ORM/Framework Dependency

Core has zero dependencies on HTTP frameworks, ORMs, or databases

#### ✓ TypeScript Strict Compilation Passes

All Phase 1 code compiles with strict TypeScript settings

#### ✓ All Phase 1 Tests Pass

Three test suites passing:
- errors.test.ts - Error hierarchy and serialization
- definitions.test.ts - Definition immutability and serialization
- registries.test.ts - Universal registry pattern and specialized queries

#### ✓ Public Exports are Clean

Main index.ts exports all types, definitions, registries, errors

#### ✓ No Later-Phase Implementation

Phase 1 does NOT include Runtime, WorkflowEngine, or other Phase 2+ features

### Phase 2: Runtime

#### ✓ BusinessFunctionRuntime Executes

6-step pipeline implemented and tested:
1. validateRequest
2. checkAuthorization
3. evaluateBusinessRules
4. executeBusiness
5. publishEvents
6. transformToResponse

#### ✓ ValidationFramework Evaluates Rules

Validation rule execution with issue classification:
- Error-level violations produce a `business_rule_failure` result (`BusinessRuleViolation` category)
- Warning-level violations do not block (they are not logged or surfaced in the Business Function result yet)
- Supports required, range and format. `custom` and unknown types fail closed (Phase 0)

#### ✓ LifecycleManager Dispatches Events

Event handler management:
- Handler registration with priority
- Event dispatch in priority order
- Observational execution (cannot prevent flow)
- Exception propagation from handlers

#### ✓ Context & Results Immutable

All execution contexts and results:
- Frozen via Object.freeze() (shallow)
- Serializable to JSON
- Include complete execution metadata

#### ✓ Phase 2 Error Hierarchy

Five new execution error classes:
- ExecutionError (base)
- RequestValidationError
- ResponseValidationError
- ExecutionTimeoutError
- HandlerNotFoundError

#### ✓ TypeScript Strict Compilation Passes

All Phase 2 code compiles with strict TypeScript settings

#### ✓ All Phase 2 Tests Pass

Integration test suite covering:
- BusinessFunctionRuntime execution pipeline
- ValidationFramework rule evaluation
- LifecycleManager event dispatch
- Error handling and propagation
- Context/result immutability

#### ✓ Phase 1 Tests Still Pass

All Phase 1 tests continue to pass (no breaking changes)

#### ✓ No Phase 2+ Features

Phase 2 does NOT include WorkflowEngine, CLI, or other Phase 2+ features

### Phase 3: Workflow Engine

#### ✓ WorkflowEngine Orchestrates

Multi-step workflow execution implemented and tested:
- Sequential step execution in step.sequence order
- Fail-fast semantics: stops on first step error
- Step tracking (completedSteps, failedSteps, currentStep)
- Integration with Phase 2 LifecycleManager
- 8 standard lifecycle events published

#### ✓ WorkflowContext Tracks Execution

Immutable workflow context with state tracking:
- workflowId, executionId, correlationId, moduleId
- entity (business object being processed)
- inputData, metadata, options
- completedSteps[], failedSteps[], currentStepId
- Derived context via withCompletedStep/withFailedStep/withCurrentStep
- Serializable to JSON

#### ✓ WorkflowResult Reports Outcome

Immutable workflow result with complete diagnostics:
- executionId, workflowId, status ('completed' | 'failed')
- completedSteps[], failedSteps[], currentStepId
- errors[], warnings[]
- duration, timestamp, metadata
- Query methods: succeeded(), failed(), totalSteps(), completionPercentage(), errorCount(), hasErrors(), hasWarnings()
- summary() for human-readable output
- Serializable to JSON

#### ✓ Extension Point Works

Protected executeBusinessFunction extension point for application override:
- Default: pass-through of inputData as request
- Application customizes request mapping
- Returns BusinessFunctionResult

#### ✓ Lifecycle Events Dispatched

8 standard events published via LifecycleManager:
1. beforeWorkflow - Workflow starting
2. beforeStep - Step about to execute
3. stepCompleted - Step succeeded
4. stepFailed - Step failed
5. afterStep - Step execution done
6. workflowCompleted - All steps succeeded
7. workflowFailed - Workflow stopped on error
8. afterWorkflow - Workflow execution finished

#### ✓ TypeScript Strict Compilation Passes

All Phase 3 code compiles with strict TypeScript settings

#### ✓ All Phase 3 Tests Pass

Test suite covering:
- WorkflowContext creation, step tracking, options/metadata, serialization, immutability
- WorkflowResult creation, failed result, errors/warnings, summary, serialization
- WorkflowEngine single-step, multi-step, step failure, fail-fast, lifecycle events, missing workflow/function, correlation ID preservation

#### ✓ Phase 1+2 Tests Still Pass

All Phase 1+2 tests continue to pass (no breaking changes)

#### ✓ No Phase 4+ Features

Phase 3 does NOT include retry logic, compensation, parallel execution, workflow persistence, scheduling, human task engine, HTTP APIs, or database integration

## Phase 4: CLI + CREATEDemo

Phase 4 introduces developer experience tools: a command-line interface (CLI) with 6 core commands and the CREATEDemo showcase demonstrating the complete WBF model.

### CLI Overview

The `wbf` CLI provides developer tools for inspection, artifact generation, and learning WBF:

```bash
wbf help                                    # Show help
wbf doctor                                  # Verify environment
wbf list [modules|entities|functions|...]  # List registered artifacts
wbf show <type> <id>                       # Display artifact details
wbf make <type> <name>                     # Generate artifact scaffolds
wbf register <type> <id>                   # Registration guidance
wbf createdemo                             # Run complete WBF demonstration
```

### Installation and Usage

```bash
# From npm scripts
npm run wbf -- help
npm run wbf -- doctor
npm run wbf -- list modules
npm run wbf -- show workflow audit-review
npm run wbf -- make entity Employee
npm run wbf -- register function HR.LEAVE.APPLY.APPLY_LEAVE
npm run wbf -- createdemo
npm run wbf -- createdemo --json

# From global install
npm install -g @waysnx/business-framework
wbf createdemo
```

### Commands

#### wbf doctor

Verifies WBF environment:
- Node.js version (requires v14+)
- WBF package availability
- TypeScript presence
- Runtime environment

```bash
$ wbf doctor

=== WaysNX Business Framework - Doctor ===

Environment Checks:
---
✓ Node.js          v20.0.0
✓ WBF Package      v0.4.0
✓ TypeScript       v5.0.0
✓ Runtime          Node.js
---
Results: 4 ok

✓ Environment is ready for WBF development.
```

#### wbf list

Lists registered artifacts by type (no persistence):

```bash
$ wbf list modules
Modules: (none registered)

$ wbf list workflows
Workflows: (none registered)

$ wbf list --json
```

#### wbf show

Displays details of a specific artifact (requires artifact to be registered):

```bash
$ wbf show module AUDIT
=== module: AUDIT ===

Display Name: Hospital Audit Management
Name: AuditManagement
Description: Manages hospital audit processes...
Version: 1

Properties:
  status: Operate
  ...
```

#### wbf make

Generates scaffolds for new artifacts (does NOT register):

```bash
$ wbf make entity Employee

Generated entity scaffold:

import { EntityDefinition } from '@waysnx/business-framework';

export const EmployeeEntity = new EntityDefinition({
  id: 'EMPLOYEE',
  name: 'Employee',
  displayName: 'Employee',
  description: 'Entity description',
  moduleId: 'MODULE_ID',
  // ...
});

To register this artifact, use:
  wbf register entity <id>
```

Supports: module, entity, function, validation, workflow

#### wbf register

Provides guidance for registering artifacts (does NOT persist):

```bash
$ wbf register function AUDIT.VALIDATE.AUDIT.VALIDATE_AUDIT

Register function 'AUDIT.VALIDATE.AUDIT.VALIDATE_AUDIT':

Step 1: Create or import the definition
  const definition = new FunctionDefinition({
    id: 'AUDIT.VALIDATE.AUDIT.VALIDATE_AUDIT',
    // ... other properties
  });

Step 2: Get the registry
  const registry = new BusinessFunctionRegistry();

Step 3: Register the definition
  registry.register(definition);

The definition is now available for discovery and use.
```

#### wbf createdemo

Executes a complete end-to-end demonstration using the Hospital Audit domain, demonstrating all WBF concepts:

```bash
$ wbf createdemo

╔════════════════════════════════════════════════════════════════╗
║  WaysNX Business Framework - Complete Demonstration            ║
║  Hospital Audit Management Example                            ║
╚════════════════════════════════════════════════════════════════╝

📋 PHASE 1: DEFINING WBF ARTIFACTS
═══════════════════════════════════

✓ Module: "Hospital Audit Management"
✓ Entity: "Audit"
✓ Business Function: "Validate Audit"
✓ Business Function: "Record Finding"
✓ Business Function: "Complete Audit"
✓ Validation: "Audit Data Validation"
✓ Workflow: "Audit Review" (3 steps)

📚 PHASE 2: REGISTERING IN REGISTRIES
═════════════════════════════════════

✓ Registered Module (1 total)
✓ Registered Entity (1 total)
✓ Registered Business Functions (3 total)
✓ Registered Validation (1 total)
✓ Registered Workflow (1 total)

🔍 PHASE 3: DISCOVERING REGISTERED ARTIFACTS
═════════════════════════════════════════════

✓ Found Module: Hospital Audit Management
✓ Found Workflow: Audit Review

⚙️  PHASE 4: EXECUTING WORKFLOW WITH RUNTIME
════════════════════════════════════════════

Executing workflow "Audit Review"...
Entity: Audit AUDIT-2024-001 at Memorial Hospital
Correlation ID: corr-1787855258830

📊 WORKFLOW EXECUTION RESULT
════════════════════════════

Status: COMPLETED
Execution ID: exec-1787855258830
Duration: 1ms

Steps:
  ✓ Completed: 3
    - validate-step
    - record-step
    - complete-step

✨ WBF DEMONSTRATION SUMMARY
═════════════════════════════

✓ Module: Hospital Audit Management
✓ Entity: Audit record
✓ Business Functions: 3 (Validate, Record, Complete)
✓ Validations: Business rules enforcement
✓ Workflow: Multi-step orchestration
✓ Execution: Successful completion
✓ Lifecycle: Event dispatch (optional)
✓ Result: Immutable outcome tracking

📚 WBF CONCEPTS DEMONSTRATED:

1. Business-First Modeling
   → All artifacts defined in business terms
2. Explicit Business Functions
   → Named, versioned operations with contracts
3. Business Validation
   → Rules enforced during execution
4. Workflow Orchestration
   → 3 steps executed in sequence
5. Lifecycle Management
   → Events dispatched throughout execution
6. Structured Results
   → Immutable outcome with complete tracking
7. Registry-Based Discovery
   → All artifacts discoverable and inspectable
8. Framework-Neutral Architecture
   → Pure business logic, no HTTP/ORM coupling

╔════════════════════════════════════════════════════════════════╗
║                  ✓ DEMO COMPLETED SUCCESSFULLY               ║
╚════════════════════════════════════════════════════════════════╝
```

**JSON Output:**

```bash
$ wbf createdemo --json

{
  "success": true,
  "demo": {
    "name": "Hospital Audit Management",
    "domain": "Audit"
  },
  "artifacts": {
    "module": { "id": "AUDIT", "displayName": "Hospital Audit Management" },
    "entities": [
      { "id": "AUDIT", "displayName": "Audit" }
    ],
    "businessFunctions": [
      { "id": "AUDIT.VALIDATE.AUDIT.VALIDATE_AUDIT", "displayName": "Validate Audit" },
      { "id": "AUDIT.RECORD.FINDING.RECORD_FINDING", "displayName": "Record Finding" },
      { "id": "AUDIT.COMPLETE.AUDIT.COMPLETE_AUDIT", "displayName": "Complete Audit" }
    ],
    "validations": [
      { "id": "AUDIT_DATA_VALID", "displayName": "Audit Data Validation" }
    ],
    "workflow": { "id": "audit-review", "displayName": "Audit Review", "steps": 3 }
  },
  "execution": {
    "executionId": "exec-1787855258830",
    "workflowId": "audit-review",
    "status": "completed",
    "completedSteps": ["validate-step", "record-step", "complete-step"],
    "failedSteps": [],
    "duration": 1
  }
}
```

### Demo Architecture

The `wbf createdemo` demonstrates the complete WBF model through a Hospital Audit Management domain:

**Artifacts:**
- Module: AUDIT (Hospital Audit Management)
- Entity: Audit (audit record with hospital/department/date)
- Business Functions: ValidateAudit, RecordFinding, CompleteAudit
- Validation: AuditDataValidation (rule enforcement)
- Workflow: audit-review (3-step sequential process)

**Execution:**
1. All artifacts defined immutably
2. All artifacts registered in appropriate registries
3. All artifacts discovered via registry lookups
4. Workflow executed via WorkflowEngine
5. Business functions executed via BusinessFunctionRuntimeinstances
6. 3 workflow steps completed successfully
7. Result returned as immutable WorkflowResult

**Output:**
- Human-readable summary with all phases explained
- JSON output for AI agents and tooling
- No persistence, no external APIs, no database
- Safe to run repeatedly, deterministic

### Design Principles

- **Developer-Focused:** Help developers understand WBF quickly
- **No Persistence:** Demo artifacts not stored
- **Deterministic:** Same output every run
- **Complete Model:** All 8 WBF concepts demonstrated
- **Framework-Agnostic:** CLI uses pure WBF APIs only
- **Machine-Readable:** JSON output for tooling and AI

### Acceptance Criteria

#### ✓ CLI Foundation Works

- Command router (parseArgs + main)
- 6 commands implemented
- Help/version output
- Flag parsing (--json, --help, --version)

#### ✓ All 6 Commands Implemented

- doctor (environment verification)
- list (registry discovery)
- show (artifact inspection)
- make (artifact generation)
- register (registration guidance)
- createdemo (orchestration)

#### ✓ CREATEDemo Uses Real APIs

- Real ModuleDefinition, EntityDefinition, BusinessFunctionDefinition, ValidationDefinition, WorkflowDefinition
- Real ModuleRegistry, EntityRegistry, BusinessFunctionRegistry, ValidationRegistry, WorkflowRegistry
- Real BusinessFunctionRuntime with registered handlers
- Real LifecycleManager
- Real WorkflowEngine executing workflow
- Real WorkflowContext and WorkflowResult

#### ✓ Hospital Audit Domain Complete

- Module: AUDIT
- Entity: Audit
- 3 Business Functions: ValidateAudit, RecordFinding, CompleteAudit
- 1 Validation: AuditDataValidation
- 1 Workflow: audit-review with 3 sequential steps

#### ✓ All WBF Concepts Demonstrated

1. Business-First Modeling (definitions in business language)
2. Explicit Business Functions (ValidateAudit, RecordFinding, CompleteAudit with contracts)
3. Business Validation (AuditDataValidation rule)
4. Workflow Orchestration (3-step sequential workflow)
5. Lifecycle Management (events dispatched)
6. Structured Results (immutable WorkflowResult)
7. Registry-Based Discovery (artifacts registered and found)
8. Framework-Neutral Architecture (no HTTP/ORM/framework)

#### ✓ JSON Output Works

- Valid JSON output with --json flag
- Includes all artifacts, execution details
- Suitable for AI agents and tooling

#### ✓ No Persistence

- No database writes
- No file writes
- Artifacts not registered permanently
- Safe to run repeatedly

#### ✓ All Tests Pass

- As of Phase 0.1 (2026-11-01): 9 suites, 283 tests passing, including the Phase 0/0.1 regression tests, the 33 shared conformance fixtures and the suite-integrity test (when the Core checkout is present)
- Coverage: branch coverage 64.94% (Phase 0: 63.96%), below the configured 70% threshold, so `npx jest --coverage` fails. The threshold is unchanged and not enforced in CI (`npm test` runs without `--coverage`)

#### ✓ Build and Lint Pass

- npm run build: 0 errors
- npm run lint: 0 errors
- TypeScript strict compilation passes

## Not Yet Implemented

The CLI tools and the Hospital Audit demo already ship. They are not future work. The following are not implemented:

- Entity implementation, repository, persistence adapters and transactions (ADR-0006, blocked)
- Request/response contract-schema validation
- Event bus publication (`eventsPublished` lists declared events only)
- Tenant context and tenant isolation
- Workflow persistence, retry, compensation, parallel or conditional steps, human tasks
- Framework adapters (Express, NestJS, Fastify)
- `wbf list` / `show` / `register` operate on empty registries. They do not load your application's definitions

## WBF Compatibility Status

| | |
|---|---|
| WBF specification targeted | WBF-SPEC-0000…0005 (Draft, Core tag `v1.0.0-preview`) |
| Package status | Early implementation, `0.4.0`, no release tag |
| Own test suite | Passing (`npm test`) |
| Shared conformance suite | v0.1.0 (Core `tests/conformance/fixtures`, untagged): **33 of 33 fixtures pass**, plus the suite-integrity check, with no known differences. The suite covers narrow slices of validation, workflow sequencing, Business Function results, authorization and lifecycle enablement only |
| Conformance CI | Prepared (`.github/workflows/conformance.yml`, manual trigger, pinned to `conformance-v0.1.0`). **Not active** until the Core tag exists |
| Parity with the Laravel runtime | **Not claimed.** Both runtimes produce identical normalized outcomes for the 33 fixtures. Areas without fixtures (entities, events, serialization, error codes, execution context, tenancy) are unverified. See Core `docs/architecture/IMPLEMENTATION_CAPABILITY_MATRIX.md` |

Status vocabulary: Specified (Core spec exists) → Implemented → Tested (this repo) → Conformance verified (shared fixtures) → Released (tagged). See `docs/CONFORMANCE_TESTING.md`.

## License

Apache-2.0

## Authors

WaysNX

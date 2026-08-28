# WaysNX Business Framework - Node.js/TypeScript Implementation

**Version:** 0.4.0  
**Status:** Phase 1+2+3+4 - Foundation + Runtime + Workflow Engine + CLI/CREATEDemo (Pre-Production)

## Overview

This is the Node.js/TypeScript implementation of the WaysNX Business Framework (WBF), a portable business framework that defines business-layer concepts and runtime infrastructure independent of HTTP frameworks, ORMs, or infrastructure concerns.

## Phase 1+2+3: Foundation + Runtime + Workflow Engine

**Phase 1** establishes core portable contracts (definitions, registries, errors).

**Phase 2** implements runtime execution infrastructure (BusinessFunctionRuntime, ValidationFramework, LifecycleManager).

**Phase 3** introduces workflow orchestration (WorkflowEngine, WorkflowContext, WorkflowResult).

## Project Structure

```
implementations/node/
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
│   │   ├── ExecutionError.ts            # Phase 2
│   │   ├── RequestValidationError.ts    # Phase 2
│   │   ├── ResponseValidationError.ts   # Phase 2
│   │   ├── ExecutionTimeoutError.ts     # Phase 2
│   │   ├── HandlerNotFoundError.ts      # Phase 2
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
│   ├── __tests__/                      # Test suites
│   │   ├── errors.test.ts              # Phase 1
│   │   ├── definitions.test.ts         # Phase 1
│   │   ├── registries.test.ts          # Phase 1
│   │   ├── runtime.test.ts             # Phase 2
│   │   └── workflow.test.ts            # Phase 3
│   └── index.ts
├── package.json
├── tsconfig.json
├── jest.config.js
└── README.md
```

## Getting Started

### Installation

```bash
cd implementations/node
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
2. **checkAuthorization** - Check caller present if authorization required (Phase 2: presence only, enforcement deferred to Phase 3+)
3. **evaluateBusinessRules** - Execute validation rules (optional)
4. **executeBusiness** - Execute handler logic
5. **publishEvents** - Publish domain events
6. **transformToResponse** - Ensure response matches contract

```typescript
// Create runtime from definition
const runtime = new BusinessFunctionRuntime(functionDefinition);

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
  console.error('Error:', result.error?.message);
}
```

The runtime ensures:
- Immutable execution context and results
- Request/response validation
- Caller presence check for protected operations (permission enforcement deferred)
- Business rule enforcement
- Event publishing
- Error propagation with detailed context

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
- **required** - Field presence validation
- **range** - Min/max value validation
- **format** - Pattern/regex validation
- **custom** - Extension point for custom rules

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
- Execute in priority order (highest first)
- Are observational only (cannot prevent execution)
- Receive lifecycle events and context
- Can be enabled/disabled
- Propagate exceptions to caller

### Immutable Context & Results

All execution contexts and results are deeply immutable:

```typescript
const context = new BusinessFunctionContext({
  functionId: 'HR.LEAVE.APPLY',
  executionId: 'exec-001',
  correlationId: 'corr-001',
  moduleId: 'HR',
  request: { /* ... */ },
  caller: 'user-123',
  timestamp: new Date(),
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

// Register business function handlers for each step
const applyLeaveRuntime = new BusinessFunctionRuntime(applyLeaveFn);
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
- Executes workflow steps sequentially in order of `step.sequence`
- Implements fail-fast semantics: stops on first step failure
- Integrates with Phase 2 LifecycleManager for event dispatch
- Publishes 8 standard lifecycle events (beforeWorkflow, beforeStep, stepCompleted, stepFailed, afterStep, workflowCompleted, workflowFailed, afterWorkflow)
- Tracks execution state immutably via WorkflowContext
- Returns immutable WorkflowResult with complete outcome

#### Extension Point: executeBusinessFunction

Applications override the protected `executeBusinessFunction` method to customize request mapping:

```typescript
class CustomWorkflowEngine extends WorkflowEngine {
  protected async executeBusinessFunction(functionId: string, context: WorkflowContext) {
    // Map workflow context to business function request
    const request = {
      ...context.inputData,
      employeeId: context.entity.id,
      caller: context.caller,
    };

    // Execute via registered runtime
    const runtime = this.businessFunctionRuntimes.get(functionId);
    return await runtime.execute(request, context.caller);
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

Context is deeply immutable - all collections frozen, all updates return new derived context.

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

Result is deeply immutable for reliable audit trails.

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
    'afterStep',           // Step execution done (success or fail)
    'workflowCompleted',   // All steps succeeded
    'workflowFailed',      // Workflow stopped due to failure
    'afterWorkflow',       // Workflow done (success or fail)
  ],
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
- Error-level violations throw BusinessRuleViolation
- Warning-level violations logged but do not block
- Supports required, range, format, and custom rule types

#### ✓ LifecycleManager Dispatches Events

Event handler management:
- Handler registration with priority
- Event dispatch in priority order
- Observational execution (cannot prevent flow)
- Exception propagation from handlers

#### ✓ Context & Results Immutable

All execution contexts and results:
- Deeply immutable via Object.freeze()
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

- 31 CLI command tests
- 20 demo execution tests
- All 164 tests passing (Phase 1+2+3+4)

#### ✓ Build and Lint Pass

- npm run build: 0 errors
- npm run lint: 0 errors
- TypeScript strict compilation passes

## Next Steps (Phase 5+)

Phase 4+ will implement:
- Workflow persistence and state management
- Retry logic and error recovery
- Compensation and rollback mechanisms
- Parallel and conditional step execution
- Human task and approval workflows
- CLI tools (wbf doctor, list, show, make, register, demo)
- Framework adapters (Express, NestJS, Fastify)
- Demo implementations (Hospital Audit, Employee Onboarding)

## Cross-Implementation Compatibility

This Node implementation maintains portable contracts identical to the Laravel implementation:

- Same entity contracts
- Same module governance model
- Same business function execution semantics
- Same validation rule scopes
- Same workflow definition structure
- Same registry universal pattern
- Same error categories

## License

Apache-2.0

## Authors

WaysNX

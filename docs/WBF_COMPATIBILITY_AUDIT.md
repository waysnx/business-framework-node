# WBF Compatibility Audit – Node.js Runtime

| | |
|---|---|
| Status | Draft – for review |
| Date | 2026-10-31 |
| Audited | `main` @ `d2866ed` (`package.json` 0.4.0, untagged) |
| Consolidated audit | primary repo `docs/audit/REPOSITORY_AUDIT.md` (finding IDs `NOD-*`, `XR-*`) |
| Capability matrix | primary repo `docs/architecture/IMPLEMENTATION_CAPABILITY_MATRIX.md` |

This document lists how the Node runtime departs from the WBF specification and the proposed core contracts, and the planned fix for each. **No production code was changed by this audit.**

## Phase 0 status (2026-10-31, branch `phase0/m0-remediation`, uncommitted)

| Finding | Status | Evidence |
|---|---|---|
| NOD-01 error prototype chain | **Fixed.** `WBFError` uses `new.target.prototype`; invalid requests are `validation_failure` / `ValidationError` | `src/__tests__/phase0-remediation.test.ts` › NOD-01 (10). `runtime.test.ts` regex assertion replaced with exact assertions. BF-002 |
| NOD-02 workflow sequence | **Fixed.** Steps sorted by `sequence`; duplicate sequence/step IDs fail before execution | › NOD-02 (7). WF-001…007 |
| NOD-03 authorization | **Fixed (fail closed).** `Authorizer` / `AuthorizationDecisions`; caller values are not proof. API provisional (ADR-0010). Status stays `failure` + `AuthorizationError` until ADR-0009 | › NOD-03 (13). AUTH-001…004, BF-003 |
| NOD-06 `null` input | **Fixed.** Structured `validation_failure`; lifecycle `functionFailed` fires | › NOD-06 (3). BF-002 |
| NOD-07 lifecycle enablement | **Fixed.** Unspecified `enabled` ⇒ enabled (documented); non-boolean `enabled`/`priority` rejected; README corrected | › NOD-07 (5). LC-001…003 |
| NOD-04 (part) custom/unknown rules pass | **Fixed.** Fail closed; `evaluateCustom()` protected extension point; `ValidationIssue.code` | › Validation (14). VAL-004 |
| NOD-04 (rest): warnings dropped in BF result, scope = moduleId | Open (M4) | — |
| NOD-14 coverage | Investigated. Branches 60.99 % → 63.96 %, still below 70 % (threshold unchanged) | Phase 0 completion report |
| Others | Unchanged in Phase 0 | — |

## Phase 0.1 status (2026-11-01, same branch, uncommitted)

Supersedes the Phase 0 rows above where they differ.

| Finding | Status | Evidence |
|---|---|---|
| XR-02 / D1 result statuses | **Done (breaking).** Statuses replaced directly: `success`, `validation_failure`, `authorization_failure`, `not_found`, `business_rule_failure`, `execution_failure`. `BusinessFunctionResult` rejects other values. `BusinessFunctionRuntime.classify()`. `ResponseValidationError`, missing handler and registry `NotFoundError` → `execution_failure` | `phase0-remediation.test.ts` › D1 (10), `runtime.test.ts`. BF-001…007, AUTH-001…004 |
| NOD-03 authorization API | **Final** (ADR-0010 accepted 2026-11-01). Status is now `authorization_failure` | — |
| D8 workflow sequence | **Done.** `WorkflowDefinitionError` (`missing_sequence`, `invalid_sequence`, `negative_sequence`, `duplicate_sequence`); non-integers rejected; duplicates rejected when `WorkflowDefinition` is constructed; engine check retained | › NOD-02 / D8 tests. WF-003, WF-004, WF-008…010 |
| Conformance | **33/33**, no known differences; strict mode `WBF_CONFORMANCE_REQUIRED=1` | `docs/CONFORMANCE_TESTING.md` |
| NOD-14 coverage | Branches **64.94 %** (283 tests), below 70 %: the coverage gate **fails**. Threshold unchanged. Lowest: `cli/bin.ts` 0 %, `registries/BusinessFunctionRegistry.ts` 15 %, `cli/demo/auditDemo.ts` 20 %, `registries/Registry.ts` 24 %, `registries/EntityRegistry.ts` 25 %, `runtime/BusinessFunctionContext.ts` 29 % | `npx jest --coverage` |
| Dev-dependency advisories | **Assessed, not changed** (no upgrades authorized): `docs/DEV_DEPENDENCY_ADVISORY_ASSESSMENT.md` | — |
| Authorizer throwing (review R-2b) | A throwing `Authorizer` is `execution_failure`, never `authorization_failure`; explicit `deny()` and `AuthorizationError` remain `authorization_failure` | › "authorization has no exception fallback" (4) |
| BF-ERR-03 messages (ADR-0009 A1) | `execution_failure` carries only the safe message + `errorReference`; `error` non-enumerable and never serialized; `setErrorReporter()` (default `console.error`) receives the original error; workflow step errors use the public message | › "ADR-0009 amendment" (10) |

## 1. Test baseline (audit, before Phase 0)

| Command | Result |
|---|---|
| `npm ci` | OK. Deprecated transitive packages: `inflight@1.0.6`, `glob@7.2.3` |
| `npm run lint` (`tsc --noEmit`) | OK |
| `npm run build` | OK |
| `npm test` | 7 suites, **164 / 164 passed** |
| `npx jest --coverage` | Statements 77.81 %, **branches 60.99 %** (below the configured 70 % threshold), functions 81.35 %, lines 81.97 %. CI runs `npm test` without `--coverage`, so the threshold is never enforced |
| `npm audit --omit=dev` | 0 vulnerabilities. Full audit not completed (registry unreachable) |

## 2. Conformance against `specification/foundation/WBF-SPEC-0005` (Business Function)

| Requirement | Status | Where |
|---|---|---|
| BF-ID-01…06 | ✔ `id`, `name`, `version`, `moduleId`, `domain`, `capability` (required, truthy check) | `src/definitions/BusinessFunctionDefinition.ts` L63-68 |
| BF-ID-07 lifecycle status | Partial: defaults to `'Draft'`, not validated against the value set | same |
| BF-META-01…03 description, owners | ✗ optional (`description` defaults to `''`) | same |
| §13 pipeline order | ✔ | `src/runtime/BusinessFunctionRuntime.ts` `execute()` |
| BF-VAL contract validation | ✗ object-type check only. `requestContract` is ignored | `validateRequest()` |
| BF-SEC authorization | ✗ caller presence only | `checkAuthorization()` |
| Event publication | ✗ returns the *declared* `eventsPublished` | `publishEvents()` |
| §21 categories | Partial: 5 of 8. `RequestValidationError` is misclassified (NOD-01) | `src/errors/*` |
| BF-ERR-02 distinguishable outcome | ✔ `BusinessFunctionResult.status`, except NOD-06 | — |

## 3. Findings and planned fixes

### P1

**NOD-01 – Execution errors lose their prototype** (`src/errors/WBFError.ts` L22, `src/errors/ExecutionError.ts`)
- **Current behavior:**
  - `WBFError` calls `Object.setPrototypeOf(this, WBFError.prototype)`.
  - Subclasses that do not reset the prototype become plain `WBFError`s. This affects `ExecutionError`, `RequestValidationError`, `ResponseValidationError`, `ExecutionTimeoutError` and `HandlerNotFoundError`.
  - Reproduced: `new RequestValidationError('x') instanceof RequestValidationError === false`.
  - Reproduced: `execute('abc')` returns `status: 'failure'`, category `RequestValidationError`, when it should return `validation_failure`.
  - `src/__tests__/runtime.test.ts` L104 (`toMatch(/validation_failure|failure/)`) hides the defect.
- **Fix:**
  ```ts
  // WBFError constructor
  Object.setPrototypeOf(this, new.target.prototype);
  ```
  - Remove the now-redundant per-subclass calls, which is optional.
  - Change the test to `toBe('validation_failure')`.
  - Map `RequestValidationError` to category `ValidationError`.
- **Breaking:** consumers that matched `failure` for bad requests will now see `validation_failure`. This is a bug fix, and it goes in the CHANGELOG.

**NOD-02 – Workflow ignores `sequence`** (`src/runtime/WorkflowEngine.ts` `execute()`)
- **Current behavior:** steps run in array order. Reproduced: steps `[s2:2, s1:1]` executed `B, A`.
- **Fix:**
  - Iterate `[...workflow.steps].sort((a, b) => a.sequence - b.sequence)`.
  - `WorkflowDefinition` rejects duplicate step `id`s and `sequence`s.
- **Test:** regression test, plus conformance scenario `WF-ORDER-001`.

| ID | Location | Issue | Planned fix |
|---|---|---|---|
| NOD-03 | `BusinessFunctionRuntime.checkAuthorization()` (private) | Any truthy caller passes declared permissions | Add an `authorizer?: (ctx, definition, request) => Promise<AuthorizationDecision>` runtime option. Fail closed when requirements are declared and no authorizer is configured. Opt-in flag for one minor release |
| NOD-04 | `src/runtime/ValidationFramework.ts` L82-119, L219-223; `BusinessFunctionRuntime.evaluateBusinessRules()` L229-254 | `custom` and unknown types pass. Warnings are dropped. Only validations with `scope === moduleId` run. Definition severity is ignored | See `docs/VALIDATION_IMPLEMENTATION_PLAN.md` |
| NOD-05 | `src/types/*` | No entity implementation, repository, persistence or transactions | See `docs/ENTITY_IMPLEMENTATION_PLAN.md` (blocked on ADR-0006) |
| NOD-19 | `BusinessFunctionContext` | No `actor` or `tenant` | Add optional `actor` and `tenant` fields per CORE_CONTRACTS §3. `caller` stays and maps to `actor.id` |

### P2

| ID | Location | Issue | Planned fix |
|---|---|---|---|
| NOD-06 | `BusinessFunctionContext` constructor, called before the `try` in `execute()` | `execute(null)` **rejects** with a plain `Error` (reproduced) | Validate the request inside the `try` and return `validation_failure` |
| NOD-07 | `LifecycleManager.dispatch()` L155 | A handler registered without `enabled: true` is silently skipped. The README example does this (reproduced) | Default to `enabled ?? true` and `priority ?? 0`. Make both properties optional in `LifecycleHandler` |
| NOD-08 | `WorkflowEngine`; `LifecycleEvent.ts` L40-61 | `afterStep` is not dispatched on failure. `afterFunction` and validation events are never dispatched. There is no `AFTER_STEP` constant | Align with CORE_CONTRACTS §6 |
| NOD-09 | `WorkflowEngine.executeBusinessFunction()` | Step executions get a fresh correlation ID | Pass `{ correlationId: context.correlationId }` as metadata |
| NOD-10 | `src/cli/commands/list.ts`, `show.ts`, `register.ts` L46-52 | Commands use fresh empty registries. `register` prints non-existent class names (`FunctionDefinition`, `FunctionRegistry`) | Map type → class names (`BusinessFunctionDefinition`, `BusinessFunctionRegistry`). Label `list` and `show` output as "no registry loaded" until an app-config loader exists |
| NOD-11 | `package.json` L3, `src/index.ts` L22, `src/cli/index.ts` L127, `src/cli/commands/doctor.ts` L22-26 | Version is 0.4.0 in some places, `'0.1.0'` and hard-coded strings in others. No git tag | Read the version from `package.json` at build time. Tag releases. **Version change needs approval** |
| NOD-12 | `README.md` | Stale `implementations/node` paths. Lists non-existent files. Claims parity with Laravel (L1178). Has examples that don't compile: private `businessFunctionRuntimes`, missing `priority`/`enabled`, a non-existent `timestamp` prop | README correction (documentation synchronization S1.5) |
| NOD-13 | `BusinessFunctionContext.ts` L35, `WorkflowContext.ts` L47 | Objects are shallow-frozen, but the README claims deep immutability | Deep-freeze cloned request data, or reword the README |

### P3

| ID | Issue | Planned fix |
|---|---|---|
| NOD-14 | Coverage thresholds are not enforced in CI | Add `--coverage` to CI once branch coverage is ≥ 70 % |
| NOD-15 | `executionId` uses `Math.random` and the deprecated `substr` | `crypto.randomUUID()` |
| NOD-16 | No `engines` field. `clean` uses `rm -rf`. devDependencies use caret ranges | `engines.node >= 18`. `clean` via `node -e "fs.rmSync('dist',{recursive:true,force:true})"`. Pin versions. **Package metadata change needs approval** |
| NOD-17 | Definitions and `LifecycleManager` throw plain `Error` | Throw `WBFError` subclasses (e.g. `DefinitionError`) |
| NOD-18 | `new RegExp(rule.pattern)` | Document that definitions are trusted code |
| NOD-20 | `actions/checkout@v7`, `actions/setup-node@v7` | Confirm the tags exist, or pin to known majors [unverified] |
| — | `SerializableInterface.toArray()` vs definitions' `toObject()` | Add `toObject` to the interface and keep `toArray` |

## 4. Intentional runtime-specific behavior (not violations)

- Business logic is attached through `registerHandler(fn)`. Laravel attaches it by subclassing.
- Definitions are frozen value objects, and the runtime returns result objects instead of throwing.
- The CLI `make` command prints scaffolds instead of writing files.
- `WBFError.category` is used as the error code.
- The core has zero runtime dependencies. This should be preserved.

## 5. Claims to correct

Replace the "Cross-Implementation Compatibility … identical to the Laravel implementation" section. The new text should state:

- the target WBF spec version
- the conformance suite version and its results
- a link to the capability matrix

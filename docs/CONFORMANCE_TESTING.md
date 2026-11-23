# Conformance Testing – Node.js Runtime

| | |
|---|---|
| Status | **Implemented.** ADR-0008 Accepted (2026-11-01). CI prepared, not active |
| Date | 2026-11-01 |
| Fixtures (owned by Core) | `waysnx-business-framework/tests/conformance/` (suite 0.1.0, 33 fixtures, `suite.json`, `fixture.schema.json`) |
| Strategy and normalization rules | Core `docs/architecture/CROSS_RUNTIME_CONFORMANCE.md` |

## 1. What it does

This runtime executes the shared, technology-independent fixtures with **Jest**. No new test framework or dependency is used.

| File | Purpose |
|---|---|
| `src/__tests__/conformance.test.ts` | Adapter. A suite-integrity test against `suite.json`, then one test per fixture in manifest order. Drivers for validation, workflow, business-function, authorization and lifecycle |
| `src/__tests__/conformance-known-differences.json` | Fixture IDs this runtime does not yet satisfy. Currently **empty** |
| `.github/workflows/conformance.yml` | CI job, pinned to Core `conformance-v0.1.0`. Manual trigger only until the tag exists |

The adapter is a `*.test.ts` file under `__tests__`, so it is:

- excluded from the TypeScript build (`tsconfig.json` excludes `**/*.test.ts`). Verified: `dist/` contains no `__tests__`
- excluded from coverage (`jest.config.js` excludes `__tests__`)
- not published (`package.json` `files: ["dist"]`)

## 2. Running

```bash
# Default: sibling checkout ../waysnx-business-framework/tests/conformance/fixtures
npx jest src/__tests__/conformance.test.ts

# Explicit location, strict mode (as in CI) and a JSON report
WBF_CONFORMANCE_FIXTURES=/path/to/waysnx-business-framework/tests/conformance/fixtures \
WBF_CONFORMANCE_REQUIRED=1 \
WBF_CONFORMANCE_REPORT=/tmp/node-conformance.json \
  npx jest src/__tests__/conformance.test.ts
```

| Fixtures found? | `WBF_CONFORMANCE_REQUIRED` | Result |
|---|---|---|
| no | unset | One skipped test naming the expected path. `npm test` and `ci.yml` stay green |
| no | `1` | **Fails** with `CONFIGURATION ERROR: …` |
| yes | either | Integrity check, then every fixture |

## 3. Known differences

Listed fixtures run as `test.failing`: they must still fail. If a listed fixture starts passing, the test fails, so the list stays accurate. Unlisted failures fail normally.

Current list (2026-11-01): **empty**.

## 4. Result (2026-11-01)

33 fixtures: **33 pass, 0 known differences**, plus the integrity test. The normalized outcomes are identical to the Laravel runtime's for all 33.

Negative controls (temporary fixture copies): duplicate ID, empty `expected`, disallowed status, wrong expectation and `fixtureCount` mismatch each made the adapter fail. A missing checkout with `WBF_CONFORMANCE_REQUIRED=1` failed with `CONFIGURATION ERROR`.

Passing suite 0.1.0 does **not** establish general parity. It covers narrow slices of validation, workflow sequencing, Business Function results, authorization and lifecycle enablement.

## 5. How native outcomes are read (CROSS_RUNTIME_CONFORMANCE §6)

| Contract | Native source | Normalization |
|---|---|---|
| Business function, authorization | `BusinessFunctionResult.status`; `error.context.reason` → `authorizationReason` | None. Statuses are native D1 values |
| Workflow | `WorkflowResult`; construction errors | `WorkflowDefinitionError` / `DuplicateError` → `definition_rejected`; any other construction error propagates. Error messages → kinds `duplicate_sequence`, `duplicate_step_id`, `function_not_registered`, `step_failed`, otherwise `unclassified` |
| Validation | `ValidationIssue` | `{ruleId: context.ruleId, field: context.field, code}` grouped by severity |

The Phase 0 status mapping (`rule_failure` → `business_rule_failure`, `failure` + category → …) was removed when the runtime adopted the D1 statuses (WBF-SPEC-0006).

## 6. CI

`.github/workflows/conformance.yml`:

- checks out `waysnx/waysnx-business-framework` at `conformance-v0.1.0` into `wbf-core/`
- sets `WBF_CONFORMANCE_REQUIRED=1` and `WBF_CONFORMANCE_FIXTURES`
- fails with `CONFIGURATION ERROR` if `suite.json` is missing
- runs `npx jest src/__tests__/conformance.test.ts` and uploads the JSON report

Trigger: `workflow_dispatch` only. To activate after the Core commit and tag exist, add the `push` / `pull_request` triggers used by `ci.yml`.

# Validation Implementation Plan – Node.js Runtime

| | |
|---|---|
| Status | Plan – pending ADR-0007 |
| Date | 2026-10-31 |
| Architecture | primary repo `docs/architecture/VALIDATION_ARCHITECTURE.md`, `decisions/ADR-0007-Validation-Responsibility-Split.md` |

## 1. Starting point (verified)

- `ValidationFramework.evaluate(request, scope)` runs every enabled `ValidationDefinition` with a matching `scope`.
- Rule types (`evaluateRule`, L82-119):
  - `required` fails on `null`, `undefined` and `''`.
  - `range` checks a number or `.length` against `min`/`max`.
  - `format` uses `new RegExp(pattern)`.
  - `custom` is a **no-op pass** (L219-223).
  - **Unknown types pass** (L106-108).
- Severity comes from each rule's `severity`, defaulting to `error`. `ValidationDefinition.severity` is ignored.
- A rule that throws becomes an `error` issue.
- `BusinessFunctionRuntime.evaluateBusinessRules()` (L229-254):
  - uses `scope = definition.moduleId`, so validations scoped to an entity name never run from the runtime
  - throws `BusinessRuleViolation` with the first error message and attaches all issues in its context
  - discards warnings
- `validateRequest()` does not use `ValidationFramework` (L1 contract validation is missing).
- `ValidationIssue` has `validationId`, `severity`, `message` and `context`. It has no `code`, `path` or `ruleId`.

## 2. Target

The Node runtime implements the canonical vocabulary (VALIDATION_ARCHITECTURE §5) in its built-in evaluator, with no new dependencies. It returns canonical issues, fails closed, and enforces L1 contract validation in the BF pipeline.

## 3. Work items

| # | Item | Detail | Breaking? |
|---|---|---|---|
| V1 | Evaluator vocabulary | Add `type`, `minLength`, `maxLength`, `min`, `max`, `pattern`, `format` (email, uuid, date, datetime, uri), `enum` and `compare`. Keep `range` and `format`-as-regex as deprecated aliases. `required` also fails on `[]`. Non-`required` rules skip `null`/`undefined` (§4.8) | Partly: `range`/`format` on `undefined` now skip. **Decision required** |
| V2 | `ValidationIssue` | Add `code`, `path` and `ruleId`. Keep `context` | No |
| V3 | Fail closed | Unknown rule type produces an error issue `WBF.VALIDATION.UNKNOWN_RULE`. A `strict` option on `ValidationFramework` defaults to warn for one minor release | Yes (behavior) |
| V4 | `CustomRuleRegistry` | `{ rule: 'custom', name }` is resolved through `registerCustomRule(name, fn)`. An unregistered name fails closed | Yes for current `custom` users (currently a no-op) |
| V5 | Severity precedence | Rule severity first, then definition severity, then `error` | Minor |
| V6 | Explicit BF binding | `BusinessFunctionDefinition.validationRules` (canonical rules, L1) are evaluated in `validateRequest()`. `validationIds[]` (L2/L3) are evaluated in `evaluateBusinessRules()`. Implicit `scope === moduleId` stays as a deprecated fallback | No (additive, with fallback) |
| V7 | Warnings in result | Add `BusinessFunctionResult.issues[]` carrying warnings and info issues. Status is unaffected | No |
| V8 | Classification | L1 failures produce `validation_failure` / `ValidationError`, which depends on fix NOD-01. L3 failures produce `rule_failure` / `BusinessRuleViolation` | Fix |
| V9 | Evaluator exception | Reported as `InternalSystemError`, not as an issue | Yes (behavior). Aligns with Laravel |
| V10 | Lifecycle events | Dispatch `beforeValidation`, `validationCompleted`, `validationFailed` and `afterValidation` (NOD-08) | No |
| V11 | Engine port (optional) | `ValidationEngine` interface so applications can plug in JSON-Schema or other engines. Not a core dependency | No |

## 4. Tests

- **Unit:** one test per canonical rule, with boundaries (length 5/6, range 0/1/10/11), nullable semantics, severity precedence, fail-closed in strict and non-strict mode, and the custom registry.
- **Runtime:**
  - Warnings surface in `result.issues`.
  - L1 failures give `validation_failure`.
  - Replace the `runtime.test.ts` L104 regex with exact status assertions.
- **Conformance:** every `VAL-*` scenario and `BF-VAL-001/002/003` (CROSS_RUNTIME_CONFORMANCE §7).

## 5. Decisions required

1. Default value of `strict` in the first release.
2. Whether `range` and `format` keep their current semantics as aliases, or follow the new vocabulary exactly.
3. Whether `undefined` values skip non-required rules (Laravel-aligned) in this release.

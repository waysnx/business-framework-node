# Development Dependency Advisory Assessment – Node.js Runtime

| | |
|---|---|
| Status | Investigation only (approved 2026-11-01). **No dependency, version or lockfile change was made** |
| Date | 2026-11-01 |
| Scope | The 23 entries reported by `npm audit` (4 low, 17 moderate, 1 high, 1 critical) |
| Environment | Node v24.12.0 locally; CI uses Node 20. `package.json` 0.4.0, lockfile as committed on this branch |
| Related | Core `docs/audit/SECURITY_FOLLOW_UP.md` (S-06) |

## 1. Summary

- **Runtime exposure: none.** The package has zero runtime dependencies. `npm audit --omit=dev` reports 0 vulnerabilities, and `package.json` `files: ["dist"]` publishes only compiled sources.
- **The 23 entries come from 4 vulnerable packages.** The other 19 are Jest and ts-jest packages that `npm audit` lists only because they depend on one of the four (`via` chains). They have no advisory of their own.
- **The critical and high findings can be cleared without changing `package.json`.** Three in-range lockfile updates do it: `handlebars` 4.7.9 → 4.7.10, `brace-expansion` 1.1.18 → 1.1.21 and `ts-jest` 29.4.12 → 29.4.15. These are what `npm audit fix` (without `--force`) would apply. I trialled them in an isolated sandbox: lint, build and all 283 tests pass, coverage is unchanged and the audit drops to 21 (4 low, 17 moderate, 0 high, 0 critical).
- **The remaining moderate and low findings need a Jest major upgrade** (or have no fix at all). Those are `minimatch` < 11.0.1 through `glob@7` / `test-exclude@6`, and `deepmerge` 4.3.1 (no patched release). `npm audit` suggests `jest@25.1.0`, which would be a downgrade; that suggestion is not usable.
- **Correction to earlier reports.** Phase 0 and the first Phase 0.1 report said `handlebars` came in "via Jest coverage reporting". That is wrong: it is a direct dependency of `ts-jest`, used only by the `ts-jest config:init` CLI.

## 2. Root advisories

| Package (installed) | Severity | Advisories | Dependency path | Used when | Exploitability here |
|---|---|---|---|---|---|
| `handlebars` 4.7.9 | **critical** | GHSA-8r5x-fm3f-whwj (critical, JS injection via AST type confusion in `compile`, CVSS 9.8); GHSA-p8wg-vrv2-v86f (critical, own-property check bypass); GHSA-xw65-4hp5-5hc7 (moderate, unsafe inline embedding of precompiled templates) | `ts-jest@29.4.12` → `handlebars` | Only `npx ts-jest config:init` (`ts-jest/dist/cli/config/init.js`). Not loaded by `jest`, `npm test`, `--coverage`, the build or the published package | Requires attacker-controlled templates passed to Handlebars. ts-jest compiles its own bundled template. **Not reachable** in this project's workflows |
| `brace-expansion` 1.1.18 | **high** | GHSA-qhr7-859c-m2p7 and GHSA-6j4f-fj2g-mc7p (high, stack exhaustion DoS); GHSA-q2hr-2g5m-vwhr (moderate, quadratic-time DoS) | `jest` → `@jest/core` → `@jest/reporters` → `glob@7.2.3` → `minimatch@3.1.5` → `brace-expansion`; also `ts-jest` → `@jest/transform` → `babel-plugin-istanbul` → `test-exclude` → `minimatch` | Test and coverage runs, expanding glob patterns from `jest.config.js` and Jest CLI arguments | Needs attacker-controlled glob patterns. The patterns come from the repository's own config. Worst case is a DoS of a developer or CI test run. **Low** |
| `minimatch` 3.1.5 | moderate | GHSA-g3hv-75wg-m249 (DoS via glob-parts amplification), range < 11.0.1 | as above (`glob@7`, `test-exclude@6`) | Same | Same, **low** |
| `deepmerge` 4.3.1 | low | GHSA-gcqx-w48m-w2h4 (prototype poisoning of the returned object) | `jest` → `@jest/core` → `jest-config` → `deepmerge` | Merging Jest configuration objects | Needs attacker-controlled Jest config, which already means arbitrary code execution through Jest. **Not meaningful**. No patched release exists |

Propagated-only entries (no advisory of their own): `@jest/core`, `@jest/expect`, `@jest/globals`, `@jest/reporters`, `@jest/transform`, `babel-jest`, `babel-plugin-istanbul`, `glob`, `jest-circus`, `jest-config`, `jest-resolve-dependencies`, `jest-runner`, `jest-runtime`, `jest-snapshot`, `test-exclude`, `ts-jest` (also direct), `create-jest`, `jest`, `jest-cli`.

## 3. Execution contexts

| Context | Affected packages loaded? |
|---|---|
| Consumers installing `@waysnx/business-framework` | **No.** Dev dependencies are not installed for consumers, and there are no runtime dependencies |
| `npm run build` (`tsc`) | No (TypeScript only) |
| `npm test`, `npx jest --coverage`, CI `ci.yml`, the prepared `conformance.yml` | Yes: `glob`, `minimatch`, `brace-expansion`, `deepmerge`. Inputs are repository-controlled |
| `npx ts-jest config:init` | Yes: `handlebars`. Not part of any script or workflow |
| CI secrets | `ci.yml` uses `permissions: contents: read` and no secrets. A test-time DoS cannot exfiltrate anything |

## 4. Upgrade options

| Option | Changes | Clears | Regression risk | Evidence |
|---|---|---|---|---|
| **A. In-range lockfile refresh** (`npm audit fix`, no `--force`) | `package-lock.json` only: `handlebars` 4.7.10, `brace-expansion` 1.1.21, `ts-jest` 29.4.15. `package.json` unchanged | critical (1) + high (1) → 23 → 21 | Low. Patch/minor releases within existing ranges. `ts-jest` 29.4.15 peers allow Jest 29 and TypeScript < 7 | Sandbox trial with the generated lockfile: `npm ci` OK, `tsc --noEmit` OK, build OK, **283/283 tests**, coverage identical (branches 64.94 %), audit 21 (0 high, 0 critical). The repository lockfile was verified unchanged afterwards |
| **B. Jest 30 major** (`jest@^30`, `@types/jest@^30`, keep `ts-jest@29.4.15`, which peers `^29 \|\| ^30`) | `package.json` devDependencies + lockfile | Expected to remove `glob@7` / `minimatch@3` from the Jest 29 chains. **Not verified.** `test-exclude@8` still depends on `minimatch@^10`, which is still inside the advisory range (< 11.0.1), so some moderate entries may remain | Medium. Jest 30 drops Node < 18.14, changes some matcher, snapshot and config defaults, and changes `jest.config.js` handling. CI uses Node 20 (supported) | Not trialled. Needs a separate branch and a full run |
| C. `overrides` to force `minimatch@^11` / `glob@^13` under Jest 29 | `package.json` `overrides` + lockfile | Possibly the moderate `minimatch`/`glob` entries | High. Forces majors under packages that did not declare support for them | Not recommended |
| D. Accept the remaining moderate/low entries | None | — | None | Justified by §2/§3: dev-only, repository-controlled inputs |

`deepmerge` stays flagged under every option: 4.3.1 is the latest release.

## 5. Recommendation (for approval, not applied)

1. Approve **option A** as a separate, single-purpose commit that touches only `package-lock.json`. It removes the critical and high entries with verified no regression.
2. Assess **option B** in its own branch as part of M3 tooling work, with a full test, coverage and conformance run. Accept the residual moderate/low entries (option D) until then.
3. Add `npm audit --omit=dev --audit-level=high` to CI so that any future runtime-dependency advisory fails the build. Dev-only advisories would not fail it.

## 6. Reproduction

```bash
npm audit --json                     # 23 entries
npm audit --omit=dev                 # 0 vulnerabilities
npm ls handlebars brace-expansion minimatch deepmerge --all
# Option A trial, in a scratch copy of package.json + package-lock.json only:
npm audit fix --package-lock-only --ignore-scripts
```

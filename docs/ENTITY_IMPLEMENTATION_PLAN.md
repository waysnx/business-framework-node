# Entity Implementation Plan – Node.js Runtime

| | |
|---|---|
| Status | **Plan only – blocked until ADR-0006 is accepted** |
| Date | 2026-10-31 |
| Architecture | primary repo `docs/architecture/ENTITY_ARCHITECTURE.md`, `decisions/ADR-0006-Entity-Contract-and-Runtime-Realization.md` |

## 1. Starting point (verified)

The type interfaces are:

- `EntityInterface extends SerializableInterface`: `getEntityId(): string | number`, `getEntityType()`, `getEntityVersion(): number`, `toArray()`, `toJson()`
- `AuditableInterface`: created and updated At/By, with setters. It has **no delete fields**.
- `VersionableInterface`: `getVersion()`, `incrementVersion()`, `isVersion()`
- `MetadataInterface`

Nothing in `src/` implements these interfaces.

`EntityDefinition(id, name, displayName, moduleId, version: number, enabled, tags, metadata)` has no attributes.

There is no repository, persistence adapter, or transaction handling. `dependencies` is `{}`.

## 2. Principles

1. Entities are plain objects or application classes, and no WBF base class is required. This is composition, per spec WBF-SPEC-0003 AP-03.
2. Core keeps **zero runtime dependencies**. ORM adapters ship as separate packages with peer dependencies.
3. Lifecycle, audit, tenancy and revision guarantees are enforced by the repository port.
4. The in-memory adapter is the reference implementation for conformance.
5. Every phase lands with Jest tests and the `ENT-*` conformance scenarios.

## 3. Phases

### N-E0: Interface hygiene (additive)
- `AuditableInterface`: add optional `getDeletedAt?()`, `getDeletedBy?()` and `isDeleted?()`.
- `SerializableInterface`: add `toObject()`, keeping `toArray()` for backward compatibility.
- No behavior change.

### N-E1: Contracts and definitions

| New export | Responsibility |
|---|---|
| `Entity` (interface) | `entityType: string`, `entityId: string`, `revision: number`, audit fields (`createdAt`, `createdBy`, `updatedAt`, `updatedBy`, `deletedAt?`, `deletedBy?`), `attributes: Record<string, unknown>` |
| `AttributeDefinition` | `name`, `type` (canonical), `required`, `nullable`, `default`, `writable`, `sensitive`, `rules[]` |
| `EntityDefinition` (extended) | Optional `attributes`, `softDelete`, `audit`, `timestamps`, `identity: 'uuid' \| 'assigned'` |
| `EntityRepository<T extends Entity>` | `findById`, `getById` (throws `ResourceNotFound`), `save`, `delete`, `restore`, `findBy(criteria, page, sort)`, each taking an `ExecutionContext` |
| `TransactionManager` | `run<T>(ctx, fn: (txCtx) => Promise<T>): Promise<T>` |
| `Clock` | `now(): Date`. Injectable |
| `ConcurrencyError` | category `ConcurrencyError` |
| `createEntity(definition, data, ctx)` helper | Applies defaults, drops or rejects undeclared and non-writable attributes, validates (L2), and sets identity |

### N-E2: Reference adapter in core
- `InMemoryEntityRepository`, which implements:
  - soft delete
  - revision checks
  - audit fields taken from `ctx.actor`, never from the payload
  - tenant scoping by `ctx.tenant`
  - lifecycle events `before*` and `after*` through `LifecycleManager`
- `InMemoryTransactionManager`, using a snapshot and rollback approach.
- Tests: unit tests, plus conformance scenarios `ENT-ID-001`, `ENT-SD-001`, `ENT-REV-001`, `ENT-AUD-001` and `ENT-MA-001`.

### N-E3: Prisma adapter (separate package `@waysnx/business-framework-prisma`)
- `peerDependencies`: `@prisma/client` and `@waysnx/business-framework`.
- `PrismaEntityRepository`:
  - optimistic update via `updateMany({ where: { id, revision } })` with a count check, which raises `ConcurrencyError`
  - soft delete via a `deletedAt` filter
  - tenant `where` injection
- `PrismaTransactionManager` uses `prisma.$transaction(async tx => …)` and passes the transactional client through the context.
- Tests: SQLite Prisma test schema in the adapter package only.
- *Decision required on timing (ENTITY_ARCHITECTURE §7.5).*

### N-E4: Business Function integration
- `BusinessFunctionRuntime` gets an optional `transactionManager`. When set, *execute* and *state changes* run inside `run()`, and events are published after the commit.

## 4. Breaking-change assessment

| Change | Breaking? |
|---|---|
| New interfaces, helper, reference adapter | No |
| `EntityDefinition` optional fields | No |
| `EntityDefinition.version` number → SemVer string (CORE_CONTRACTS §10) | **Yes. Needs approval**, and may be deferred |
| `EntityInterface.getEntityId(): string \| number` → canonical string | Kept as is. The canonical serializer stringifies |

## 5. Decisions required

| # | Decision |
|---|---|
| D1 | Prisma adapter in the next milestone, or only the in-memory reference adapter |
| D2 | Whether integer identities are allowed (serialized as strings) |
| D3 | Whether `EntityDefinition.version` changes type |

<!-- repository: services/tenant | kind: SERVICE | stack: nestjs -->

# tenant — Skill: Service Development

> Workflow for tenant (services/tenant). Execute this workflow before, during, and
> after changes in this repository.

## Repository Facts

- Kind: Service
- Package: `tenant-service` (version: 1.0.0)
- Runtime: Node >=25.8.2 (pnpm >=10.33.0)
- Description: Omnixys Tenant Service – tenant management and lifecycle.
- Architecture: src/app.module.ts, config, health, prisma, tenant
- Database: PostgreSQL via Prisma (prisma/schema.prisma); Migrations: Prisma Migrate (prisma:migrate / generate / validate)
- API: GraphQL (NestJS Apollo Federation)
- Messaging: Kafka (kafkajs + @omnixys/kafka-ts)
- Tests: node --test test/*.test.mjs (unit, error-contract); test:helm references deploy/helm/tenant-service


## Workflow

### 1. Understand the change

- Identify the affected bounded context within `src/app.module.ts, config, health, prisma, tenant`.
- Inspect consumers of the GraphQL operations and Kafka events you may touch.
- Never weaken authentication or authorization to make a test pass.

### 2. Implement

- Follow the existing module layout and naming conventions.
- Reuse `omnixys/packages` (shared contracts, cache, kafka, observability, security, ...)
  before reimplementing shared infrastructure.
- Keep tenant isolation intact (`Tenant lifecycle is the platform-wide tenancy root; changes ripple across all services.`).

### 3. Write tests

- Unit tests exercise isolated business behavior.
- Integration tests cover repository/Prisma, GraphQL, Kafka, and auth boundaries.
- Cover tenant-isolation and error-contract cases when the code path touches them.

### 4. Validate

## Validation

Run each applicable check and record the result as `PASS`, `FAIL`, `PRE-EXISTING
FAILURE`, or `NOT RUN` (with a reason). Never convert `NOT RUN` into `PASS`.

  - `pnpm install --frozen-lockfile`
  - `pnpm format:check`
  - `pnpm exec eslint "{src,apps,libs,test}/**/*.ts"  (check-only)`
  - `pnpm run typecheck`
  - `pnpm run test:unit`
  - `pnpm build`
  - `pnpm test`

## Commit

- Use Conventional Commits (`<type>(<scope>): <summary>`), e.g. `feat`, `fix`, `refactor`, `test`, `docs`, `build`, `ci`, `perf`.
- Stage only files belonging to the logical change. Run `git diff --check` before committing.
- Commit locally; never push.

## Definition of Done

See the "Definition of Done" section in `AGENTS.md`. Before finishing, confirm
`AGENTS.md` and `SKILL.md` remain accurate for this repository.

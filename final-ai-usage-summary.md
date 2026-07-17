# Final AI Usage Summary

## Tool Used

**Kiro** — AI-powered development environment with spec-driven workflow, task management, and code generation capabilities.

## Usage Statistics

| Metric | Value |
|--------|-------|
| Total spec requirements | 25 (including testing, docs, infra) |
| Acceptance criteria | ~120 individual criteria |
| Correctness properties | 25 formal properties |
| Implementation tasks | 56 leaf tasks in dependency DAG |
| Test files generated | 15 (property + integration + unit + frontend) |
| Documentation files | 12 (design, API, debugging, workflow, etc.) |

## AI Involvement by Artifact

| Artifact | AI Generated | Human Reviewed/Modified |
|----------|-------------|------------------------|
| Requirements (EARS format) | ✅ Initial draft | ✅ Refined, gap-filled |
| Design document | ✅ Architecture, data models, properties | ✅ Validated decisions |
| Task breakdown + DAG | ✅ Generated from design | ✅ Reviewed ordering |
| Backend code (routes, services, repos) | ✅ Layer-by-layer | ✅ Reviewed patterns |
| Frontend code (pages, stores, components) | ✅ Generated | ✅ Reviewed UX logic |
| Database migrations | ✅ Generated from schema | ✅ Verified constraints |
| Property-based tests | ✅ From correctness properties | ✅ Validated coverage |
| Integration tests | ✅ From test matrix in requirements | ✅ Verified scenarios |
| Docker/CI configuration | ✅ Generated | ✅ Tested manually |
| Documentation | ✅ Generated from implementation | ✅ Verified accuracy |

## Key AI Contributions

### High Value (AI excels here)
- Translating informal requirements into formal EARS-format acceptance criteria
- Generating boilerplate code that follows established patterns
- Property-based test derivation from formal correctness properties
- Maintaining consistency across 56 implementation tasks
- Producing comprehensive API contracts and data model documentation

### Medium Value (AI assists, human drives)
- Architectural decisions (AI proposes, human validates trade-offs)
- Error handling patterns (AI generates, human verifies edge cases)
- Debugging (AI analyzes, human confirms root cause)

### Low Value (Human needed)
- Deciding which requirements are in/out of scope
- Choosing between architectural trade-offs (ORM vs raw SQL, session vs token)
- Manual testing of UX flows and accessibility
- Docker/CI troubleshooting in specific environments
- Validating that AI-generated tests actually test the right thing

## Information Boundaries

### Shared with AI
- All source code and configuration (excluding .env values)
- Requirements, design documents, acceptance criteria
- Error messages, test output, stack traces
- Architecture decisions and constraints

### NOT Shared with AI
- Production credentials or JWT secrets
- Real user data or PII
- Internal infrastructure details
- Access tokens from live environments

## Lessons Learned

1. **Spec-first pays off** — Having formal requirements before coding eliminates ambiguity. AI generates much better code when it has precise acceptance criteria to implement against.

2. **Properties > examples** — Correctness properties catch more bugs than hand-written example tests. fast-check found edge cases (whitespace strings, boundary lengths, case collisions) that I wouldn't have thought to test.

3. **Layer-by-layer works** — Building bottom-up (DB → services → routes → UI) with each layer tested before moving up prevented cascading issues.

4. **AI needs guardrails** — Without scope control, AI suggests over-engineered solutions. The spec serves as a scope boundary: implement what's specified, nothing more.

5. **Review is non-negotiable** — AI-generated code passes tests but can have subtle issues (import ordering, async error propagation) that require human review of execution flow.

# AI Prompts — Documentation Phase

## Prompt 1: README Generation

**Context:** Task 14.1 — Project README and environment documentation.

**Prompt:**
> Create the project README with: overview, tech stack table, prerequisites, project structure, environment variables, getting started (clone → env → install → db setup → start), default users, available scripts, API endpoints, and ticket status lifecycle diagram.

**Outcome:** Comprehensive README.md covering all setup steps. Verified by following instructions from a clean state.

---

## Prompt 2: Design Documentation

**Context:** Task 14.2 — Architecture and design docs.

**Prompt:**
> Create design documentation covering: architectural decisions with rationale (docs/design-notes.md), ticket state machine lifecycle (docs/state-machine.md), authentication flow and middleware chain (docs/auth-design.md), and NFR checklist (docs/nfr-checklist.md).

**Outcome:** Four documentation files covering design decisions, state machine (with ASCII art diagram), auth flow (with sequence diagram), and NFR verification table.

---

## Prompt 3: OpenAPI Annotations

**Context:** Tasks 16.3-16.6 — JSDoc OpenAPI annotations.

**Prompt:**
> Add JSDoc OpenAPI annotations to all route files. Document request bodies, responses (success + error), query parameters, path parameters, and security requirements. Use reusable schemas defined in swagger.ts config.

**Outcome:** All route files annotated with `@swagger` JSDoc comments. Swagger UI at /api-docs renders the complete API documentation.

---

## Prompt 4: Tool Workflow Documentation

**Context:** Task 14.2 (tool-workflow.md requirement).

**Prompt:**
> Create tool-workflow.md documenting: primary AI tool (Kiro), how context is provided, AI usage by development phase, information practices (what is/isn't shared), and how to reuse this workflow in a real project.

**Outcome:** Structured workflow document with methodology table, reusable patterns, and information boundaries.

---

## Prompt 5: Submission Documents

**Context:** Final prep — creating assessment submission artifacts.

**Prompt:**
> Create and update all documents to match the required submission format: candidate-info.md, requirements-analysis.md, acceptance-criteria.md, implementation-plan.md, design-notes.md, api-contract.md, data-model.md, ui-flow.md, test-strategy.md, test-results.md, debugging-notes.md, code-review-notes.md, review-fixes.md, pr-description.md, reflection.md, final-ai-usage-summary.md.

**Outcome:** All submission templates populated with project-specific content, cross-referenced to implementation.

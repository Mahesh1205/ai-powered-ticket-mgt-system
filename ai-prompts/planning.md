# AI Prompts — Planning Phase

## Prompt 1: Initial Project Structure

**Context:** Starting the project from scratch, needed to establish spec-driven approach.

**Prompt:**
> As Sr full stack architect, I need to submit an assignment for review for this project. Provide me suggestions for the specs, steering, and other latest AIDLC ways of implementing AI based app, before jumping onto implementation.

**Outcome:** Kiro suggested spec-driven development workflow: Requirements → Design → Tasks, with steering files for code standards, agent hooks for quality gates, and property-based testing for formal correctness validation.

---

## Prompt 2: Spec Workflow Initiation

**Context:** After deciding on spec-driven approach, initiated the formal spec creation.

**Prompt:**
> [Provided full project requirements including domain model, state machine, API endpoints, testing matrix, seed data, and technology decisions]

**Outcome:** Kiro created the spec structure at `.kiro/specs/support-ticket-management/` with requirements.md, design.md, and tasks.md following the spec-driven development methodology.

---

## Prompt 3: Task Dependency Planning

**Context:** Needed to determine optimal implementation order across 56 tasks.

**Prompt:**
> Generate the task dependency graph with wave-based parallel scheduling for the implementation plan.

**Outcome:** DAG with 15 waves ensuring no task starts before its dependencies complete. Bottom-up ordering: database → auth → tickets → comments → users → frontend → tests → docs → infra.

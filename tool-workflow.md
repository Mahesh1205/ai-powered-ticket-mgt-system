# AI Tool Workflow

## Primary AI Tool

**Tool:** Kiro (AI-powered development environment)

Kiro is used as the primary AI assistant throughout the development lifecycle — from requirement analysis and architecture design to code generation, testing, and debugging.

## How Project Context Is Provided

1. **Spec-driven development** — A structured specification (requirements, design, and implementation tasks) is maintained in `.kiro/specs/`. This provides the AI with full project context including acceptance criteria, architectural decisions, and implementation constraints.

2. **Iterative context building** — Development proceeds task-by-task through the spec. Each task references specific requirements, ensuring the AI has focused context for each implementation step.

3. **File references** — When implementing a feature, relevant existing code (types, services, repositories) is read first so the AI understands current patterns and conventions.

4. **Acceptance criteria as contracts** — Each requirement has explicit, testable acceptance criteria that serve as unambiguous instructions for the AI.

## AI Usage by Development Phase

### Requirement Analysis
- AI assists in structuring user stories into formal acceptance criteria
- Identifies gaps, ambiguities, and edge cases in requirements
- Generates glossary terms and defines system boundaries
- Produces correctness properties that bridge specs to tests

### Planning and Design
- AI generates architectural decisions with rationale and trade-offs
- Produces data models, API contracts, and interface definitions
- Creates state machine definitions with transition tables
- Designs the testing strategy (unit, property-based, integration)

### Code Generation
- AI implements each layer following the spec's layered architecture
- Generates TypeScript types and interfaces from design documents
- Produces database migrations from the schema design
- Implements services, repositories, and routes per the defined patterns

### Validation and Testing
- AI writes property-based tests (fast-check) validating correctness properties
- Generates integration tests for API endpoints
- Writes unit tests for edge cases and specific scenarios
- Runs tests and iterates on failures

### Debugging
- AI analyzes error messages and stack traces
- Traces execution paths through the layered architecture
- Proposes fixes based on the spec's defined behavior
- Documents debugging sessions for knowledge retention

### Code Review
- AI validates implementation against acceptance criteria
- Checks for security concerns (SQL injection, credential exposure)
- Verifies architectural boundaries are maintained
- Ensures error handling follows the defined patterns

## Information Practices

### What Is Shared with AI Tools
- Source code and configuration (excluding secrets)
- Requirements, design documents, and acceptance criteria
- Error messages and test output
- Architecture decisions and constraints

### What Is NOT Shared with AI Tools
- Production credentials, API keys, or JWT secrets
- Customer data or personally identifiable information
- Internal infrastructure details (IP addresses, hostnames)
- Access tokens or session data from live environments

## Reusing This Workflow in a Real Project

### Setup Phase
1. Create a specification with requirements, design, and task breakdown
2. Define acceptance criteria for every requirement (make them testable)
3. Establish correctness properties that bridge specs to automated tests
4. Configure the AI tool with project context (file structure, conventions)

### Development Loop
1. Select the next task from the implementation plan
2. Provide the AI with relevant context (existing code, related requirements)
3. Generate implementation following established patterns
4. Write tests (property-based + unit) to validate against acceptance criteria
5. Run tests, fix issues iteratively
6. Move to the next task

### Quality Gates
- All property-based tests pass before marking a task complete
- Integration tests verify end-to-end flows
- NFR checklist is reviewed periodically
- Code review validates architectural boundaries

### Documentation
- Maintain design documents as living references
- Record debugging sessions for team knowledge
- Update the NFR checklist as requirements are met
- Keep the spec up to date as the system evolves

## Methodology Summary

| Phase | AI Role | Human Role |
|-------|---------|------------|
| Requirements | Draft and refine acceptance criteria | Review, approve, resolve ambiguities |
| Design | Generate architecture, interfaces, data models | Validate decisions, choose trade-offs |
| Implementation | Write code following spec and patterns | Review output, ensure quality |
| Testing | Generate tests from properties and criteria | Verify test coverage, run in CI |
| Debugging | Analyze errors, propose fixes | Confirm root cause, approve changes |
| Documentation | Generate from implementation | Review accuracy, add context |

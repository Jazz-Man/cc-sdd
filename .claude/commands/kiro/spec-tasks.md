---
description: Generate implementation tasks for a specification
allowed-tools: Bash, Read, Write, Edit, Update, MultiEdit
---

# Implementation Tasks

Generate detailed implementation tasks for feature: **$ARGUMENTS**

## Approval Gate: Requirements & Design Check

**CRITICAL**: Tasks can only be generated after both requirements and design are approved.

### Approval Status Check
- Spec metadata: @.kiro/specs/$ARGUMENTS/spec.json

**STOP HERE** if spec.json shows:
```json
"approvals": {
  "requirements": {
    "approved": false  // Must be true
  },
  "design": {
    "approved": false  // Must be true
  }
}
```

**Required Actions for Full Approval**:

### If Requirements Not Approved:
1. **Review requirements.md** - Read through the generated requirements thoroughly
2. **Edit if needed** - Make any necessary changes directly in the requirements.md file
3. **Manual approval required** - Update spec.json to set `"requirements": {"approved": true}`

### If Design Not Approved:
1. **Review design.md** - Read through the generated design thoroughly
2. **Edit if needed** - Make any necessary changes directly in the design.md file
3. **Manual approval required** - Update spec.json to set `"design": {"approved": true}`
4. **Reasoning**: Human review ensures technical design accuracy before task breakdown

**Example full approval in spec.json**:
```json
{
  "approvals": {
    "requirements": {
      "generated": true,
      "approved": true  // ← Human reviewed and approved
    },
    "design": {
      "generated": true,
      "approved": true  // ← Human reviewed and approved
    }
  },
  "phase": "design-approved"
}
```

**Only proceed to task generation after both requirements and design are explicitly approved by human review.**

## Context Analysis

### Complete Spec Context (APPROVED)
- Requirements: @.kiro/specs/$ARGUMENTS/requirements.md
- Design: @.kiro/specs/$ARGUMENTS/design.md
- Current tasks: @.kiro/specs/$ARGUMENTS/tasks.md
- Spec metadata: @.kiro/specs/$ARGUMENTS/spec.json

### Steering Context
- Architecture patterns: @.kiro/steering/structure.md
- Development practices: @.kiro/steering/tech.md
- Product constraints: @.kiro/steering/product.md

## Task: Generate Code-Generation Prompts

**Prerequisites Verified**: Both requirements and design are approved and ready for task breakdown.

**CRITICAL**: Convert the feature design into a series of prompts for a code-generation LLM that will implement each step in a test-driven manner. Prioritize best practices, incremental progress, and early testing, ensuring no big jumps in complexity at any stage.

Create implementation plan in the language specified in spec.json:

### 1. Code-Generation Tasks Structure
Create tasks.md in the language specified in spec.json (check `@.kiro/specs/$ARGUMENTS/spec.json` for "language" field):

```markdown
# Implementation Plan

- [ ] 1. Set up project structure and core interfaces
  - Create directory structure for models, services, repositories, and API components
  - Write foundational TypeScript interfaces in `types/index.ts`
  - Create base configuration files (tsconfig.json, package.json)
  - _Requirements: 1.1_

- [ ] 2. Implement data models and validation with tests
- [ ] 2.1 Create core data model interfaces and types
  - Write TypeScript interfaces for all data models in `types/models.ts`
  - Create base Entity class in `models/base.ts` with common properties
  - Write unit tests for base model functionality in `tests/models/base.test.ts`
  - _Requirements: 2.1, 2.2_

- [ ] 2.2 Implement User model with validation and tests
  - Write User class in `models/user.ts` extending base Entity
  - Implement email validation, password hashing methods
  - Create comprehensive unit tests in `tests/models/user.test.ts`
  - Test validation edge cases: invalid email, weak password, duplicate users
  - _Requirements: 1.2, 1.3_

- [ ] 2.3 Implement primary domain model with relationships
  - Code [DomainModel] class in `models/[domain].ts` using User model from 2.2
  - Implement relationship handling with User model
  - Write unit tests for model creation and relationships in `tests/models/[domain].test.ts`
  - _Requirements: 2.3, 2.4_

- [ ] 3. Create data access layer with test-driven approach
- [ ] 3.1 Implement database connection utilities
  - Write database connection class in `database/connection.ts`
  - Create error handling utilities for database operations
  - Write connection tests in `tests/database/connection.test.ts`
  - _Requirements: 3.1_

- [ ] 3.2 Implement repository pattern for data access
  - Code base repository interface in `repositories/base-repository.ts`
  - Implement User repository in `repositories/user-repository.ts` using connection from 3.1
  - Write repository tests in `tests/repositories/user-repository.test.ts`
  - Test CRUD operations: create, read, update, delete scenarios
  - _Requirements: 3.2, 3.3_

- [ ] 3.3 Implement domain-specific repository
  - Code [Domain]Repository in `repositories/[domain]-repository.ts` extending base
  - Use User repository from 3.2 for relationship queries
  - Write comprehensive repository tests in `tests/repositories/[domain]-repository.test.ts`
  - _Requirements: 3.4_

- [ ] 4. Build API layer with test-first approach
- [ ] 4.1 Create authentication service and endpoints
  - Write authentication service in `services/auth-service.ts` using User repository
  - Implement login/register methods with JWT token generation
  - Create auth endpoints in `routes/auth.ts`
  - Write API tests in `tests/api/auth.test.ts` for login/register flows
  - _Requirements: 4.1, 4.2_

- [ ] 4.2 Implement core API endpoints
  - Code [Domain]Service in `services/[domain]-service.ts` using repositories from 3.2, 3.3
  - Create REST endpoints in `routes/[domain].ts`
  - Write API integration tests in `tests/api/[domain].test.ts`
  - Test CRUD operations, validation, error handling
  - _Requirements: 4.3, 4.4_

- [ ] 5. Create frontend components with integrated testing
- [ ] 5.1 Build foundational UI components
  - Create reusable components in `components/ui/` (Button, Input, Form)
  - Write component tests in `tests/components/ui/` using Testing Library
  - Test component rendering, props, user interactions
  - _Requirements: 5.1_

- [ ] 5.2 Implement authentication components
  - Code LoginForm component in `components/auth/LoginForm.tsx` using UI components from 5.1
  - Connect to auth API from 4.1 using HTTP client
  - Write component tests in `tests/components/auth/LoginForm.test.tsx`
  - Test form submission, validation, error states
  - _Requirements: 5.2, 5.3_

- [ ] 5.3 Build main feature components
  - Implement [Domain]List and [Domain]Form components in `components/[domain]/`
  - Connect to domain API from 4.2 for data operations
  - Write component tests covering user interactions and API integration
  - _Requirements: 5.4, 5.5_

- [ ] 6. Integrate components and add end-to-end testing
- [ ] 6.1 Create main application integration
  - Code App component in `App.tsx` integrating auth and domain components
  - Implement routing using components from 5.1, 5.2, 5.3
  - Write integration tests in `tests/integration/app.test.tsx`
  - _Requirements: 6.1_

- [ ] 6.2 Implement automated end-to-end testing
  - Write E2E tests in `tests/e2e/` covering complete user workflows
  - Test authentication flow: register → login → use features → logout
  - Test main feature workflows using all components and APIs
  - _Requirements: 6.2_
```

**Code-Generation Prompt Format Rules**:
- Hierarchical numbering: Major phases (1, 2, 3) and sub-tasks (1.1, 1.2)
- Each task is a specific coding instruction for a code-generation LLM
- Specify exact files to create/modify (e.g., `models/user.ts`, `tests/auth.test.ts`)
- Build incrementally: each task uses outputs from previous tasks
- Include test-first/test-integrated approach in every task
- End with specific requirement mapping: _Requirements: X.X, Y.Y_
- Focus ONLY on writing, modifying, or testing code
- Tasks should be completable in 1-3 hours each

### 2. Code-Generation Quality Guidelines
- **Executable Instructions**: Each task must be actionable by a coding agent without clarification
- **Specific File References**: Specify exact files/components to create or modify
- **Incremental Building**: Each task builds on artifacts from previous tasks
- **Test Integration**: Include testing approach in each development task
- **Requirements Traceability**: Map to specific EARS requirements from requirements.md
- **No Orphaned Code**: All code integrates into the growing system
- **Coding-Only Focus**: Exclude deployment, user testing, or non-coding activities

### 3. Mandatory Task Categories (Coding Only)
Include ONLY coding tasks for:
- **Data Models**: Model classes with validation and tests
- **Data Access**: Repository pattern implementation with tests
- **API Services**: Backend service implementation with API tests
- **UI Components**: Frontend component development with component tests
- **Integration**: Code integration and automated testing
- **End-to-End Testing**: Automated test implementation

**EXCLUDED (Non-Coding Tasks):**
- User acceptance testing or user feedback gathering
- Production deployment or staging environments
- Performance metrics gathering or analysis
- CI/CD pipeline setup or configuration
- Documentation creation (beyond code comments)

### 4. Granular Requirements Mapping
For each task, reference specific EARS requirements from requirements.md:
- Reference granular sub-requirements, not just user stories
- Map to specific acceptance criteria (e.g., REQ-2.1.3: IF validation fails THEN...)
- Ensure every EARS requirement is covered by implementation tasks
- Use format: _Requirements: 2.1, 3.3, 1.2_ (refer to numbered requirements)

### 5. Progress Tracking
Include progress tracking section:
```markdown
## 進捗状況
- Created: [timestamp]
- Status: Ready for implementation
- Total tasks: [count]
- Completed: 0
- Remaining: [count]
```

### 6. Document Generation Only
Generate the tasks document content ONLY. Do not include any review or approval instructions in the actual document file.

### 7. Update Metadata

Update spec.json with:
```json
{
  "phase": "tasks-generated",
  "progress": {
    "requirements": 100,
    "design": 100, 
    "tasks": 100
  },
  "approvals": {
    "requirements": {
      "generated": true,
      "approved": true
    },
    "design": {
      "generated": true,
      "approved": true
    },
    "tasks": {
      "generated": true,
      "approved": false
    }
  },
  "updated_at": "current_timestamp"
}
```

### 8. Metadata Update
Update the tracking metadata to reflect task generation completion.

---

## REVIEW AND APPROVAL PROCESS (Not included in document)

The following is for Claude Code conversation only - NOT for the generated document:

### Human Review Required
After generating tasks.md, inform the user:

**NEXT STEP**: Human review required before starting implementation.

### Review Checklist:
- [ ] Tasks are properly sized (2-4 hours each)
- [ ] All requirements are covered by tasks
- [ ] Task dependencies are correct
- [ ] Technology choices match the design
- [ ] Testing tasks are included

### To Approve:
After reviewing, update `.kiro/specs/$ARGUMENTS/spec.json`:
```json
{
  "approvals": {
    "requirements": {
      "generated": true,
      "approved": true
    },
    "design": {
      "generated": true,
      "approved": true
    },
    "tasks": {
      "generated": true,
      "approved": true
    }
  },
  "phase": "ready-for-implementation",
  "ready_for_implementation": true
}
```

**Only after approval can you start implementation.**

## Instructions

1. **Check spec.json for language** - Use the language specified in the metadata
2. **Convert design into code-generation prompts** - Each task must be a specific coding instruction
3. **Apply test-driven approach** - Integrate testing into each development task
4. **Specify exact files and components** - Define what code to write/modify in which files
5. **Build incrementally** - Each task uses outputs from previous tasks, no orphaned code
6. **Map to granular requirements** - Reference specific EARS acceptance criteria
7. **Focus on coding only** - Exclude deployment, user testing, performance analysis
8. **Order by dependencies** - Ensure logical build sequence
9. **Update tracking metadata** upon completion

Generate code-generation prompts that provide step-by-step implementation instructions for a coding agent.
ultrathink
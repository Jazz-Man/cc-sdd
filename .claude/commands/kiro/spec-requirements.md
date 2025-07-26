---
description: Generate comprehensive requirements for a specification
allowed-tools: Bash, Read, Write, Edit, MultiEdit, Update, WebSearch, WebFetch
---

# Requirements Generation

Generate comprehensive requirements for feature: **$ARGUMENTS**

## Context Validation

### Steering Context
- Architecture context: @.kiro/steering/structure.md
- Technical constraints: @.kiro/steering/tech.md
- Product context: @.kiro/steering/product.md

### Existing Spec Context
- Current spec directory: !`ls -la .kiro/specs/$ARGUMENTS/`
- Current requirements: @.kiro/specs/$ARGUMENTS/requirements.md
- Spec metadata: @.kiro/specs/$ARGUMENTS/spec.json

## Task: Generate Detailed Requirements

**CRITICAL**: Generate comprehensive initial requirements based on the feature idea WITHOUT asking sequential questions first. Create complete requirements covering all necessary aspects.

### Initial Generation Requirements
1. **Comprehensive Coverage**: Address all major functional areas from the feature idea
2. **Include All Mandatory Elements**:
   - Happy path scenarios for normal workflows
   - Edge cases including error conditions and boundary values
   - User experience considerations for intuitive interactions  
   - Technical constraints from system architecture
   - Success criteria with measurable outcomes
3. **EARS Format Compliance**: All acceptance criteria must use proper EARS syntax
4. **No Sequential Questions**: Do not ask clarifying questions before generating initial version
5. **Complete Initial Draft**: Provide full requirements that can stand for review

### 1. EARS Format Requirements

**EARS (Easy Approach to Requirements Syntax)** is the mandatory format for acceptance criteria:

**Primary EARS Patterns:**
- **WHEN** [event/condition] **THEN** [system] **SHALL** [response]
- **IF** [precondition/state] **THEN** [system] **SHALL** [response]
- **WHILE** [ongoing condition] **THE SYSTEM SHALL** [continuous behavior]
- **WHERE** [location/context] **THE SYSTEM SHALL** [contextual behavior]

**Combined Patterns:**
- **WHEN** [event] **AND** [additional condition] **THEN** [system] **SHALL** [response]
- **IF** [condition] **AND** [additional condition] **THEN** [system] **SHALL** [response]

### 2. Requirements Hierarchy and Granularity

**Structure Requirements with Clear Hierarchy:**

```
# Requirements Document
├── Introduction (feature overview)
├── Requirements
│   ├── Requirement 1 (Major Feature Area)
│   │   ├── User Story (high-level need)
│   │   └── Acceptance Criteria (detailed EARS)
│   │       ├── Happy path scenarios
│   │       ├── Edge cases and error conditions
│   │       ├── User experience considerations
│   │       └── Technical constraints
│   ├── Requirement 2 (Next Feature Area)
│   └── ...
```

**Granularity Guidelines:**
- **High-level Requirements**: Major functional areas or user workflows
- **User Stories**: Specific user needs within each requirement area  
- **Acceptance Criteria**: Detailed, testable conditions using EARS format
- **Coverage**: Each requirement must address happy path, edge cases, UX, and technical aspects

### 3. Mandatory Coverage Areas

**Each requirement MUST consider:**

1. **Edge Cases**: Error conditions, boundary values, exceptional scenarios
2. **User Experience**: Intuitive workflows, clear feedback, accessibility
3. **Technical Constraints**: Integration with existing architecture, performance limits
4. **Success Criteria**: Measurable outcomes and acceptance thresholds

### 4. Requirements Document Structure
Generate requirements.md in the language specified in spec.json (check `@.kiro/specs/$ARGUMENTS/spec.json` for "language" field):

```markdown
# Requirements Document

## Introduction
[Clear introduction summarizing the feature and its business value]

## Requirements

### Requirement 1: [Major Feature Area]
**User Story:** As a [role], I want [feature], so that [benefit]

#### Acceptance Criteria
This section should have EARS requirements

1. WHEN [normal user action] THEN [system] SHALL [expected response]
2. WHEN [user completes workflow] THEN [system] SHALL [confirmation/next step]
3. IF [invalid input/error condition] THEN [system] SHALL [error handling/feedback]
4. WHEN [boundary condition] THEN [system] SHALL [appropriate response]
5. WHILE [user is performing action] THE SYSTEM SHALL [provide feedback/guidance]
6. WHERE [specific context] THE SYSTEM SHALL [contextual behavior]
7. WHEN [technical condition] THEN [system] SHALL [meet performance/integration requirement]

### Requirement 2: [Next Major Feature Area]
**User Story:** As a [role], I want [feature], so that [benefit]

1. WHEN [event] THEN [system] SHALL [response]
2. WHEN [event] AND [condition] THEN [system] SHALL [response]

### Requirement 3: [Additional Major Areas]
[Continue pattern for all major functional areas]
```

### 5. Requirements Quality Guidelines

**EARS Format Compliance:**
- Use exact EARS syntax patterns (WHEN/THEN, IF/THEN, WHILE/SHALL, WHERE/SHALL)
- Each acceptance criterion must be a complete, testable statement
- Use "SHALL" for mandatory system behaviors

**Comprehensive Coverage:**
- **Happy Path**: Normal user workflows and expected behaviors
- **Edge Cases**: Error conditions, boundary values, exceptional scenarios
- **User Experience**: Clear feedback, intuitive interactions, accessibility considerations
- **Technical Constraints**: Performance requirements, integration limits, system boundaries
- **Success Criteria**: Measurable outcomes and acceptance thresholds

**Structural Requirements:**
- Group related functionality into hierarchical requirements
- Each requirement represents a major feature area or user workflow
- User stories provide high-level context for detailed acceptance criteria
- Acceptance criteria are specific, testable, and complete

### 6. Integration Considerations
Based on steering context, ensure requirements address:
- **Architectural Integration**: How feature aligns with existing system structure
- **Technical Constraints**: Performance limits, data consistency, API limitations
- **User Workflow Integration**: Seamless connection with existing user journeys
- **Scalability Requirements**: System behavior under load and growth scenarios
- **Security and Compliance**: Data protection, access control, regulatory requirements

### 4. Update Metadata
Update spec.json with:
```json
{
  "phase": "requirements-generated",
  "progress": {
    "requirements": 100,
    "design": 0,
    "tasks": 0
  },
  "approvals": {
    "requirements": {
      "generated": true,
      "approved": false
    }
  },
  "updated_at": "current_timestamp"
}
```

### 5. Document Generation Only
Generate the requirements document content ONLY. Do not include any review or approval instructions in the actual document file.

---

## INTERACTIVE APPROVAL AVAILABLE (Not included in document)

The following is for Claude Code conversation only - NOT for the generated document:

### Next Phase Uses Interactive Approval
After generating requirements.md, the next phase (`/spec-design $ARGUMENTS`) will use interactive approval:

**Next interaction will be**:
```
/spec-design feature-name
# → "requirements.mdをレビューしましたか？ [y/N]"
# → If 'y': Auto-approval + design generation
# → If 'N': Stop and request review first
```

### Benefits of Interactive Approval
1. **Streamlined workflow**: No manual spec.json editing required
2. **Review enforcement**: Still requires human confirmation of review
3. **Immediate progression**: Approved phases proceed automatically
4. **Safety maintained**: 'N' response stops execution for proper review

### Review Checklist (for user reference):
- [ ] Requirements are clear and complete
- [ ] User stories cover all necessary functionality
- [ ] Acceptance criteria are testable
- [ ] Requirements align with project goals

### Traditional Manual Approval Still Available
If needed, you can still manually approve by updating `.kiro/specs/$ARGUMENTS/spec.json`:
```json
{
  "approvals": {
    "requirements": {
      "generated": true,
      "approved": true
    }
  },
  "phase": "requirements-approved"
}
```

**Recommended**: Use the interactive approval in `/spec-design $ARGUMENTS` for better user experience.

## Instructions

1. **Check spec.json for language** - Use the language specified in the metadata
2. **Generate comprehensive initial requirements** based on feature idea WITHOUT asking sequential questions first
3. **Apply EARS format strictly** - Use exact EARS syntax patterns for all acceptance criteria
4. **Ensure comprehensive coverage**:
   - Happy path scenarios for normal user workflows
   - Edge cases including error conditions and boundary values
   - User experience considerations for intuitive interactions
   - Technical constraints from steering documents and system architecture
   - Success criteria with measurable outcomes
5. **Structure hierarchically** - Group related functionality into major requirement areas
6. **Make requirements testable** - Each acceptance criterion should be verifiable and specific
7. **Consider integration** with existing system architecture and user workflows
8. **Update tracking metadata** upon completion

Generate requirements that provide comprehensive foundation for design phase, covering all necessary aspects from the initial feature idea.
ultrathink
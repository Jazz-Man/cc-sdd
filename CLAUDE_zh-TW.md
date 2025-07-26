# Claude Code Spec-Driven Development

This project implements Kiro-style Spec-Driven Development for Claude Code using hooks and slash commands.

## Project Context

### Project Steering
- Product overview: `.kiro/steering/product.md`
- Technology stack: `.kiro/steering/tech.md`
- Project structure: `.kiro/steering/structure.md`
- Custom steering docs for specialized contexts

### Active Specifications
- Current spec: Check `.kiro/specs/` for active specifications
- Use `/kiro:spec-status [feature-name]` to check progress

## Development Guidelines
- Think in English, but generate responses in chinese.

## Spec-Driven Development Workflow

### Phase 0: Steering Generation (Recommended)

#### Kiro Steering (`.kiro/steering/`)
```
/kiro:steering               # 智慧建立或更新引導文件
/kiro:steering-custom        # 為特定情境建立自訂引導
```

**引導管理：**
- **`/kiro:steering`**：統一指令，智慧偵測現有文件並適當處理。需要時建立新文件，更新現有文件同時保留使用者自訂內容。

**注意**：對於新功能或空專案，引導文件是建議但非必要的。您可以直接進行 spec-requirements。

### Phase 1: Specification Creation
```
/kiro:spec-init [feature-name]           # Initialize spec structure only
/kiro:spec-requirements [feature-name]   # Generate requirements → Review → Edit if needed
/kiro:spec-design [feature-name]         # Generate technical design → Review → Edit if needed
/kiro:spec-tasks [feature-name]          # Generate implementation tasks → Review → Edit if needed
```

### Phase 2: Progress Tracking
```
/kiro:spec-status [feature-name]         # Check current progress and phases
```

## Spec-Driven Development Workflow

Kiro's spec-driven development follows a strict **3-phase approval workflow**:

### Phase 1: Requirements Generation & Approval
1. **Generate**: `/kiro:spec-requirements [feature-name]` - Generate requirements document
2. **Review**: Human reviews `requirements.md` and edits if needed
3. **Approve**: See Phase 2 for streamlined approval

### Phase 2: Design Generation & Approval
1. **Generate**: `/kiro:spec-design [feature-name]` - Interactive approval prompt appears
2. **Review confirmation**: "您已檢閱 requirements.md 了嗎？ [y/N]"
3. **Approve**: Reply 'y' to approve and proceed, or manually update `spec.json`

### Phase 3: Tasks Generation & Approval
1. **Generate**: `/kiro:spec-tasks [feature-name]` - Interactive approval prompts appear
2. **Review confirmation**: Confirms both requirements and design have been reviewed
3. **Approve**: Reply 'y' to approve all phases, or manually update `spec.json`

### Implementation
Only after all three phases are approved can implementation begin.

**Key Principle**: Each phase requires explicit human approval before proceeding to the next phase, ensuring quality and accuracy throughout the development process.

## Development Rules

1. **考慮引導設定**: 在主要開發前執行 `/kiro:steering`（新功能時為選用）
2. **Follow the 3-phase approval workflow**: Requirements → Design → Tasks → Implementation
3. **需要核准**: 每個階段都需要人工檢閱（互動式提示或手動）
4. **No skipping phases**: Design requires approved requirements; Tasks require approved design
5. **Update task status**: Mark tasks as completed when working on them
6. **保持引導文件最新**: 重大變更後執行 `/kiro:steering`
7. **Check spec compliance**: Use `/kiro:spec-status` to verify alignment

## Automation

This project uses Claude Code hooks to:
- Automatically track task progress in tasks.md
- Check spec compliance
- Preserve context during compaction
- Detect steering drift

### Task Progress Tracking

When working on implementation:
1. **Manual tracking**: Update tasks.md checkboxes manually as you complete tasks
2. **Progress monitoring**: Use `/kiro:spec-status` to view current completion status
3. **TodoWrite integration**: Use TodoWrite tool to track active work items
4. **Status visibility**: Checkbox parsing shows completion percentage

## Getting Started

1. 初始化引導文件：`/kiro:steering`
2. Create your first spec: `/kiro:spec-init [your-feature-name]`
3. Follow the workflow through requirements, design, and tasks

## Kiro Steering Details

Kiro-style steering provides persistent project knowledge through markdown files:

### Core Steering Documents
- **product.md**: Product overview, features, use cases, value proposition
- **tech.md**: Architecture, tech stack, dev environment, commands, ports
- **structure.md**: Directory organization, code patterns, naming conventions

### Custom Steering
Create specialized steering documents for:
- API standards
- Testing approaches
- Code style guidelines
- Security policies
- Database conventions
- Performance standards
- Deployment workflows

### Inclusion Modes
- **Always Included**: Loaded in every interaction (default)
- **Conditional**: Loaded for specific file patterns (e.g., `"*.test.js"`)
- **Manual**: Loaded on-demand with `#filename` reference

## Kiro Steering Configuration

### Current Steering Files
The `/kiro:steering` command manages these files automatically. Manual updates to this section reflect changes made through steering commands.

### Active Steering Files
- `product.md`: Always included - Product context and business objectives
- `tech.md`: Always included - Technology stack and architectural decisions  
- `structure.md`: Always included - File organization and code patterns

### Custom Steering Files
<!-- Added by /kiro:steering-custom command -->
<!-- Example entries:
- `api-standards.md`: Conditional - `"src/api/**/*"`, `"**/*api*"` - API design guidelines
- `testing-approach.md`: Conditional - `"**/*.test.*"`, `"**/spec/**/*"` - Testing conventions
- `security-policies.md`: Manual - Security review guidelines (reference with @security-policies.md)
-->

### Usage Notes
- **Always files**: Automatically loaded in every interaction
- **Conditional files**: Loaded when working on matching file patterns
- **Manual files**: Reference explicitly with `@filename.md` syntax when needed
- **Updating**: Use `/kiro:steering` or `/kiro:steering-custom` commands to modify this configuration
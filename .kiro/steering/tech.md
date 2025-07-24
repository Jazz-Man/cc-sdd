# Technology Stack

## Architecture Overview
A Claude Code extension system that uses hooks and slash commands to implement Kiro-style spec-driven development workflows.

## Core Technologies
- **Platform**: Claude Code CLI (darwin)
- **Language**: Markdown-based specifications and documentation
- **Automation**: Claude Code hooks system
- **Version Control**: Git

## Development Environment

### System Requirements
- Claude Code CLI
- Git repository
- macOS (darwin platform)

### Project Dependencies
- Claude Code slash commands (.claude/commands/)
- File system access for steering/spec management
- No external package dependencies (pure markdown/JSON system)
- TodoWrite tool integration for task management

### Language Specifications
- **Thinking**: English (internal processing)
- **Responses**: Japanese (user-facing content)
- **Documentation**: Trilingual support (Japanese primary, English, Traditional Chinese)
- **Configuration Files**: Language-specific CLAUDE.md variants (CLAUDE_en.md, CLAUDE_zh-TW.md)

### Task Tracking Approach
- **Manual Progress**: Checkbox manipulation in tasks.md files
- **Automatic Parsing**: Progress percentage calculation from checkboxes
- **Enhanced Tracking**: Improved hook error resolution and progress monitoring
- **TodoWrite Integration**: Active task management during implementation

## Key Commands

### Steering Commands
```bash
/kiro:steering          # NEW: Intelligently create or update steering documents (recommended)
/kiro:steering-init     # [DEPRECATED] Generate initial steering documents (use /kiro:steering instead)
/kiro:steering-update   # [DEPRECATED] Update steering after changes (use /kiro:steering instead)
/kiro:steering-custom   # Create custom steering for specialized contexts
```

### Specification Commands
```bash
/kiro:spec-init [feature-name]           # Initialize spec structure only
/kiro:spec-requirements [feature-name]   # Generate requirements
/kiro:spec-design [feature-name]         # Generate technical design
/kiro:spec-tasks [feature-name]          # Generate implementation tasks
/kiro:spec-status [feature-name]         # Check current progress and phases
```

## File Structure
```
.kiro/
├── steering/           # Project steering documents
│   ├── product.md     # Product overview
│   ├── tech.md        # Technology stack
│   └── structure.md   # Code organization
├── specs/             # Feature specifications
│   └── [feature]/
│       ├── spec.json      # Spec metadata and approval status
│       ├── requirements.md # Feature requirements
│       ├── design.md      # Technical design
│       └── tasks.md       # Implementation tasks

.claude/
└── commands/          # Slash command definitions
    └── kiro/
        ├── spec-init.md
        ├── spec-requirements.md
        ├── spec-design.md
        ├── spec-tasks.md
        ├── spec-status.md
        ├── steering.md          # NEW: Unified steering command
        ├── steering-init.md     # [DEPRECATED]
        ├── steering-update.md   # [DEPRECATED]
        └── steering-custom.md

docs/                  # Comprehensive documentation
├── claude-code/       # Claude Code specific guides
│   ├── hooks-guide.md # Hook system implementation
│   ├── hooks.md       # Hook reference
│   └── slash-commands.md # Command reference
└── kiro/              # Kiro IDE reference and examples
    ├── llms.txt       # Kiro IDE documentation
    ├── specs-example/ # Example specifications
    │   ├── pdf-drawing-explainer/
    │   └── task-management-service/
    └── steering-example/ # Example steering documents

README.md             # Japanese user documentation with workflow diagrams
README_en.md          # English version documentation
README_zh-TW.md       # Traditional Chinese documentation
CLAUDE.md             # Primary Claude Code configuration
CLAUDE_en.md          # English Claude Code configuration
CLAUDE_zh-TW.md       # Traditional Chinese Claude Code configuration
BLOG.md               # Technical blog about implementation
```

## Integration Points
- **Claude Code CLI**: Primary interface for all commands
- **Git**: Version control for specs and steering
- **File System**: Markdown file management
- **Hooks System**: Automated tracking and compliance
- **TodoWrite Tool**: Task progress tracking and management

## Development Workflow
1. Initialize project steering with `/kiro:steering` (intelligently handles both creation and updates)
2. Create feature specifications with `/kiro:spec-init`
3. Follow 3-phase approval process (Requirements → Design → Tasks)
4. Implement with manual task tracking via checkbox manipulation
5. Monitor progress with `/kiro:spec-status`
6. Update steering as needed with `/kiro:steering` (preserves user customizations)

## Task Progress Management
- **Manual Tracking**: Update tasks.md checkboxes during implementation
- **Progress Calculation**: Automatic percentage computation from checkbox states  
- **Enhanced Monitoring**: Improved hook error resolution and progress tracking
- **Status Monitoring**: Use `/spec-status` for current progress overview
- **TodoWrite Integration**: Track active work items during development sessions

## Security & Access
- Local file system based
- No external dependencies
- Git-based version control
- Manual approval gates for phase transitions
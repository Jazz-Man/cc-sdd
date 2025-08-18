# cc-sdd

**Claude Code Spec-Driven Development Scaffolder**

> ⚠️ **Beta Release** - This is a beta version. Please report any issues on GitHub.

A one-command scaffolding tool that **easily introduces AI-DLC (AI Driven Development Lifecycle) and Spec-Driven Development cycles to coding agents like Claude Code**. Instantly deploy Kiro-style workflow slash commands and project rules that enable systematic, structured development with AI coding agents.

## Quick Start

```bash
# Set up AI-DLC slash commands and workflows
npx cc-sdd

# With specific options
npx cc-sdd --os mac --lang ja --dry-run
```

### Using Claude Code Slash Commands

After setup, use these slash commands in Claude Code for spec-driven development:

```bash
# 0. (optional but recommended) Setup existing project steering documents 
/kiro:steering

# 1. Initialize new feature specification
/kiro:spec-init "I want to create a feature where users can upload PDFs, extract diagrams and charts from them, and have AI explain the content. Tech stack: Next.js, TypeScript, Tailwind CSS."

# 2. Generate comprehensive requirements
/kiro:spec-requirements pdf-diagram-extractor

# 3. Create technical design (after requirements approval)
/kiro:spec-design pdf-diagram-extractor -y

# 4. Generate implementation tasks (after design approval)
/kiro:spec-tasks pdf-diagram-extractor -y

# 5. Execute tasks with TDD methodology (after tasks approval)
/kiro:spec-impl pdf-diagram-extractor 1.1,1.2,1.3
```

The `-y` flag auto-approves the previous phase, streamlining the workflow while maintaining quality gates.

## What it does

cc-sdd automatically sets up **Spec-Driven Development** for your project:

- **`.claude/commands/kiro/**`** - Complete slash commands for spec-driven development workflow
- **`CLAUDE.md`** - AI agent instructions and project context with localized content  
- **`.cc-sdd.json`** - Configuration file to track your preferences

This enables coding agents to follow structured development processes: requirements → design → tasks → implementation with proper steering and progress tracking.

**Kiro IDE Compatible**: The generated directory structure (`.kiro/specs/`, `.kiro/steering/`) is fully compatible with Kiro's native format, allowing you to seamlessly use specs and steering documents directly in Kiro IDE while also leveraging them with Claude Code slash commands.

## Features

✅ **One Command** - Auto-detects initial setup vs. updates  
✅ **Cross-Platform** - macOS, Windows, Linux support with auto-detection  
✅ **Multi-Language** - Japanese, English, Traditional Chinese  
✅ **Safe Updates** - Interactive prompts with backup options  
✅ **Dry Run** - Preview changes before applying  
✅ **Non-Interactive** - CI/CD friendly with `--yes` flag  

## Command Options

| Option | What it does | Default |
|--------|-------------|---------|
| `--os <auto\|mac\|windows\|linux>` | Choose your operating system (auto-detects if not specified) | `auto` |
| `--lang <ja\|en\|zh-TW>` | Language for generated documentation and commands | `en` |
| `--dry-run` | Preview what files will be created/changed without actually doing it | - |
| `--backup[=<dir>]` | Save copies of existing files before overwriting them | - |
| `--overwrite <prompt\|skip\|force>` | What to do when files already exist:<br>• `prompt`: Ask for each file (default)<br>• `skip`: Never overwrite<br>• `force`: Always overwrite | `prompt` |
| `--yes, -y` | Skip all prompts (makes `prompt` behave like `force`) | - |
| `--agent <claude-code>` | Which coding agent to set up commands for (currently Claude Code only) | `claude-code` |
| `--kiro-dir <path>` | Where to create the specs directory (relative to project root) | `.kiro` |

## Usage Examples

### Initial Setup
```bash
# Basic setup with English docs
npx cc-sdd

# Japanese docs for macOS
npx cc-sdd --lang ja --os mac

# Preview changes first
npx cc-sdd --dry-run
```

### Updating Existing Project
```bash
# Safe update with interactive prompts and backup
npx cc-sdd --backup

# Automatic overwrite with backup (CI/CD safe)
npx cc-sdd --yes --backup

# Skip all overwrites (keep existing files)
npx cc-sdd --overwrite skip

# Force overwrite without prompts
npx cc-sdd --overwrite force --backup
```

### Advanced Options
```bash
# Custom Kiro directory
npx cc-sdd --kiro-dir custom/specs

# Specific OS and language
npx cc-sdd --os linux --lang zh-TW
```

## Output Structure

After running cc-sdd, your project will have:

```
project/
├── .claude/
│   └── commands/
│       └── kiro/
│           ├── spec-init.md
│           ├── spec-requirements.md  
│           ├── spec-design.md
│           ├── spec-tasks.md
│           ├── spec-status.md
│           ├── steering.md
│           └── steering-custom.md
├── .kiro/                    # Created by commands
│   ├── specs/               # Specifications  
│   └── steering/            # AI guidance rules
├── CLAUDE.md                # Project documentation
└── .cc-sdd.json            # Tool configuration
```

## Workflow Overview

The generated commands support a 3-phase development workflow:

### Phase 0: Steering (Optional)
- `/kiro:steering` - Create/update AI guidance rules
- `/kiro:steering-custom` - Custom context for specialized scenarios

### Phase 1: Specification 
1. `/kiro:spec-init [description]` - Initialize feature specification
2. `/kiro:spec-requirements [feature]` - Generate requirements 
3. `/kiro:spec-design [feature]` - Create design (requires requirements review)
4. `/kiro:spec-tasks [feature]` - Break down into tasks (requires design review)

### Phase 2: Progress Tracking
- `/kiro:spec-status [feature]` - Check current progress and next steps

## Configuration

The `.cc-sdd.json` file stores your preferences:

```json
{
  "agent": "claude-code",
  "os": "auto", 
  "lang": "ja",
  "kiroDir": ".kiro"
}
```

## Platform Support

| Platform | Auto-Detection | Manual Override |
|----------|---------------|-----------------|
| macOS | ✅ `darwin` | `--os mac` |
| Windows | ✅ `win32` | `--os windows` |  
| Linux | ✅ `linux` | `--os linux` |
| WSL | ✅ Detected as Linux | `--os linux` |

## Language Support

- **Japanese (`ja`)** - 日本語ドキュメント
- **English (`en`)** - English documentation  
- **Traditional Chinese (`zh-TW`)** - 繁體中文文件

## Safety Features

- **Interactive Prompts** - Confirms before overwriting existing files
- **Backup Creation** - Preserves original files with `--backup`
- **Dry Run Mode** - Preview all changes with `--dry-run`
- **Skip Mode** - Avoid overwriting with `--overwrite skip`

### File Overwrite Behavior

When files already exist, cc-sdd offers three modes:

#### Prompt Mode (Default)
Interactive prompts for each conflicting file:
```
Overwrite existing/file.md? [y]es/[n]o/[a]ll/[s]kip all: 
```
- `y` - Overwrite this file only
- `n` - Skip this file only  
- `a` - Overwrite all remaining files
- `s` - Skip all remaining files

#### Skip Mode
Never overwrites existing files:
```bash
npx cc-sdd --overwrite skip
```

#### Force Mode
Always overwrites without prompting:
```bash
npx cc-sdd --overwrite force
```

#### CI/CD Usage
In non-interactive environments, prompt mode automatically falls back to skip mode with a warning. Use `--yes` or `--overwrite force` to enable overwriting in CI/CD:

```bash
# Safe CI/CD update (overwrites with backup)
npx cc-sdd --yes --backup

# Preview-only mode for CI validation
npx cc-sdd --dry-run
```

## Troubleshooting

### Common Issues

**Permission denied on Linux/macOS:**
```bash
chmod +x ~/.npm/_npx/*/node_modules/.bin/cc-sdd
```

**WSL detection issues:**
```bash
npx cc-sdd --os linux  # Force Linux mode
```

**Existing files conflict:**
```bash
npx cc-sdd --backup --overwrite force  # Safe overwrite
```

### Beta Release Known Issues

- Windows template escaping has been recently fixed - please report any remaining issues
- Cross-platform testing is limited - feedback welcome
- Template customization not yet supported

### Reporting Issues

Please report bugs and issues at: https://github.com/gotalab/claude-code-spec/issues

## Contributing

This tool is part of the Claude Code Spec project. See the main repository for contribution guidelines.

## License

MIT License - See project repository for details.

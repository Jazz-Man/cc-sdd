---
description: [DEPRECATED - Use /kiro:steering instead] Initialize Kiro steering documents for persistent project knowledge
allowed-tools: Bash, Read, Write, Edit, MultiEdit, Glob, Grep, LS
---

# Kiro Steering Initialization

> ⚠️ **DEPRECATED**: This command is deprecated. Please use `/kiro:steering` instead, which intelligently handles both creation and updates of steering documents.

Create foundational steering documents in `.kiro/steering/` to establish consistent project standards and conventions that will guide AI interactions throughout spec-driven development.

## Existing Files Check

### Check for existing steering documents
- Product overview: !`[ -f ".kiro/steering/product.md" ] && echo "⚠️  EXISTS - Will be OVERWRITTEN" || echo "✅ Not found - Will be created"`
- Technology stack: !`[ -f ".kiro/steering/tech.md" ] && echo "⚠️  EXISTS - Will be OVERWRITTEN" || echo "✅ Not found - Will be created"`
- Project structure: !`[ -f ".kiro/steering/structure.md" ] && echo "⚠️  EXISTS - Will be OVERWRITTEN" || echo "✅ Not found - Will be created"`

### 🚨 WARNING: Existing Files Detected

If any files show "⚠️ EXISTS" above, they will be completely overwritten without backup.

**Recommended Actions:**

1. **To UPDATE existing documents** → Use `/kiro:steering-update` instead
2. **To BACKUP before overwriting** → Run: `cp -r .kiro/steering .kiro/steering.backup`
3. **To CANCEL this operation** → Stop now and do not proceed
4. **To OVERWRITE completely** → Continue with the instructions below

**Note:** This command is intended for initial setup. For existing projects, `/kiro:steering-update` is usually more appropriate.

## Project Analysis

### Current Project Structure
- Project files: !`find . -type f -name "*.py" -o -name "*.js" -o -name "*.ts" -o -name "*.jsx" -o -name "*.tsx" -o -name "*.java" -o -name "*.go" -o -name "*.rs" | grep -v node_modules | grep -v .git | grep -v dist | head -30`
- Configuration files: !`find . -maxdepth 3 -name "package.json" -o -name "requirements.txt" -o -name "pom.xml" -o -name "Cargo.toml" -o -name "go.mod" -o -name "pyproject.toml" -o -name "tsconfig.json"`
- Documentation: !`find . -maxdepth 3 -name "README*" -o -name "CHANGELOG*" -o -name "LICENSE*" -o -name "*.md" | grep -v node_modules | grep -v .git`

### Existing Documentation
- Main README: @README.md
- Package configuration: @package.json
- Python requirements: @requirements.txt
- TypeScript config: @tsconfig.json
- Project documentation: @docs/

## Task: Generate Kiro Steering Documents

Create the three foundational steering documents that provide persistent knowledge about your project:

### 1. Product Overview (`product.md`)
Generate a comprehensive product overview that includes:
- **Product Overview**: Brief description of what the product is
- **Core Features**: Bulleted list of main capabilities
- **Target Use Case**: Specific scenarios the product addresses
- **Key Value Proposition**: Unique benefits and differentiators

This helps AI understand the context for technical decisions and business requirements.

### 2. Technology Stack (`tech.md`)
Document the complete technology landscape:
- **Architecture**: High-level system design (monolith, microservices, etc.)
- **Frontend**: Frameworks, libraries, build tools (if applicable)
- **Backend**: Language, framework, server technology (if applicable)
- **Development Environment**: Required tools and setup
- **Common Commands**: Frequently used development commands
- **Environment Variables**: Key configuration variables
- **Port Configuration**: Standard ports used by services

This guides AI to prefer established technology choices and patterns.

### 3. Project Structure (`structure.md`)
Outline the codebase organization:
- **Root Directory Organization**: Top-level structure with descriptions
- **Subdirectory Structures**: Detailed breakdown of key directories
- **Code Organization Patterns**: How code is structured (MVC, domain-driven, etc.)
- **File Naming Conventions**: Standards for naming files and directories
- **Import Organization**: How imports/dependencies are organized
- **Key Architectural Principles**: Core design decisions and patterns

This ensures generated code fits seamlessly into the existing codebase.

## Instructions

### IMPORTANT: Check Existing Files First

Before proceeding with steering document generation:

1. **Check the "Existing Files Check" section above**
   - If any files show "EXISTS", those steering documents already exist
   - Existing files will be OVERWRITTEN if you proceed

2. **If existing files are found:**
   - Consider using `/kiro:steering-update` instead to update existing documents
   - Or manually backup existing files before proceeding
   - Only proceed if you intentionally want to regenerate from scratch

### Generation Instructions

1. **Create `.kiro/steering/` directory** if it doesn't exist
2. **Analyze the codebase thoroughly** to understand current patterns and architecture
3. **Generate comprehensive but focused documents** - each file should be readable in 2-3 minutes
4. **Use clear markdown formatting** with proper headers and sections
5. **Include concrete examples** where helpful for understanding
6. **Focus on facts over assumptions** - document what exists, not what might be ideal
7. **Follow spec-driven development principles** - these documents will guide future specifications

### 🔄 Alternative: Incremental Update

If you have existing steering documents and want to preserve their content while updating:

```bash
# Option 1: Use the update command
/kiro:steering-update

# Option 2: Manual backup before regeneration
cp -r .kiro/steering .kiro/steering.backup.$(date +%Y%m%d_%H%M%S)
```

The goal is to create a solid foundation of project knowledge that will make all future AI interactions more consistent and aligned with your project's standards, enabling effective spec-driven development.
ultrathink
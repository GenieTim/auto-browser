# Auto-Browser Project Guidelines

## Project Overview

**auto-browser** is a CLI tool built on Puppeteer that automates browser interactions for repetitive tasks, primarily designed for semi-automated participation in online competitions (e.g., advent calendars with daily entries).

## Core Architecture

### Command Structure (oclif-based)

The project uses **oclif** (Open CLI Framework) with three main commands:

1. **`browse [WEBPAGE]`** - Executes configured automation tasks
2. **`generate`** - Interactive wizard to create new webpage configurations
3. **`list`** - Lists all available webpage configurations

### Key Design Patterns

#### 1. Instruction System (Command Pattern)

All browser actions are implemented as **instruction classes** in `src/instructions/`:

```javascript
class SomeInstruction {
  static identifier = 'instruction-name'
  static description = 'Human-readable description'
  
  async follow(instruction, driver, context) {
    // Execute the instruction using Puppeteer driver
  }
  
  async createInteractively() {
    // Prompt user for configuration during `generate` command
  }
}
```

**How Instructions Work:**
- Auto-loaded via `src/instructions/index.js` (dynamic imports)
- Each instruction exports a class with `identifier` and `description` static properties
- Instructions are executed sequentially from JSON configuration files

#### 2. Configuration Format (JSON-based)

Webpage configurations are stored in `webpages/` as JSON files:

```json
{
  "name": "Competition Name",
  "instructions": [
    {"goto": "https://example.com/advent"},
    {"click": "button[aria-label=\"$today\"]"},
    {"cleverfill": []},
    {"user-wait": {"end": "CI-Enter"}}
  ]
}
```

#### 3. Global Fields Pattern

The `cleverfill` instruction uses `global-fields.json` for form auto-completion:

```json
[
  {
    "selectors": ["firstname", "firstName", "vorname"],
    "text": "John"
  }
]
```

This allows reusing personal data across multiple competition forms without repetition.

#### 4. Browser Session Management

- Persistent browser profile stored in `user_data/` directory
- Maintains cookies, cache, and login sessions between runs
- Single browser instance with page/tab reuse for efficiency

### Utilities

#### Key Helper Functions

- **`adjustSelector(selector)`** - Replaces template variables like `$today` with actual values
- **`sandman.sleep(ms)`** / `sandman.randomSleep(max)`** - Delays with human-like randomness
- **`asyncForEach(array, callback)`** - Sequential async iteration
- **`executeFunctionByName(name, context, args)`** - Dynamic method invocation

## Code Style & Conventions

### Module System
- Uses **ES modules** (`import`/`export`) throughout

### Naming Conventions
- Classes: PascalCase (e.g., `ClickInstruction`)
- Files: kebab-case (e.g., `async-foreach.js`)
- Instruction identifiers: kebab-case (e.g., `user-wait`)
- Configuration files: domain-based (e.g., `www.example.com.json`)

### Error Handling
- Top-level try-catch in `browse` command to prevent one page from breaking others
- Individual instruction failures should throw to stop page execution
- Fallback mechanisms (e.g., JavaScript click if Puppeteer click fails)
- `errorCount` tracking with non-zero exit code on failures

### Logging
- `this.log()` - Standard information
- `this.warn()` - Non-fatal issues
- Debug mode via `--debug` flag shows browser and extra logs

## Adding New Instructions

1. Create `src/instructions/your-instruction.js`:

```javascript
import {ux} from '@oclif/core'
const cli = ux

class YourInstruction {
  constructor(logger) {
    this.logger = logger
  }

  async follow(instruction, driver, context) {
    // Implementation using driver (Puppeteer Page)
    // Access instruction parameters
    // Use context to share data between instructions
  }

  async createInteractively() {
    // Prompt user for configuration
    let value = await cli.prompt('What value?')
    return {someKey: value}
  }
}

YourInstruction.identifier = 'your-instruction'
YourInstruction.description = 'What this instruction does'

export default YourInstruction
```

2. The instruction is automatically loaded via `src/instructions/index.js`

3. It becomes available in:
   - `generate` command's interactive wizard
   - JSON configuration files
   - Direct usage in `browse` command

## Context Sharing Between Instructions

The `context` object allows instructions to communicate:

```javascript
// In one instruction
context.capturedValue = await driver.$eval('input', el => el.value)

// In a later instruction
const previousValue = context.capturedValue
```

## Important Implementation Notes

1. **Selector Adjustment**: Always use `adjustSelector()` on user-provided selectors to support template variables
2. **Sleep Usage**: Add `randomSleep()` between actions to appear more human-like
3. **Tab Handling**: Code attempts to prevent new tabs (sets `target="_self"`), as tab juggling isn't fully implemented
4. **Persistent Data**: Browser profile in `user_data/` maintains state—delete to reset sessions
5. **Fallback Clicks**: If Puppeteer's native click fails, JavaScript-based click is attempted
6. **Sequential Execution**: Instructions run sequentially, not in parallel (important for state-dependent actions)

## Security & Privacy

- **Personal data** stored in `global-fields.json` (gitignored)
- **User data directory** contains cookies and session data (should not be committed)
- No built-in encryption—users should secure sensitive configuration files externally

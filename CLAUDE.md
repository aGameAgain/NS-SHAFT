# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

NS-SHAFT is a browser-based 2D falling platform game implemented in modern ES6 JavaScript with HTML5 Canvas. The game features a player character that falls through platforms while avoiding obstacles and collecting points based on depth reached.

## Development Commands

### Running the Game
```bash
npm start        # Start development server on port 8000
npm run dev      # Alternative development server command
```

The game runs entirely in the browser - open `index.html` directly or use the development server at `http://localhost:8000`.

### Testing
```bash
npm test               # Run all tests (unit + e2e)
npm run test:unit      # Run unit tests only (Vitest)
npm run test:unit:watch # Watch mode for unit tests
npm run test:e2e       # Run end-to-end tests (Playwright)
npm run test:e2e:ui    # Run e2e tests with UI
npm run test:e2e:debug # Debug e2e tests
```

First time setup for e2e testing:
```bash
npx playwright install  # Install browser engines
```

## Architecture Overview

### ES6 Modular Design
The codebase uses modern ES6 modules with `import/export` syntax for clean separation of concerns:

**Core Game Systems:**
- `Game` (src/Game.js) - Main game coordinator that orchestrates all systems
- `GameState` (src/GameState.js) - Centralized state management (lives, depth, difficulty)
- `Player` (src/Player.js) - Player entity with movement, collision, and rendering
- `PlatformManager` (src/Platform.js) - Platform generation, management, and different platform types
- `Physics` (src/Physics.js) - Collision detection and gravity system
- `Renderer` (src/Renderer.js) - Canvas rendering for all game elements
- `InputHandler` (src/InputHandler.js) - Keyboard and touch input management
- `UIManager` (src/UIManager.js) - DOM UI elements and game state display

### Game Loop Architecture
The game follows a standard game loop pattern:
1. **Update Phase**: State updates, physics, collision detection, platform management
2. **Render Phase**: Clear canvas, draw background, platforms, player, and UI elements
3. **Input Processing**: Handle keyboard/touch events for player movement and jumping

### Platform System
Five distinct platform types with different behaviors:
- **Normal** (green): Standard safe platforms
- **Moving** (purple): Platforms that move horizontally
- **Breaking** (yellow): Platforms that break after 2 seconds of contact
- **Spike** (red): Damage-dealing platforms that reduce player health
- **Spring** (blue): Platforms that launch the player upward

### Coordinate System
The game uses a unique scrolling coordinate system where:
- Player moves in world coordinates
- Camera follows depth progression (constantly scrolling down)
- Rendering calculates relative positions based on current depth
- New platforms spawn ahead of the camera view

### State Management
Game state is centralized in `GameState` class:
- Lives system (100 HP, decreases on spike contact)
- Depth progression (determines difficulty and platform spawn patterns)
- Difficulty scaling (affects platform type distribution)
- Game flow states (running, paused, game over)

## Key Implementation Details

### ES6 Module Loading
The game uses modern ES6 modules loaded via:
```html
<script type="module" src="src/Game.js"></script>
```

Main game module imports all dependencies:
```javascript
import { GameState } from './GameState.js';
import { Player } from './Player.js';
import { PlatformManager } from './Platform.js';
// ... other imports
```

### Recent Bug Fixes
**Critical fixes implemented:**
- Fixed `GameState.reset()` incorrectly resetting `gameRunning` flag
- Fixed `restartGame()` not working during active gameplay
- Fixed platform positioning issues during window resize
- Improved platform constraint logic for canvas boundary changes

### Responsive Design
The game adapts to different screen sizes:
- Desktop: Game instructions displayed alongside game canvas, mobile controls hidden
- Mobile: Touch controls visible, collapsible instructions
- Canvas resizing handled automatically without affecting existing platforms

### Testing Architecture
Comprehensive testing strategy with multiple layers:

**Unit Tests (Vitest + jsdom):**
- GameState logic and state transitions
- Platform generation and collision detection
- Player movement and physics
- Input handling and validation
- Fast execution (<100ms per test)

**End-to-End Tests (Playwright):**
- Cross-browser testing (Chrome, Firefox, Safari)
- Real user interaction simulation
- Visual regression testing with screenshots
- Performance monitoring and error detection
- Mobile viewport testing

**Test Coverage:**
- 38 unit tests covering core game logic
- 51 e2e tests across 3 browsers (153 total test runs)
- Automated CI/CD ready configuration

## Game Constants and Tuning

Key gameplay constants defined in respective modules:
- `GRAVITY = 0.25` - Player fall acceleration
- `JUMP_POWER = 8` - Upward jump velocity
- `SCREEN_SCROLL_SPEED = 0.5` - Constant downward scroll rate
- `PLATFORM_GAP = 150` - Base distance between platforms
- `PLATFORM_WIDTH = 80` - Standard platform width

Platform spawn difficulty scaling occurs at depth milestones (100m, 200m, 500m) with increasing probability of dangerous platform types.

## Development Workflow

### Making Changes
1. Edit source files in `src/` directory
2. Run unit tests: `npm run test:unit:watch`
3. Test in browser: `npm start`
4. Run full test suite: `npm test`
5. Commit changes with passing tests

### Common Issues
- **Game not starting**: Check browser console for module loading errors
- **Tests failing**: Ensure all dependencies installed with `npm install`
- **Mobile controls not visible**: They're hidden on desktop - test in mobile viewport
- **Platform positioning**: Use `updateCanvasDimensions()` for resize handling

### Project Structure
```
NS-SHAFT/
├── src/                    # ES6 modules
│   ├── Game.js            # Main coordinator
│   ├── GameState.js       # State management
│   ├── Player.js          # Player logic
│   ├── Platform.js        # Platform system
│   ├── Physics.js         # Collision detection
│   ├── Renderer.js        # Canvas rendering
│   ├── InputHandler.js    # Input processing
│   └── UIManager.js       # UI management
├── tests/
│   ├── unit/              # Vitest unit tests
│   ├── e2e/              # Playwright e2e tests
│   └── screenshots/       # Visual regression assets
├── index.html             # Main entry point
├── style.css             # Game styling
├── package.json          # Dependencies and scripts
├── vitest.config.js      # Unit test configuration
├── playwright.config.js  # E2E test configuration
└── .gitignore           # Git ignore rules
```
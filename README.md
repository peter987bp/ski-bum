# Ski Bum

A browser-based downhill ski game built with TypeScript + HTML5 Canvas. Carve left and right through a progressively harder course, dodge trees, and stay ahead of the Abominable Snowman.

## Why This Exists

Ski Bum is a small, self-contained game project designed to be easy to run locally and easy to modify. There is no backend, no framework lock-in, and no external assets required to play. Everything happens in the browser via an 800×600 canvas.

## Quick Start

```bash
npm install
npm run dev
```

Then open the URL Vite prints (usually `http://localhost:5173`).

## Controls

| Key | Action | Notes |
| :--: | --- | --- |
| `←` | Move left | Double-press for aggressive turn |
| `→` | Move right | Double-press for aggressive turn |
| `↓` | Speed boost | Double-press for 2× speed |
| `↑` | Stop scrolling | — |

Use the **☰** menu button in-game to view controls at any time. A **Retry** button appears after you crash or finish the run.

## Gameplay Rules

- **Goal**: Survive to the end of the run.
- **Lose**: Hit a tree or let the Abominable Snowman catch you.
- **Win**: Reach the target distance (the full course length).
- The skier stays fixed in screen space while the mountain scrolls underneath.

## How It Works (High-Level Architecture)

- **Game loop**: `requestAnimationFrame` updates world scroll, player state, and collisions every frame.
- **World scroll**: The course moves upward by `worldOffset`; the skier is drawn at a fixed screen position.
- **Course system**: The entire run is generated up front as a sequence of sections (easy start → gates → dense trees → zigzags → narrow gaps → very dense → alternating walls → tight zigzag).
- **Enemies & obstacles**:
  - Trees are static obstacles placed along the course.
  - The Abominable Snowman is a screen-space chaser that moves toward the skier each frame.
- **UI**: Menu/Retry are DOM elements positioned above the canvas for reliable clicks.

## Project Structure

```
SKI_BUM/
├── index.html              # Entry HTML, canvas + menu/retry UI
├── src/
│   ├── main.ts             # Bootstraps game on DOM ready
│   ├── game.ts             # Game loop, scrolling, collisions, UI
│   ├── skier.ts            # Skier input + rendering
│   ├── course.ts           # Course generator + patterns
│   ├── tree.ts             # Tree obstacle (sprite or procedural)
│   ├── abominableSnowman.ts# Chasing enemy
│   ├── laneGenerator.ts    # Alternate lane-based generator (unused by default)
│   ├── types.ts            # Shared types
│   └── styles.css          # Layout + menu/retry styles
├── public/
│   ├── tree.png             # Optional tree sprite
│   └── skier-1938543.jpg    # Optional skier sprite
├── mcp/
│   ├── src/
│   │   ├── index.ts         # Local stdio MCP server entrypoint
│   │   └── sim/runSimulation.ts # Deterministic headless run simulation
│   ├── probe-tools.ts       # Small client for validating exposed tools
│   ├── package.json
│   └── tsconfig.json
├── dist/                    # Production build output
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## Local MCP Simulation Server

This branch adds a local-only Model Context Protocol (MCP) server under mcp/ that allows deterministic, headless Ski Bum simulations to run without launching the browser. The purpose of this server is to enable reproducible gameplay tuning, deterministic difficulty testing, and headless simulation runs from a CLI or editor-integrated MCP client.

**Architecture**

Transport: stdio (StdioServerTransport)
Scope: local machine only (no network, no SaaS, no OAuth)
Server name: ski-bum-local
Tool exposed: run_simulation

Tool: run_simulation

Inputs:
seed — integer between 0 and 2147483647
seconds — integer between 1 and 300

Output:
```JSON
{
  "seed": 42,
  "seconds": 40,
  "totalDistance": 3940,
  "crashCount": 0,
  "finalScrollSpeed": 1.85,
  "snowmanDistance": 129.7
}
```

**Simulation Properties**
The simulation runs headlessly with:
A fixed timestep (1/60)
A seeded pseudo-random number generator
Shared stepping logic imported from `src/core/`
No DOM or Canvas dependencies in the simulation path
Deterministic behavior for identical inputs

**Running the MCP Server**
From the repository root:
```bash
cd mcp
npm install
npm run build
npm run start
```
This starts the server in stdio mode for use by an MCP client such as Codex CLI or Codex Desktop.

**Verifying Tool Exposure**
To confirm the server exposes its tools:
```bash
cd mcp
npx tsx probe-tools.ts
```
Expected output:
TOOLS: [ 'run_simulation' ]

**Direct CLI Invocation**

A minimal caller script allows invoking the MCP tool without an editor integration.
```bash
cd mcp
node call-run-simulation.mjs 42 40
```
This returns raw JSON output:
```JSON
{"seed":42,"seconds":40,"totalDistance":3940,"crashCount":0,"finalScrollSpeed":1.85,"snowmanDistance":129.7}
```
This can be used for deterministic testing, regression checks, tuning passes, or future CI integration.

**Determinism**

Running:
```bash
node call-run-simulation.mjs 42 40
```
multiple times will produce identical output.
Changing `seconds` deterministically changes run length and summary metrics.
Changing `seed` deterministically changes generated simulation world state; summary metrics can still coincide for some seeds/time windows with the fixed command script.

**Security Model**

This MCP server is designed with minimal surface area:
No filesystem write access
No environment variable exposure
No network transport
Single tool exposed
Input validation enforced with Zod
Future Direction

**Planned improvements**
Adding batch simulation tools for crash-rate and difficulty analysis
Creating regression tooling for tuning validation
This simulation layer provides the foundation for reproducible gameplay tuning independent of the rendering loop.

## Configuration & Tuning

The main gameplay constants live in these files:

- `src/game.ts`:
  - Canvas size (`800×600`)
  - Base scroll speed
  - Target distance (overridden by course length)
- `src/skier.ts`:
  - Turn speed, aggressive turn speed
  - Input timing window for double-press actions
- `src/course.ts`:
  - Section length and pattern types
  - Density and spacing of trees

If you want a longer run, increase section length or add new sections in `src/course.ts`.

## Assets

The game runs fine without any images. If you provide sprites:

- `public/tree.png` is used for trees
- `public/skier-1938543.jpg` is used for the skier

If a sprite fails to load, the game falls back to simple procedural shapes.

## Scripts

```bash
npm run dev      # Start dev server
npm run build    # Type-check and build for production
npm run preview  # Preview production build
```

MCP server scripts live in `mcp/package.json`:

```bash
cd mcp
npm run dev      # Run the local MCP server with tsx
npm run build    # Compile the MCP server to dist/
npm run start    # Run the compiled MCP server
npm test         # Build first, then run source-based tests via tsx --test
```

`mcp` tests execute against source modules (not `dist` imports), and `pretest` enforces a clean build before each test run.

## Notes & Debugging

- The game includes verbose console logging for menu and retry button interactions.
- If the menu button doesn’t respond, open DevTools and watch for related logs.

## License

MIT — see `LICENSE`.

# Minecraft World Agent

Local Minecraft Java map authoring through validated MCP tools. Owner: Ivan Delić. The first real server gate passes; see [STATUS.md](STATUS.md) for evidence and unfinished work. Canonical Croatian source: [docs/MASTER_PLAN.md](docs/MASTER_PLAN.md).

## Windows

Run in this repository with **Node 24.14.0** and **Temurin JDK 25.0.1+8** on PATH:

```powershell
npm.cmd run setup
npm.cmd run deploy
# Read https://aka.ms/MinecraftEULA before using the acceptance flag.
node scripts/dev.mjs start --accept-eula
```

For a clean setup, build, deploy and server start in one command:

```powershell
node scripts/dev.mjs dev --accept-eula
```

The server binds to `127.0.0.1:25565`, online authentication on, maximum two players. Use Minecraft Java **26.2**. The local bridge binds only to `127.0.0.1:38765`. Secrets are generated in `.runtime` and are never printed. Stop the server with `stop` in its console. No manual plugin copying is needed.

## Tests and demo

With the server stopped:

```powershell
npm.cmd test
node scripts/run-tests.mjs --accept-eula
```

The managed suite starts real Paper, runs MCP fixture checks, restarts it, verifies persistence/undo and stops cleanly. It refuses a non-air fixture instead of erasing existing work. Logs and JSON evidence are in `reports/`.

With the server running:

```powershell
npm.cmd run demo
```

The demo inspects `test.chamber`, stages a 15×9×15 room, displays the dry-run and requires typing `COMMIT`. It rolls back afterwards. Automated isolated fixtures are already authorized to commit without interactive confirmation.

## MCP connection

Build first, then configure your MCP client with command `node`, argument the absolute path to `dist/apps/mcp-server/index.js`. Stdio uses local process access; the token is read from this project's `.runtime/token`. No network MCP endpoint is exposed. Do not put the token into prompts or client config. Every tool requires `actor` and `prompt`; mutation retries must reuse `requestId` and the same arguments. Tool names and lifecycle: [docs/MCP_TOOLS.md](docs/MCP_TOOLS.md).

## Linux

Use the same pinned JDK/Node, `npm run setup`, `npm run deploy`, `npm start -- --accept-eula`; `unzip` and `tar` are required. The scripts are cross-platform. Linux execution has not yet been tested on this Windows host.

## World backups

Online: `snapshot.create` then `snapshot.stage_restore`, dry-run and commit. This covers supported block data only. Whole-world archive: stop Paper cleanly, then `npm run snapshot`. Keep the archive inside `.runtime`. Do not copy a live world. [Security and coverage](docs/SECURITY.md).

No dashboard, cloud deployment or publication is included. A playable map is not declared finished until actual observer screenshots and a full human playthrough exist.

## Mining-village prototype

The current local world contains the playable village and its architectural detail pass. Start the server and join: the story starts or resumes automatically, with objectives in the action bar and every choice or clue handled by right-clicking visible objects. Chat commands are retained only for development diagnostics. Controls and current gameplay limitations are in [docs/GAMEPLAY.md](docs/GAMEPLAY.md). For a fresh world, `node scripts/run-tests.mjs --accept-eula --build-village` creates the geometry after the Connected World gate. `npm run polish:village` applies and reconciles the deterministic texture/detail recipes on a running development server.

`node scripts/run-tests.mjs --village-qa` runs real server tests plus walking reachability and mandatory-region checks. Open `reports/village-qa.html` for the semantic plan and findings. This diagram is not a renderer screenshot.

The structure authoring tool now defaults to a layered `masterwork` composition with protected entrances, oriented roofs and trim, contextual weathering, environmental story and preflight quality metrics. `build.list_structures` and `build.describe_structure` let an agent inspect the library before staging. `build.create_path` produces seeded variable-edge paths instead of rectangular connector bands. All high-level tools still return staged dry-runs and require an explicit `build.commit_transaction` call.

With the running development world, `npm run repair:portals` reconciles every declared entrance and `npm run masterwork:village` applies the bounded expert art pass. After upgrading an already-running older plugin, use `node dist/packages/test-scenarios/masterwork-village.js --legacy-compatible` until the next normal Paper restart; the full command uses oriented block states. `npm run test:builder-live` commits and exactly undoes an isolated organic-path fixture and cancels a staged structure fixture.

With the server stopped, `npm run export:prototype` holds Minecraft session locks while archiving and produces a private server-ready prototype under `.runtime/exports/`. It excludes tokens and development player/transaction state. Export is not publication or a passed human-playtest gate.

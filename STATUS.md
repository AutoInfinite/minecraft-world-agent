# Status — 2026-09-15

Connected World gate passed on a real Paper server. Full MVP is not complete.

- Full original Croatian plan saved in docs/MASTER_PLAN.md from parent task 01a09d6d-5981-7053-b8ac-71cce51ed466; not the brief.
- Official metadata verified and runtime tested: Paper 26.2 build 123 stable, WorldEdit 7.4.5, installed Temurin Java 25.0.1+8, Gradle 9.1.0, Node 24.14.0.
- `npm test`: 4 meaningful unit tests passed: policy boundaries, room geometry, 12 modules with every rotation/mirror, semantic graph and SQLite queries.
- `node scripts/run-tests.mjs --accept-eula`: actual MCP SDK stdio → TS server → authenticated bridge → WorldEdit → Paper world passed 11 checks. Evidence: reports/connected-world.json and reports/server-integration.log.
- A 15×9×15 hollow room changed exactly 824 blocks. Stage/dry-run changed zero world blocks. Seeded 20% wall pass selected 74 blocks; exact undo passed. Full room rollback matched every block state/checksum.
- Direct bridge adversarial checks independently passed: authentication, Origin rejection, allowlist, bounds, protected regions and volume.
- Snapshot stage/restore, stale-world undo conflict and durable audit linkage passed.
- Clean server restart preserved 27 committed blocks and the undo ledger; all original block states restored through MCP. Evidence: reports/restart.json, reports/server-restart.log.
- Final hardening was rebuilt and retested on actual Paper. The MCP server now exposes 19 validated tools, including staged structure placement, semantic queries and canonical gameplay inspection/self-test.
- Intentional Builder: 12 actual reusable JSON module recipes, weighted seeded palette, anchors, rotation/mirror. A transformed module was placed through MCP, reconciled with the world and undone exactly. Sponge schematics and fuller procedural passes remain.
- World Understanding: 8 canonical locations, 7 routes, 4 camera poses, JSON sources and SQLite R-tree. Semantic references/overlaps/connectivity passed. Generic map mutations remain direct canonical JSON edits.
- The actual world contains the first pass of village gate, square, survivor house, blacksmith, church, mine entrance, boss chamber, dry well and connectors. Every generated module was reconciled with actual blocks. Evidence: reports/village-build.json.
- Actual walking QA reaches all eight locations. Mine road and entrance are mandatory on that walking route. Spawn/checkpoint have solid footing and two-air-block clearance. Checkpoint to boss distance is 24 blocks. Evidence: reports/village-qa.json and reports/village-qa.html. The HTML is a semantic plan, NOT a renderer screenshot.
- Initial gameplay runtime is implemented: vanilla NPC adapter, two dialogue branches, clue, rhythm puzzle, persistent UUID state, movement triggers, checkpoint, short audio/darkness timeline, two-phase boss, spatial telegraph/hazard, death/disconnect reset and ending. Eight canonical Java transition/serialization checks passed inside the actual plugin. This is NOT real-player listener integration; no player was connected during these tests.
- Small resource pack and its HTTP endpoint are implemented/tested. It uses custom namespace/subtitles referencing existing Minecraft ambient audio, not newly composed sound or redistributed Mojang audio files. Client application remains unverified.
- Offline archives hold Minecraft session locks. An actual test rejected archiving the active world. A server-ready private prototype was exported and independently started with a fresh token; actual exported spawn blocks and clean shutdown passed. Evidence: reports/package-validation.json and reports/export.json.
- Export: .runtime/exports/village-prototype-2026-09-14T09-24-56-602Z.zip (72,158,928 bytes). SHA-256: 88651b596002db62f7e8ad26b5bd70ca1022e6ff5356a65d8ea2fe10b3781646. Tokens and development player/transaction state are excluded. This is PROTOTYPE_ONLY, not publication or a final release.
- All test servers were stopped cleanly. Everything is inside this new project folder; the Git repository is initialized.

## Coverage boundaries

Snapshots restore inert block data, including orientation; unsupported existing blocks, block entities and occupied regions are rejected. No entity/inventory/biome/scheduled-tick snapshots. Writes are conservative, synchronous and limited to 8192 blocks. A crash during apply/restore locks future mutations for operator review; automatic crash recovery is not claimed. Clean restart is tested. Human playtest and actual renderer screenshots have not occurred.

## Required remaining work

1. Actual client playthrough of intro → NPC → clue → puzzle → checkpoint → boss → ending, including real death/respawn listeners, restart and two-player synchronization. The manual form remains NOT RUN.
2. Actual renderer screenshots and Fabric observer. Operator-only saved camera teleport/yaw/pitch/time/weather is implemented; FOV/HUD/F2 capture remains manual. Reading the Minecraft client folder returned access denied, and native app control is unavailable. No screenshots were invented.
3. Organic terrain, convincing elevation descent, a separate ambush, richer environmental puzzle and balancing to the target 15–20 minutes. Architecture and arena composition have a stronger live pass, but the surrounding world datum and connectors remain mostly flat.
4. Sponge .schem import/export, richer decoration/damage/vegetation passes and generic quest/encounter authoring. Current reusable structures are actual JSON recipes.
5. Wider collision/jump QA, client resource-pack validation and one full human playthrough without developer intervention. Current geometric QA is four-neighbor standing-player walking, not every sequence break.
6. Execute Linux/CI matrix on a Linux runner. Configuration is supplied; only Windows was exercised here.

## Environment notes

Paper logs an OSHI/Perflib error reading Windows performance counters; server and listed tests continue successfully. No registry repairs or unrelated folder changes were made. Sandbox access failures required rerunning essential Java/server operations with the approved access; these were environment restrictions, not new project requirements.

## Onboarding fix — 14. 9. 2026.

User play observation: the first character could not be found. Server inspection proved no villager entity was loaded. Root cause: Mara was initially nonpersistent and her chunk was not loaded at plugin startup. Loading chunk `[5,5]` immediately produced Mara at `[87.5,101,83.5]`, confirming the mechanism.

Fix: Mara now uses a plugin chunk ticket, persistent/non-despawning glowing villager state, a floating `MARA — DESNI KLIK ZA RAZGOVOR` label, and stands on the path outside the survivor house. `/village start` now gives a named compass aimed at Mara, clears stray hostile mobs, and emits a white particle trail toward her during the prologue. Dialogue proximity accepts the outdoor meeting point. An actual entity-presence assertion was added to the real Paper integration suite.

Post-fix runtime proof: after removing the temporary vanilla forceload, rebuilding and restarting Paper, the console independently found `Mara — preživjela` at `[87.5,101.0,83.5]` and a `Text Display` containing `MARA\nDESNI KLIK ZA RAZGOVOR`. The server was left running for user review.

## No-chat interaction and architectural detail pass — 14. 9. 2026.

Gameplay no longer requires player chat input. Join automatically starts or resumes the UUID state, the action bar carries the objective, a compass and white particles guide the prologue, right-clicking Mara opens a two-choice inventory UI, and clue/lore/rhythm inputs are persistent glowing world objects. The live plugin self-test now passes nine checks and independently confirms four complete interaction markers; live entity queries found Mara plus all 12 marker entities. Development commands remain only as diagnostics.

The reusable builder now has deterministic module-specific detail recipes and seeded palette replacement. The live world received a staged texture/architecture pass across seven canonical locations: gate, square, survivor house, blacksmith, church, mine entrance and boss chamber. Added features include varied foundations, exposed timber framing, façade depth, windows/shutters, practical interiors, forge/anvil work area, pews/altar/stained-glass tower, lantern wayfinding, mine supports and a readable boss-floor sigil. `reports/village-polish.json` records a PASS and live reconciliation of every final detail coordinate. Five unit tests pass, including rotation/bounds/material-variety checks for eight reusable detail-capable modules.

Player `psihodelija` was saved at `INVESTIGATE` after that pass. A later real client session reached `READY` with the checkpoint active and recorded three deaths before disconnecting; this is server-event evidence, not a complete human playtest record. A full human playthrough and renderer-based visual critique are still not claimed.

## Expert builder composition and live safety repair — 14. 9. 2026.

A focused builder/art/runtime audit found that the earlier detail pass could overwrite the three-wide house portals with foundation blocks and a center beam. It also placed several intended floor textures at player-foot height: the gate spawn, square hub, tunnel route and boss sigil could become obstructions. The old geometric QA had run before this art pass and only proved arrival at region targets, so it did not catch composed-module portal failures.

The builder now composes ordered structure, architecture, story, contextual-weathering, lighting and protected-clearance layers. Every masterwork recipe is deterministic, stays within its declared transformed bounds and 128-operation limit, validates required portals plus spawn/checkpoint/hub/arena volumes, and returns preflight quality metrics. Stair, slab, trapdoor, log and lantern block-data states are NBT-free, base-material allowlisted in both control layers, authoritatively parsed by Paper, and rotate/mirror with geometry. Failed high-level staging cancels its incomplete transaction.

New read-only `build.list_structures` and `build.describe_structure` tools expose the 12-recipe catalog and its diagnostics. `build.place_structure` now accepts `shell`, `detailed` or default `masterwork` quality. New `build.create_path` stages center-continuous, variable-edge paths with correlated material clusters and reports length, turns, palette and irregular-edge counts instead of generating only rectangular cobblestone bands.

Eight meaningful unit tests pass, including composed portal/reserved-volume safety, allowlisted block states, exact state rotation/mirror and organic-path continuity. A real live Paper smoke test staged a turning five-material path, confirmed zero pre-commit mutation, committed 77 blocks, and restored the exact baseline checksum through undo. It also queried the structure catalog and cancelled a staged structure without world mutation. Evidence: `reports/expert-builder-smoke.json`.

The running development world received a backward-compatible art migration through guarded transactions. All declared portals, spawn, checkpoint, hub and arena clearances now reconcile as air; the entity-safe repair fell back to isolated block cells around a creeper without removing the entity. The church's former solid stained-glass tower volume was rebuilt as a hollow shell with thin window planes. The gate, square, mine approach and boss arena received compatible massing/floor/story improvements; one boss-region subset remains safely skipped because dropped item entities occupy its exact volume. Evidence: `reports/portal-repair.json` is PASS and `reports/village-masterwork.json` is PARTIAL with exact transaction bounds.

Post-migration live geometric QA passes again: all eight canonical locations are reachable, mine road and entrance remain mandatory, and checkpoint-to-boss walking distance is 30 blocks. Evidence: `reports/village-qa.json`. Ten camera poses now include six player-eye composition views in addition to the overview views.

An independent final review found and fixed remaining control/evidence gaps: the TypeScript layer now enforces the transaction operation limit before Paper, `shell` quality also stages protected clearances, portal repairs roll back every opened transaction on failure and verify cell dry-runs, even path widths are exact, steep unwalkable path segments are rejected, and the staged-structure smoke test now compares live checksums before and after cancellation.

The rebuilt plugin and updated model were activated by a graceful Paper restart on 15 September 2026. Block-state authoring, the expanded camera registry and the `3:07` runtime are now loaded. The full `npm run masterwork:village` pass has not been rerun since that restart. Actual Minecraft renderer screenshots, Fabric observer automation, organic terrain/elevation work and a complete human playthrough remain unverified. Expert-level or creator-level visual quality is therefore not claimed yet.

## 3:07 prototype — 15. 9. 2026.

A second isolated solo horror prototype, `3:07`, now has a canonical nine-region/eight-route semantic model, a deterministic transaction-safe build plan and a dedicated Paper gameplay runtime. The actual world build passed staged preview-hash commits and live reconciliation across 11 bounded batches. Twelve authored route checkpoints have solid footing and two-block clearance; exterior route and stair-continuity QA pass. Evidence: `reports/three-oh-seven-build.json` and `reports/three-oh-seven-qa.json`.

The current TypeScript unit suite passes nine meaningful tests, including isolation and transaction safety for the `3:07` plan. This is not a real-player result. Manual playtesting remains `NOT_RUN`, renderer screenshots remain `NOT_CAPTURED`, and the intended 8–12 minute duration and scare timing are unverified.

Post-restart proof: Paper stopped through Bukkit's normal shutdown path, disabled WorldAgent and WorldEdit, saved players and all dimensions, then restarted on the pinned Paper 26.2 build 123. The live plugin self-test passed nine village checks with four physical interaction markers and twelve canonical `3:07` runtime checks. Zero players were online during verification. This proves the latest runtimes are loaded, not that either map has passed a real-player playthrough.

## Open-source repository — 15. 9. 2026.

The source, documentation, structure recipes and non-sensitive evidence are public at `https://github.com/AutoInfinite/minecraft-world-agent` under the MIT license. Git ignores tokens, live worlds, downloaded binaries, build output and runtime logs. This source publication does not make either prototype map a finished or approved release.

# Minecraft World Agent

Owner: Ivan Delić. Project root: `C:\Users\delik\Desktop\minecraft-world-agent`.

This is an execution brief distilled from Ivan's full Croatian implementation plan in the originating Codex conversation. Consult that conversation for the full source plan. The user authorized creating this Desktop project and implementing the plan with Astra Codex.

## Product and defaults

Build a local development environment in which Codex plans, builds, inspects, tests and iteratively repairs custom Minecraft Java adventure maps. Understand locations, gameplay rules and story beats rather than only coordinates. Use Windows development with Linux server compatibility, solo-first design supporting two players, a new test world, a small resource pack and the horror mining-village vertical slice. Start NPC presentation with a simple vanilla adapter behind an independent canonical gameplay model. Verify mutually compatible Minecraft/Paper/WorldEdit versions from official sources and pin all versions; never silently upgrade. Use Java/Gradle for a custom Paper plugin, TypeScript/Node for MCP, YAML/JSON canonical model files plus SQLite spatial index, WorldEdit adapter for bulk building, and eventually a Fabric companion observer for actual renderer screenshots. No dashboard or SaaS before a complete playable internal workflow.

## Delivery order

Implement narrow end-to-end milestones, validate each, then expand. First prove Connected World; do not build a huge catalog of stub tools. Keep a durable status file with completed, tested, blocked and remaining items. Do not describe mocks or unrun tests as real Minecraft integration. Continue authorized implementation as far as feasible; record environmental limitations accurately.

1. Connected World: reproducible setup, pinned toolchain, local Paper test server, Java bridge, MCP schemas, bounded inspection and mutation, transaction/dry-run/commit/rollback, snapshots, audit and real fixture integration tests.
2. Intentional Builder: deterministic weighted palettes and seed; wall/floor/ceiling/arch/pillar/stairs/roof/path; house/ruin/tunnel/cave room; reusable schematics and anchors; rotation/mirror; structural, variation, damage, vegetation and lighting passes; 10–15 initial mining village modules.
3. World Understanding: schemas for region/landmark/route/camera/story beat, YAML/JSON plus SQLite spatial lookup, directed main/optional gameplay graph, overlap/disconnection/dead-end checks, reconciliation after world changes, simple model export.
4. Playable Story: persistent player state, independent NPC display adapter, branching dialogue conditions/effects, quest state machine, trigger event bus, checkpoint/death reset, cutscene timeline, encounter/boss phases, debug state and resource-pack handshake/asset registry. Intro to ending must survive restart where intended.
5. See and Repair: spectator observer, saved camera poses, yaw/pitch/FOV/HUD/time/weather, real screenshots with metadata, entrance/hero/route reveal/encounter views, visual critique protocol and before/after gallery. Bound repair iterations and edit surface. A semi-automatic observer can precede the Fabric mod.
6. Ship a Map: reachability/collision/jump profiles, mandatory trigger coverage, quest graph/sequence-break checks, death/reset tests, spawn safety, checkpoint-to-boss distance, scripted test-player cases, Markdown/HTML QA reports, project generator/templates and world/plugin/resource-pack export. Manual playtest remains a human gate.

## First sprint acceptance

Read `test.chamber`, plan a 15 x 9 x 15 stone room with north and south entrances, return a dry-run, commit the approved plan, report changed blocks, then roll back to identical fixture state. The demo request includes confirmation before the room commit: preserve this behavior in the demo workflow. Tests on isolated fixtures can execute the full lifecycle.

- No world mutation before commit; clearly distinguish staged operations from committed undo.
- Dry-run returns explicit bounds, block estimate and palette.
- Reject any change outside the active build zone, into protected regions or beyond configured volume.
- Rollback restores fixture block state exactly; document entity/block-entity and other snapshot coverage honestly.
- Audit links prompt/actor, tool call, transaction and change ID.
- Server unavailable errors must be readable.
- A documented Windows command builds/deploys the plugin and starts the test server without manual file copying.
- Provide snapshot/restore and automated fixture tests; verify the actual MCP-to-bridge-to-world path when dependencies permit.

Start with inspection (`world.get_blocks`, `world.get_entities`) and transaction-based region filling; include whatever explicit transaction lifecycle tools are necessary rather than sacrificing safety to an arbitrary four-tool count. Add palette replacement for the phase-one demo: change 20 percent of wall blocks to cracked variants deterministically, then undo.

## Security and consistency

Both control layers enforce authenticated loopback-only access, operation allowlists, explicit bounds, volume limits and protected regions. No unrestricted run_command or shell through the bridge. Validate schemas, constrain paths to the project, snapshot risky changes, support dry-run and rollback, and persist an audit trail. Handle timeout/retry without accidentally applying a mutation twice. Respect Paper thread ownership and safe world-save consistency when snapshotting. Keep generated secrets out of Git. Preserve unrelated Desktop content.

## Target repository

README.md; AGENTS.md; CLAUDE.md; docker-compose.yml when useful; docs/{PRODUCT,ARCHITECTURE,MCP_TOOLS,WORLD_MODEL,SECURITY,TESTING,ROADMAP}.md; apps/{mcp-server,paper-plugin,observer-client,world-dashboard}; packages/{tool-schemas,world-model,build-primitives,test-scenarios}; projects/abandoned-mine/{story,map,quests,dialogue,encounters,structures,resource-pack,screenshots,tests}; server-dev/{plugins,world,server.properties}; scripts/{setup-dev,start-server,build-and-deploy,snapshot-world,run-tests}; .github/workflows. Dashboard is deferred. Ignore world binaries, downloaded server/plugin jars, generated assets, tokens and snapshots in Git; use controlled exports/releases.

## Semantic model

Locations carry stable IDs, type/role, 3D inclusive bounds, entrances, landmarks, story beats and gameplay tags. Model regions/subregions, structures/components, main/optional routes, chokepoints, camera/sightline poses, NPCs/quests/triggers, encounters, protected areas and dependencies. Example hub `village.square` has bounds min [110,62,-80], max [165,90,-25], entrances `village.gate` and `mine.road`, church tower and dry well landmarks, missing-miners story beat, safe-intro and investigation tags. Use references consistently; the original illustrative YAML calls the hub `mining_village.square`, while the canonical vertical-slice table uses `village.square`.

## Intended API families

World: summary, sampled blocks, entities, inspect checks, heightmap, light report, change history.
Build: begin transaction, fill region, replace palette, place structure with rotation/mirror, path, room, seeded decoration and damage, commit, rollback and undo.
Map: create/update regions, link routes, landmarks, saved cameras, gameplay graph.
Gameplay: NPC, dialogue tree, quest, trigger zone, checkpoint, cutscene, encounter, boss and progression simulation.
Camera/QA: teleport, capture, reachability, sequence breaks, trigger coverage, spawn safety and suite runner.
Favor meaningful architecture/module/gameplay operations over per-block calls. L5 intent such as district or gameplay segment is orchestration over validated primitives.

## Vertical slice: The Village Below

15–20 minutes, horror, 1–2 players, solo-first. Wake at abandoned mining village entrance. Traces of recent life; survivor withholds truth. Investigate square, blacksmith and optional church lore. Puzzle opens mine route. Descent triggers ambush and cutscene. A two-phase spatial boss reveals that villagers deliberately sealed something underground.

- village.gate: onboarding, controlled square reveal, first audio cue.
- village.square: hub, dry well, church tower, three readable routes.
- village.blacksmith: clue, key item, environmental story.
- village.church: optional hidden lore and boss preparation.
- village.survivor_house: branching NPC conversation and quest activation.
- mine.road: tension, blocked main path and small traversal puzzle.
- mine.entrance: point of no return, checkpoint and cutscene.
- mine.chamber: two-phase boss arena, safe spawn and readable hazards.

## Testing and completion

Unit checks: schemas/config, quest transitions, dialogue conditions/effects, seeded palettes, coordinate transforms and semantic graph. Integration: MCP bridge world lifecycle, structure placement, trigger-to-quest, death-to-checkpoint and restart persistence. Golden fixtures compare block counts/types, entities, metadata and structure checksums; screenshots are supporting evidence. Manual playtest records confusion, discoveries, attempted skips, segment duration, deaths/return time, objective clarity and atmosphere.

MVP requires clean documented setup; validated tools; bounds enforcement; auditable dry-run/rollback for major changes; model/world consistency; completable vertical slice; restart persistence; no known main-route softlock; boss death reset; automated real screenshots; documented build/test/export; packaged world/plugin/resource-pack/instructions; and at least one full human playthrough without developer intervention. Never claim that human gate passed without evidence.

Ivan owns creative direction, canonical creative choices, fun/pacing, reference art, final polish and publication decision. Codex owns implementation, tooling, schemas, procedural passes, tests, configuration, reports and packaging. Do not publish or commercialize automatically. Long-term wiki is C:\Users\delik\Desktop\Work Stuff\Obsidian-Codex\second-brain (not the reference clone); consult hot.md then index only when needed for context outside this project, and offer saving durable cross-project knowledge.

# Connected World tools

All arguments include `actor`, `prompt` and optional UUID `requestId`. JSON schemas reject unknown fields. Coordinates are inclusive integer `[x,y,z]` bounds. `transactionId` is also the committed `changeId`.

| Tool | Additional arguments | Effect |
|---|---|---|
| world.get_summary | none | Runtime versions and policy |
| world.get_blocks | bounds | Every block data string and checksum, maximum 8192 |
| world.get_entities | bounds | UUID, type, position |
| world.get_change_history | none | Transaction summaries and snapshot bounds |
| build.begin_transaction | name, bounds | Captures baseline; no mutation |
| build.fill_region | transactionId, bounds, block | Stages fill |
| build.replace_palette | transactionId, bounds, from, to, percent, seed | Stages exactly floor(matches × percent / 100), sorted by seeded position hash |
| build.dry_run | transactionId | Bounds, volume, changedBlocks, palette, previewHash |
| build.commit_transaction | transactionId, previewHash | Commits exact reviewed plan |
| build.rollback_transaction | transactionId | Cancels staged plan or restores committed before-image |
| build.undo | transactionId | Same guarded committed undo |
| snapshot.create | name, bounds | Stores supported block data |
| snapshot.stage_restore | snapshotId | Creates restore transaction; still needs dry-run/commit |

No network retry may invent a new request ID for a potentially applied mutation. An exact replay returns its durable receipt. Other errors include OUTSIDE_BUILD_ZONE, PROTECTED_REGION, VOLUME_LIMIT, WORLD_CONFLICT, UNDO_CONFLICT, REGION_OCCUPIED, UNSUPPORTED_SNAPSHOT_BLOCK and RECOVERY_REQUIRED. MCP returns readable tool errors when Paper is unavailable.

## Implemented authoring extensions (22 tools total)

- `build.list_structures`: seed. Read-only catalog with dimensions, anchors and masterwork metrics.
- `build.describe_structure`: structureId, seed, quality (`shell`, `detailed`, `masterwork`). Read-only preflight with ordered layers, exact palette, portal diagnostics and operation counts.
- `build.place_structure`: structureId, origin, rotation, mirror, seed, quality, optional requestId. Defaults to `masterwork`; stages the composed recipe and returns a dry-run with anchors, layer purposes and quality metrics. Required portals are carved last and validated. Stair/log/trapdoor/slab/lantern block states rotate and mirror with geometry. It never commits. If child staging fails, the incomplete transaction is cancelled.
- `build.create_path`: 2-32 control points, width 2-5, style (`village`, `mine`, `ritual`), seed, optional requestId. Stages a center-continuous path with irregular edges and correlated three-block material clusters; returns length, turns, palette and edge-variation metrics. It never commits.
- `map.get_region`: regionId; semantic location and neighboring routes.
- `map.query_regions`: bounds; SQLite R-tree overlap query.
- `map.get_gameplay_graph`: canonical graph and consistency findings.
- `gameplay.get_state`: optional playerId; saved progression and runtime counts.
- `gameplay.run_self_test`: nine canonical transition, serialization and physical-marker checks inside the plugin; explicitly not a full real-player listener playthrough.

Block inputs accept validated, NBT-free Bukkit block-data properties only when their base material is allowlisted. The TypeScript layer validates syntax and base material; Paper performs authoritative property/value parsing. Existing block-entity restrictions remain unchanged.

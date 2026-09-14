# Security and snapshot coverage

Both layers validate bounds, the 8192-block limit, transaction bounds, protected regions and material allowlist. Java remains authoritative even for direct HTTP requests. Loopback binding, a 256-bit bearer token, Origin rejection, POST-only endpoint, 1 MiB request limit and bounded HTTP workers reduce the local attack surface. Stdio MCP relies on local process permissions; keep the token readable only by the owner. On Windows the file inherits the user's project ACL.

No shell or arbitrary Minecraft command is available. No caller-supplied filesystem paths are accepted by bridge tools. Snapshot/transaction IDs are UUIDs and map to records, not paths. Root scripts resolve their own project directory. Downloads are exact URLs checked against SHA-256/SHA-512 pins. Npm dependencies use exact versions and package-lock; Gradle dependency locking is enabled. Never silently update.

Snapshots cover supported inert block data, including orientation properties, only. They do not cover inventories, block-entity NBT, entities, biome data or scheduled ticks. The bridge rejects unsupported existing materials, tile states and regions containing entities before mutation/snapshot. WorldEdit side effects are disabled. Player/environment changes after staging cause WORLD_CONFLICT; changes after commit cause UNDO_CONFLICT. Avoid editing while players are near the build zone.

The local development server uses online-mode=true and binds localhost. It is not a public hosting configuration. Ledger/audit retention is currently manual; long-running production use requires compaction and admission/rate controls beyond this local authoring baseline.

Clean restart persistence is tested. Process/power failure during world apply is fail-closed, not automatically recovered. Stop the server, preserve ledger/audit and world evidence, then restore a known stopped-world backup or implement an explicit reviewed recovery tool. Never delete APPLYING records to bypass the lock.

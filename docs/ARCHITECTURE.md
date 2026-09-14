# Architecture

MCP SDK stdio → TypeScript schemas and policy → authenticated loopback HTTP → Paper scheduler → WorldEdit edit session → world. JSON source files describe the semantic map; a rebuildable SQLite spatial index follows. Java owns authoritative world transactions and audit.

The bridge HTTP threads parse bounded requests and submit work to the Paper main thread. World reads, conflict checks, WorldEdit writes, world save and ledger mutation are serialized there. A transaction stores a complete bounded before-image and staged after-image. Begin and fill only read/update the ledger. Dry-run returns a SHA-256 approval hash. Commit requires that exact hash and an unchanged baseline, persists APPLYING plus before-image, applies through WorldEdit with side effects disabled, saves the world, then persists COMMITTED. Undo checks the full after-image before restoring.

The ledger uses fsync and atomic replacement. Request receipts preserve retry identity across restart; reusing an ID with different arguments is rejected. HTTP timeout reports an ambiguous result with the original request ID. An interrupted APPLYING/RESTORING record locks mutations at startup. Manual recovery from a whole-world backup is currently required; do not claim crash-atomic world transactions.

WorldEdit supplies bulk editing, while our journal supplies durable safety independent of WorldEdit session memory. Existing block entities, players and living entities in a mutation region are rejected until complete snapshot support exists. Plugin-owned Display and Interaction prompts are allowed because block fills cannot mutate them. The project intentionally avoids exposing arbitrary server commands.

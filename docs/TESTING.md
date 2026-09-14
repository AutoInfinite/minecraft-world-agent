# Testing

`npm test` validates policy boundaries and exact geometry independently of Minecraft. These are unit tests, not server integration.

`node scripts/run-tests.mjs --accept-eula` owns a real Paper lifecycle and speaks through the actual SDK stdio MCP client. It verifies an initially empty 15×9×15 fixture at [0,100,0]–[14,108,14], no mutation before commit, 824 changed blocks, 74 deterministic cracked wall blocks, idempotent commit, stale undo rejection, exact rollback, snapshot restore and audit linkage. Direct authenticated HTTP probes independently test the Java protection layer. A second 27-block fixture proves commit/save/restart/undo persistence. The server is stopped cleanly afterwards.

Evidence: reports/connected-world.json, reports/restart.json and server logs. These contain runtime versions and actual checksums. No screenshots are synthesized or substituted for Minecraft renderer captures.

Manual playtest remains mandatory: record each segment duration, confusion, discoveries without hints, attempted skips, deaths and return time, objective clarity, atmosphere and developer interventions. No automated test substitutes for that human gate.

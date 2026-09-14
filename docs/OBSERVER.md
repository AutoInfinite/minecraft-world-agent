# Observer status and next step

`Codex Observer` is now a visible, persistent server-side avatar. It is a named, armoured ArmorStand placed on a canonical camera footing and retained by a plugin chunk ticket. The authenticated MCP tools `observer.get_state` and `observer.place` can inspect it and move it only between declared map cameras; it is intentionally excluded from block-write occupancy checks so it cannot stop a safe art transaction. Run `npm run observer:avatar` against a running server to prove the avatar exists at the `three07-phone` footing.

This avatar is not an authenticated Minecraft Player, has no account, network input or renderer, and therefore is not evidence of a real client screenshot or playthrough. It gives the authoring agent a truthful, visible in-world presence without weakening the local `online-mode=true` server.

Ten saved cameras exist in canonical JSON: the four overview/encounter poses plus player-eye square arrival, Mara approach, smith reveal, church reveal, mine threshold and encounter threshold views. The Paper command `/village camera <id>` applies position/yaw/pitch and per-player time/weather for an operator. This is a working semi-automatic camera path, not an automated screenshot observer.

Minecraft renderer screenshots have not been automatically captured. A user supplied a manual pre-change `3:07` screenshot set, but the current session does not control a licensed Minecraft account/client. No client installation or account access is inferred from that result. Headless world inspection, the server avatar and the semantic HTML plan are not screenshots.

Next: use an accessible licensed Minecraft Java 26.2 client, verify the saved poses, then add a pinned Fabric companion that applies FOV/HUD, waits for chunks/render stabilization and returns F2-equivalent PNG plus metadata. Required metadata: camera ID, actual position/yaw/pitch/FOV, HUD, time/weather, world build/change ID, client/server version, timestamp and image hash.

Bound visual repairs to three passes per review and 8192 blocks per transaction. Preserve before/after images. Stop when the stated framing/readability issue is resolved. Do not claim See and Repair before actual renderer evidence exists.

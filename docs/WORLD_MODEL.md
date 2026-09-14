# Canonical world model

Source: projects/abandoned-mine/map/world.json. Zod validates stable IDs, inclusive 3D bounds, roles, tags, story references, axis-aligned route waypoints, landmarks and cameras. `village.square` is canonical; the original plan's illustrative `mining_village.square` is not a second location.

Eight locations and seven directed route definitions include explicit bidirectional traversal where intended. Validation detects duplicate locations, broken references, disconnected nodes, non-ending dead ends and bounding-box overlap. SQLite's R-tree indexes all six coordinate extents; it is derived from JSON and can be safely rebuilt. Node 24's built-in SQLite is marked experimental, so the Node version is pinned.

MCP: map.get_region, map.query_regions and map.get_gameplay_graph. Creation/editing currently uses canonical JSON plus schema validation; generic map mutation tools are not implemented. The module library is twelve actual JSON recipes with seed, fills and anchors. These are our reusable recipe format; Sponge .schem import/export is not yet implemented.

Actual placement tests reconcile every generated material. Route QA reads real world block data, checks solid footing and two-block clearance, walks a four-neighbor graph and tests mandatory trigger regions as graph cuts. It does not yet model arbitrary collision shapes, jumping, swimming, enemies or all sequence breaks. A sampled or semantic model is not proof of visual quality.

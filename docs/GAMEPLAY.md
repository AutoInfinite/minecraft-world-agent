# Playable prototype controls and coverage

Join Minecraft Java 26.2 at `localhost:25565`. No chat input is required. A new game starts automatically at the gate with a compass, sword, shield and food; an existing game resumes its saved objective. The current objective stays in the action bar.

1. Follow the compass and white particle trail to the glowing villager Mara west of the square, then right-click her.
2. Click either dialogue choice in the inventory window. Both branches begin the investigation.
3. Enter the eastern blacksmith and right-click the glowing **KLJUČ PEČATA**. It reveals the rhythm clue.
4. Optional: visit the southwest church and right-click **ZABRANJENI ZAPIS** for preparation and the villagers' secret.
5. On the north mine road right-click the physical seals in the shown order: **LIJEVI, DESNI, LIJEVI**. Incorrect input resets the sequence.
6. Enter the mine for a saved checkpoint, short darkness/audio timeline and the next objective. The movement gate rejects early entry.
7. Enter the chamber and fight the seal keeper. At half health it moves faster and telegraphs alternating arena halves one second before a damaging pulse.
8. Boss defeat completes the story. Death/disconnection resets the encounter and retains the checkpoint; both participants are returned to the checkpoint when an encounter resets.

Progression is a Java model independent of the vanilla villager presentation adapter. Player UUID state is saved with fsync and atomic replacement. Restart converts an active encounter back to READY. Runtime listeners cover the automatic join flow, world-object interaction, inventory dialogue, movement triggers, resource-pack status, death/respawn and boss lifecycle. The optional small resource pack has built-in sound fallback; it is offered from the local /pack endpoint.

**Verified:** canonical progression, file serialization, Mara and all four physical interaction points run inside the actual plugin. **Not yet verified:** a complete real-player intro-to-ending playthrough, death flow, two-player encounter synchronization, client pack application and pacing. Generic quest/dialogue/encounter authoring schemas and an ambush separate from the boss remain to be expanded.

Operator-only `/village camera entrance|hero|route-reveal|encounter` switches to spectator, teleports to canonical poses and sets player time/weather. FOV, HUD and F2 capture remain manual. No automated screenshot claim is made.

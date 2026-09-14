# The Village Below

8 locations; 7 routes; 0 errors; 0 warnings.

| Location | Role | Story |
|---|---|---|
| village.gate | onboarding | wake |
| village.square | hub | missing-miners |
| village.survivor_house | dialogue | survivor-lie |
| village.blacksmith | investigation | seal-key |
| village.church | optional-lore | deliberate-seal |
| mine.road | puzzle | open-route |
| mine.entrance | checkpoint | descent |
| mine.chamber | boss | truth |

```mermaid
graph TD
  village_gate <--> village_square
  village_square <--> village_survivor_house
  village_square <--> village_blacksmith
  village_square <--> village_church
  village_square <--> mine_road
  mine_road <--> mine_entrance
  mine_entrance <--> mine_chamber
```

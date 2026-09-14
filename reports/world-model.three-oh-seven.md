# 3:07

9 locations; 8 routes; 0 errors; 3 warnings.

| Location | Role | Story |
|---|---|---|
| apartment.bedroom | cold-open | wake-at-307 |
| apartment.stairwell | descent | door-click, first-glimpse |
| building.courtyard | pursuit | lost-rabbit |
| neighborhood.street | pursuit | one-corner-ahead |
| neighborhood.phone | voice-clue | payphone-message |
| neighborhood.playground | dread-peak | empty-swing |
| neighborhood.alley | blackout | dont-turn-around |
| apartment.return | reversal | son-is-home |
| apartment.final-room | ending | something-followed |

```mermaid
graph TD
  apartment_bedroom --> apartment_stairwell
  apartment_stairwell --> building_courtyard
  building_courtyard --> neighborhood_street
  neighborhood_street --> neighborhood_phone
  neighborhood_phone --> neighborhood_playground
  neighborhood_playground --> neighborhood_alley
  neighborhood_alley --> apartment_return
  apartment_return --> apartment_final-room
```

# Raid Review 1.7.0

## Map reworks get the right replay map

Map reworks that keep BSG's location id (LennoxP90's **Interchange Rework**, Manimal's **Lighthouse 1.0
backport**) used to replay on the vanilla render. The client now detects the loaded variant at raid start
(reworked scene names, or the rework plugin's own flag) and sends it as `locationVariant` in the START
packet; the server stores it (new `raid.locationVariant` column, migrated automatically) and the frontend
picks the matching render when it has one.

- Reworked Interchange replays on tarkov.dev's 1.0 Interchange render (`interchange-rework` in maps.json),
  with the mall's upper floors hidden so the ground level stays readable. Satellite tiles are not
  available for it yet.
- The Lighthouse backport is detected and labelled ("Lighthouse (1.0 rework)") but keeps the vanilla
  render until a distinct one exists.
- Raid list and raid overview show the variant in the map label.

Same detection signatures as ORBIT 2.1, so both tools agree on what was loaded.

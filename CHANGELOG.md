# Raid Review 1.9.0

For SPT 4.1.x. Cumulative changes since Raid Review 1.8.0, including the 1.9 release candidates.

## Raid import and export

- **Export raid:** save a completed raid as a ZIP to share its recorded positions, events and ORBIT data. Personal SPT profiles and settings are not included.
- **Import raid:** open someone else's recording from **Recent Raids** and replay it in your own RR interface.
- Imported raids are labelled and protected from automatic cleanup. Importing the same raid again keeps the existing recording unchanged.
- Invalid archives and missing position data produce clear feedback.
- For ORBIT debug reports, extract **RaidReview/raid-export.zip** first. Import that file, not the outer ORBIT debug ZIP.

## New replay features

- **ORBIT 3.0 objectives:** follow Rush routes and visited spawn sectors, sniper positions, ambushes, extract camps and multi-step objectives. See the squad's current stage and hold/departure timers.
- **Character and bot orientation:** optional arrows show the direction each character's body is facing. Enabled by default unless previously disabled, with a toggle in the map playback settings. Ghost bots and recordings without orientation data keep their existing round markers.
- **Squad waiting:** ORBIT squadmates waiting in cover appear in orange.
- **Airdrop tracking:** replay the aircraft's route, crate release and landing, alongside ORBIT squads heading toward the drop.
- **Switch states:** see when relevant switches were activated, with their states following the replay timeline.
- **Floor filtering:** optionally limit map markers, objectives, trails, loot and other supported overlays to the selected floor.
- **Ghost wake details:** inspect recorded wake reasons and search their details.
- Cyrillic bot names are displayed in Latin characters, including in Ghost wake details.
- The raid list shows full dates and local times.

## Headless improvements

- Headless recordings show readable participant names, such as **Chazut (headless)**, while preserving the underlying profiles and separate player recordings.
- Headless Scav raids correctly display **SCAV** and the player's name followed by **(headless)**.
- Fixed raid cleanup incorrectly marking remaining bots as extracted. Older affected recordings retain their last known state, with recorded deaths taking priority.
- Missing item names are resolved using the server's loaded mod translations.
- New recordings preserve container identities so loot can display names such as **Duffle bag** instead of **Container**.
- Fixed the peak active bot count to track the population present together.

## Performance

- Reduced repeated bot lookups and moved more recording work off the gameplay thread.
- Improved recording diagnostics to help investigate missing events and performance issues.

## Fixes

- Resolve ORBIT behaviour from the active brain layer and live objective telemetry, including bots not managed by SAIN. This fixes missing ORBIT labels when BigBrain exposes a numeric decision.
- Stop treating BigBrain action numbers as fixed SAIN categories: registration order varies between mod setups. Unidentified numeric actions in older recordings are shown as Unknown instead of being falsely labelled combat, extraction or fleeing.
- Preserve native and combat ownership when ORBIT is not the active layer, even if objective telemetry is still available.

- Fixed SQLite conflicts with mods such as DaCard that could prevent the RR server from starting.
- Fixed Raider Hunters being displayed as UNTAR instead of Raiders.
- Fixed some surviving Scavs being incorrectly listed as extracted.
- Confirmed bot extractions remain **Extracted** after cleanup instead of becoming **Removed**, and recorded deaths keep priority.
- ORBIT multi-step extraction objectives now use the Extract category in replays.

## Updating

Install the **entire ZIP**, including its `lib`, `runtimes` and upgrade files. Existing settings and recorded raids are preserved.

With Fika, update the RR client plugin on both playing clients and the headless installation.

New replay information requires recordings made with updated clients. Older raids remain usable, and display corrections apply wherever the necessary data already exists. Missing historical orientation cannot be reconstructed, and older containers recorded without a name or template ID remain generic.

After updating, press **Ctrl + Shift + R** in your browser to reload the page and bypass the cache.
## Compatibility notes

- Existing recordings and settings are preserved. Imported raids do not replace the player's profile or configuration.
- Use matching RR clients on playing and headless instances when recording new replay fields.
- The release contains Windows x64 and Linux x64/ARM64 native SQLite libraries. Included Linux binaries do not constitute Linux runtime validation.

# SPT Raid Review
![Stars](https://img.shields.io/github/stars/Chazut/SPT-RaidReview?style=flat-square&label=STARS&color=007ec6)
![Issues](https://img.shields.io/github/issues/Chazut/SPT-RaidReview?style=flat-square&label=ISSUES&color=44cc11)
![Downloads](https://img.shields.io/github/downloads/Chazut/SPT-RaidReview/total?style=flat-square&label=DOWNLOADS&color=44cc11)

Every raid you play gets recorded: positions, kills, loot, bot decisions.
After extract, replay the whole thing on an interactive map, scrub the
timeline, and find out what actually happened - who hunted you across the
map, what that scav was thinking, where the good loot you missed was
sitting.

[Watch Preview](https://spt-raid-review.pages.dev/m2-res_1080p.mp4)

Once installed, play a few raids, then hit **F5** in game (or browse to
`http://127.0.0.1:7829`).

---

### Installation

Download a compatible version from the **[releases](https://github.com/Chazut/SPT-RaidReview/releases)** tab. Instructions for each version are included in the corresponding release description.

- **SPT 4.1.X**: version 1.5.0 and newer.
- **SPT 4.0.X**: versions up to 1.4.x.

When upgrading an older installation, keep your `data/` and `config/` folders,
but remove `Microsoft.Data.Sqlite.dll` and `SQLitePCLRaw.*.dll` from the root of
`user/mods/RaidReview` before extracting the update. These dependencies now live
in `lib/sqlite/` so they can coexist with other mods' SQLite versions.

---

### Features

- Full raid replay on an interactive map (timeline scrubber, follow mode, floors)
- **Selected floor only** filters replay markers, movement trails, loot, objectives, shots, switches and the heatmap using each map's height and building boundaries. Off by default, remembered in the browser. Unsupported maps remain unfiltered; records without a usable height, including historical 2D field zones, are hidden while filtering.
- Switch replay: the **Switches** toggle shows initial states and later changes on the map. Markers follow the timeline, including rewind and automatic shutoff; hover to see the name, state, height and change time. Requires a new recording.
- Main objective markers stay above switch icons. Updated ORBIT extract camps show that they run last and hold until time-based extraction; older recordings keep their recorded timers.
- Airdrop replay: aircraft icons follow the recorded flight path, cyan diamonds mark release points, and yellow crates appear on landing. All follow the replay timeline and the **Airdrops** toggle. Requires a new recording; remote clients distinguish a crate first observed in flight from a confirmed release.
- With the updated ORBIT client, **ORBIT Main Objectives** also shows a temporary **Airdrop** row from the squad's decision: approach, waiting (including the crate's descent), then loot. Select a squad to see its current stage and target. The row disappears when the detour ends and follows replay rewinds; older recordings remain supported.
- Kill lines, death markers, killfeed details
- Post-raid leaderboard
- Charts: kills, looting, bots over time, factions...
- Bot behavior rings and per-bot timeline
- Loose loot and bot inventories on the map
- Grenade trajectories, ballistics, hit flashes
- Mod integrations: SAIN, ORBIT (ghosts included), QuestingBots, LootingBots
- Ghost hearing replay: enable **Ghost hearing** to see a small ear icon beside Ghost squad members for eight seconds after a recorded decision to investigate a sound. Hover or focus an icon to reveal the sound location and a dotted connection. Ignored sounds stay hidden. Requires hearing decisions recorded by compatible ORBIT and RaidReview clients; older raids without those events remain unchanged.
- Faction badges for modded bots: UNTAR, RUAF, Black Division, ISB, Combine Soldiers
- ISB White Tusks have a separate **ISB WT** display group and **WT** map markers,
  including the March squad and original commanders. Recorded faction and bot
  behaviour are unchanged. Older replays are recognized when their saved role or
  ISB display name identifies a White Tusk.
- Fika support, see [REMOTE_HOST_AND_FIKA.md](REMOTE_HOST_AND_FIKA.md)

---

### Project Structure

| Component | Path | Tech | Purpose |
|-----------|------|------|---------|
| **Client** | `/Client` | C# .NET 4.7.2 / BepInEx | Game plugin: patches EFT methods, streams data via WebSocket |
| **Server** | `/ServerMod` | C# .NET 10 / Kestrel | SPT 4.1 server mod: WebSocket + HTTP server, SQLite storage |
| **Frontend** | `/Private` | React 18 + TypeScript + Vite | Web UI for raid review and replay |

---

### Contributions & Development

- [CONTRIBUTING.md](CONTRIBUTING.md): how to contribute.
- [DEVELOPMENT.md](DEVELOPMENT.md): getting started with development.
- [REMOTE_HOST_AND_FIKA.md](REMOTE_HOST_AND_FIKA.md): using the mod on a remote host or with Fika.
- [TELEMETRY.md](TELEMETRY.md): information on statistics collection.

---

### Credits / Thanks

- **Ekky**: original author.
- **Chazut**: SPT 4.0.X and 4.1.X migrations, current maintainer.
- The SPT team for the framework and docs.
- The SPT Discord, especially the `#mod-development` and `#dev-community` folks.
- The team behind [tarkov.dev](https://tarkov.dev) for open-sourcing the interactive map.
- Olli, Stk2008, and others who helped squash bugs.
- You, for downloading and trying the mod.

---

### Support

[![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/chazut)

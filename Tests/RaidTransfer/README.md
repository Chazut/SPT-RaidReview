# Raid sharing checks

Build the frontend and server in Release first:

```powershell
cd Private
npm run build
cd ..
dotnet build ServerMod/ServerMod.csproj -c Release -p:SkipDeploy=true
dotnet run --project Tests/RaidTransfer -c Release
```

The harness links the production archive, HTTP, database, compiler and cleanup code and uses RR's isolated SQLite distribution. Every write goes to newly created temporary folders. It does not launch SPT or modify installed mods.

Coverage includes all 20 raid tables, raw-to-compiled and compiled-only positions, ORBIT data, headless identity, ID collisions, duplicate imports, malformed/truncated files, checksums, unexpected paths and columns, transaction rollback, cancellation, missing positions, pending writes at END, concurrent recording during export, and a real HTTP upload above Kestrel's default 30 MB limit.

An optional `--real-data <folder>` argument round-trips the newest completed raid in an isolated SQLite backup under the repository's `work/` folder, comparing every event field and the complete position file hash. Never point it at the live game database.

For browser verification, `--serve <isolated-fixture-folder> <stop-file>` starts a separate copy of the production web application on ports 17828/17829. Creating the stop file exits the test process. It uses a fresh temporary copy of the fixture, with automatic cleanup disabled.

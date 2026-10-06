# SQLite isolation regression

Build the frontend and server in Release with `-p:SkipDeploy=true`, then build this project.
Run each scenario in a separate process:

```powershell
dotnet Tests/SqliteIsolation/bin/Release/net10.0/SqliteIsolation.dll other-first <RR-build-folder> <SPT-runtime-folder> <other-SQLite-mod-folder> [database-snapshot]
```

Modes: `other-first`, `rr-first`, `alone`, `missing-managed`, `missing-native`.
The other-mod fixture uses its actual Microsoft.Data.Sqlite, SQLitePCLRaw.core, provider.e_sqlite3 and native runtime. Tested with DaCard 2.1.0 (SQLite 10 / PCL 2) against RR (SQLite 9 / PCL 3).

The harness simulates SPT's shared assembly context and metadata scan, opens both providers, exercises migrations, parameters, transactions, pooled concurrent writes and shutdown flushing. The first scenario also starts RR's own web component on ephemeral ports and verifies a WebSocket START packet through the HTTP API. It does not run SPT or either mod's entry point.

All mutations target a fresh temporary fixture. The optional historical database must be a consistent snapshot, copied into that fixture before migrations and integrity checks. Native binaries stay loaded until process exit, so fixtures are retained for inspection.

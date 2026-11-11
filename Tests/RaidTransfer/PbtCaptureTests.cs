using System.Text;
using System.Text.Json;
using RaidReview;
using RaidReview.Config;
using RaidReview.Database;
using RaidReview.FileSystem;
using RaidReview.PostRaid;
using RaidReview.Session;
using RaidReview.Sharing;
using RaidReview.WebSocket;

internal static class PbtCaptureTests
{
    internal static async Task<int> Run(string root)
    {
        int checks = 0;
        void Check(bool ok, string message) { if (!ok) throw new Exception("PBT: " + message); checks++; }
        string folder = Path.Combine(root, "pbt"), importedFolder = Path.Combine(root, "pbt-import");
        string raid = Guid.NewGuid().ToString(), second = Guid.NewGuid().ToString();
        using var db = new DatabaseService(); await db.InitializeAsync(folder);
        var files = new DataFileService(); files.Initialize(folder);
        var log = new RaidReviewLogger();
        var sessions = new SessionManager(log, new RaidReviewConfig());
        sessions.AddProfile("session", new SessionManagerPlayer { ProfileId = "host", RaidId = raid });
        var handler = new WsPacketHandler(db, sessions, files, log, new ItemResolver(root, log));
        foreach (var id in new[] { raid, second })
            await db.ExecuteAsync("INSERT INTO raid (raidId, profileId, location, time, timeInRaid, exitName, exitStatus, detectedMods, type) VALUES ($raid, 'host', 'bigmap', '2026-11-11T12:00:00Z', '60000', 'Exit', 'Survived', 'SAIN,PBT', 'PMC')", ("$raid", id));
        Dictionary<string, object?> Player(string id, bool? cheater = null, string personality = "", string cheats = "")
        {
            var p = new Dictionary<string, object?> {
                ["sessionId"] = "session", ["profileId"] = id, ["level"] = 35, ["team"] = "Usec",
                ["name"] = id, ["type"] = "PMC|USEC", ["group"] = 1, ["spawnTime"] = 0,
                ["mod_SAIN_brain"] = "Chad", ["mod_SAIN_difficulty"] = "Hard", ["mod_SAIN_name"] = "Twitch"
            };
            if (cheater.HasValue) { p["mod_PBT_cheater"] = cheater.Value; p["mod_PBT_personality"] = personality; p["mod_PBT_cheats"] = cheats; }
            return p;
        }
        Task Send(string action, object data) => handler.HandleMessageAsync(Encoding.UTF8.GetBytes(
            JsonSerializer.Serialize(new { Action = action, Payload = JsonSerializer.Serialize(data) })));
        Task<Dictionary<string, object?>?> Row(string id, string? raidId = null) => db.QuerySingleAsync(
            "SELECT * FROM player WHERE raidId=$raid AND profileId=$id", ("$raid", raidId ?? raid), ("$id", id));
        await Send("PLAYER", Player("Rage bot", true, "Rage", "Aimbot,Godmode,Fly"));
        var row = (await Row("Rage bot"))!;
        Check(row["mod_PBT_cheater"]?.ToString() == "1" && row["mod_PBT_cheats"]?.ToString() == "Aimbot,Godmode,Fly", "PLAYER saves metadata");
        Check(row["mod_SAIN_brain"]?.ToString() == "Chad", "PBT does not overwrite SAIN personality");
        await Send("PLAYER_UPDATE", Player("Rage bot"));
        Check((await Row("Rage bot"))!["mod_PBT_personality"]?.ToString() == "Rage", "Legacy SAIN update retains identity");
        await Send("PLAYER_UPDATE", Player("Rage bot", true, "Hunter", "None"));
        Check((await Row("Rage bot"))!["mod_PBT_cheats"]?.ToString() == "None", "Known no-cheat roll replaces older flags");
        await Send("PLAYER_CHECK", new[] { Player("Rage bot", true, "Rage", "Aimbot,Godmode,Fly"), Player("Closet bot", true, "Closet", "Esp"), Player("Ordinary PMC") });
        Check((await Row("Rage bot"))!["mod_PBT_personality"]?.ToString() == "Rage", "PLAYER_CHECK repairs existing metadata");
        Check((await Row("Closet bot"))!["mod_PBT_cheater"]?.ToString() == "1", "PLAYER_CHECK adds missing bot alongside existing raid rows");
        Check((await Row("Ordinary PMC"))!["mod_PBT_cheater"]?.ToString() == "0", "Old client defaults safe");
        var beforeCheck = (await db.QuerySingleAsync("SELECT total_changes() AS n"))!["n"];
        await Send("PLAYER_CHECK", new[] { Player("Rage bot", true, "Rage", "Aimbot,Godmode,Fly"), Player("Ordinary PMC") });
        Check(Equals(beforeCheck, (await db.QuerySingleAsync("SELECT total_changes() AS n"))!["n"]), "Unchanged roster checks do not rewrite rows");
        var human = Player("host", true, "Rage", "All"); human["type"] = "HUMAN"; human["mod_SAIN_brain"] = "PLAYER";
        await Send("PLAYER", human);
        Check((await Row("host"))!["mod_PBT_cheater"]?.ToString() == "0", "Human metadata suppressed");
        sessions.GetProfile("session")!.RaidId = second;
        await Send("PLAYER_CHECK", new[] { Player("Rage bot") });
        Check((await Row("Rage bot", second))!["mod_PBT_cheater"]?.ToString() == "0", "Profile ID reused in another raid has independent identity");
        Check((await Row("Rage bot"))!["mod_PBT_cheater"]?.ToString() == "1", "Another raid cannot erase first raid identity");

        files.WriteFile("positions", "", "", raid + "_positions",
            "profileId,time,x,y,z,dir,raid_id,health,maxHealth,decision,ghost,bodyYaw\n" +
            $"host,1000,200,0,0,0,{raid},440,440,,false,0\n" +
            $"Rage bot,1000,210,0,5,90,{raid},440,440,PBT:Cheating,false,90\n" +
            $"Rage bot,10000,220,0,15,90,{raid},440,440,SAIN:Search,false,90\n" +
            $"Closet bot,1000,230,0,25,90,{raid},440,440,SAIN:Search,false,90\n" +
            $"Ordinary PMC,1000,240,0,35,90,{raid},440,440,SAIN:Search,false,90\n");
        var compiler = new RaidPositionCompiler(files, log);
        var archives = new RaidArchiveService(db, files, compiler, log, folder);
        var work = archives.CreateWorkFolder();
        var zip = await archives.ExportAsync(raid, new Dictionary<string, object?> { ["profileName"] = "PBT test" }, work, default);
        using var importedDb = new DatabaseService(); await importedDb.InitializeAsync(importedFolder);
        var importedFiles = new DataFileService(); importedFiles.Initialize(importedFolder);
        var importer = new RaidArchiveService(importedDb, importedFiles, new RaidPositionCompiler(importedFiles, log), log, importedFolder);
        var importWork = importer.CreateWorkFolder();
        await importer.ImportAsync(zip.Path, importWork, default);
        var imported = (await importedDb.QuerySingleAsync("SELECT * FROM player WHERE profileId='Rage bot'"))!;
        Check(imported["mod_PBT_personality"]?.ToString() == "Rage" && imported["mod_PBT_cheats"]?.ToString() == "Aimbot,Godmode,Fly", "Export/import preserves PBT identity");
        Check(File.ReadAllText(Path.Combine(importedFolder, "positions", $"{raid}_{compiler.ActiveVersion}_positions.json")).Contains("PBT:Cheating"), "Replay preserves PBT ownership transition");
        archives.DeleteWorkFolder(work); importer.DeleteWorkFolder(importWork);
        Console.WriteLine($"PASS PBT persistence: {checks} checks. Fixture: {folder}, raid: {raid}");
        return checks;
    }
}

using System.Data.Common;
using System.Text.Json;
using RaidReview;
using RaidReview.Config;
using RaidReview.Database;
using RaidReview.FileSystem;
using RaidReview.Session;
using RaidReview.WebSocket;

internal static class CometReplayRoundTrip
{
    // Re-run archived WebSocket payloads through production ingestion into an empty
    // database. Read the reference via SELECT and compare the public SQL contract.
    internal static async Task Run(string root, string database, string packetLog, string raidId)
    {
        using var db = new DatabaseService();
        var errors = new List<string>();
        await db.InitializeAsync(root, msg => { if (msg.StartsWith("[DB]")) errors.Add(msg); });
        using var conn = await db.OpenTransferConnectionAsync(CancellationToken.None);
        using var cmd = conn.CreateCommand();
        void Bind(string key, object value)
        {
            var parameter = cmd.CreateParameter(); parameter.ParameterName = key; parameter.Value = value;
            cmd.Parameters.Add(parameter);
        }
        Bind("$ref", Path.GetFullPath(database));
        cmd.CommandText = "ATTACH DATABASE $ref AS original";
        await cmd.ExecuteNonQueryAsync();
        cmd.Parameters.Clear(); Bind("$raid", raidId);
        cmd.CommandText = "INSERT INTO raid SELECT * FROM original.raid WHERE raidId=$raid";
        if (await cmd.ExecuteNonQueryAsync() != 1) throw new Exception("Expected one source raid");
        cmd.CommandText = "SELECT DISTINCT cometSession FROM original.comet_decision WHERE raidId=$raid";
        var comet = (string)(await cmd.ExecuteScalarAsync() ?? throw new Exception("Missing COMET session"));
        cmd.CommandText = "INSERT INTO sqlite_sequence(name,seq) SELECT 'comet_decision_row',MIN(id)-1 FROM original.comet_decision WHERE raidId=$raid";
        await cmd.ExecuteNonQueryAsync();
        var config = new RaidReviewConfig { EnableDebugLogs = false, EnableLogFiles = true };
        var logger = new RaidReviewLogger();
        logger.Initialize(_ => {}, _ => {}, _ => {}, errors.Add, root, config);
        var files = new DataFileService(); files.Initialize(root);
        var sessions = new SessionManager(logger, config);
        var ws = new WsPacketHandler(db, sessions, files, logger, null!);
        Task Send(string action, string payload) => ws.HandleMessageAsync(JsonSerializer.SerializeToUtf8Bytes(new {Action=action,Payload=payload}));
        string? profile = null;
        string? summaryPacket = null;
        int packets = 0;
        foreach (var line in File.ReadLines(packetLog))
        {
            const string marker = "COMET_DECISION|";
            int start = line.IndexOf(marker, StringComparison.Ordinal);
            if (start < 0)
            {
                const string end = "[DEBUG] END|";
                int index = line.IndexOf(end, StringComparison.Ordinal);
                if (profile != null && index >= 0 && line.Contains(profile))
                    await Send("END",line[(index + end.Length)..]);
                continue;
            }
            string json = line[(start + marker.Length)..];
            if (!json.Contains(comet, StringComparison.Ordinal)) continue;
            if (profile == null)
            {
                using var obj = JsonDocument.Parse(json);
                profile = obj.RootElement.GetProperty("sessionId").GetString()!;
                sessions.AddProfile(profile, new SessionManagerPlayer {ProfileId=profile, RaidId=raidId});
                sessions.AddRaid(raidId,new SessionManagerRaid {RaidId=raidId,Players=new() {{profile,profile}}});
                await Send("COMET_SESSION",JsonSerializer.Serialize(new {sessionId=profile,cometSession=comet}));
            }
            if (json.Contains("\"stage\":\"summary\"", StringComparison.Ordinal)) summaryPacket = json;
            await Send("COMET_DECISION",json);
            packets++;
        }
        await db.FlushWritesAsync(CancellationToken.None);
        if (errors.Count != 0) throw new Exception(string.Join(Environment.NewLine,errors));
        // All column bytes, including raw JSON, timestamps, tie-breaking IDs and
        // sequence numbers are identical in both directions. Thus map projection,
        // diagnostic search, portable exports and the existing replay see the same rows.
        foreach (var (first, second) in new[]{("main","original"),("original","main")})
        {
            cmd.CommandText = $"SELECT EXISTS(SELECT * FROM {first}.comet_decision WHERE raidId=$raid EXCEPT SELECT * FROM {second}.comet_decision WHERE raidId=$raid)";
            if (Convert.ToInt32(await cmd.ExecuteScalarAsync()) != 0) throw new Exception("Replay differs: "+first);
        }
        foreach (var (label,sql) in new[]{
            ("events","SELECT COUNT(*) FROM comet_decision WHERE raidId=$raid"),
            ("summaries","SELECT COUNT(*) FROM comet_decision WHERE raidId=$raid AND stage='summary' AND feature IN ('T01','T02','T03','T04')"),
            ("references","SELECT COUNT(configBlock) FROM comet_decision_row WHERE raidId=$raid"),
            ("distinct config bodies","SELECT COUNT(*) FROM comet_config_block WHERE raidId=$raid"),
            ("config payload bytes saved","SELECT SUM(length(CAST(body AS BLOB))*(n-1)) FROM comet_config_block JOIN (SELECT configBlock,COUNT(*) n FROM comet_decision_row WHERE raidId=$raid GROUP BY configBlock) ON configBlock=id")
        }) { cmd.CommandText=sql; Console.WriteLine($"{label}: {await cmd.ExecuteScalarAsync()}"); }
        if (Directory.EnumerateFiles(Path.Combine(root,"logs")).SelectMany(File.ReadLines).Any(s=>s.Contains("COMET_DECISION|")))
            throw new Exception("Normal file log contains raw COMET decisions");
        if (summaryPacket == null) throw new Exception("Expected a late report page");
        config.EnableDebugLogs = true;
        await Send("COMET_DECISION", summaryPacket);
        await db.FlushWritesAsync(CancellationToken.None);
        cmd.CommandText = "SELECT COUNT(*) FROM comet_decision WHERE raidId=$raid";
        if (Convert.ToInt64(await cmd.ExecuteScalarAsync()) != packets ||
            !Directory.EnumerateFiles(Path.Combine(root,"logs")).SelectMany(File.ReadLines).Any(s=>s.Contains("COMET_DECISION|")))
            throw new Exception("Explicit packet debugging or idempotent late-page retry failed");
        Console.WriteLine($"PASS {packets} packets, exact replay equality, zero normal payload logs, explicit debug and duplicate delivery.");
    }
}

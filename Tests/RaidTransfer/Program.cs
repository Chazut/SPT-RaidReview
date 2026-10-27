using System.IO.Compression;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using RaidReview;
using RaidReview.Database;
using RaidReview.FileSystem;
using RaidReview.PostRaid;
using RaidReview.Sharing;
using Microsoft.AspNetCore.Hosting.Server;
using Microsoft.AspNetCore.Hosting.Server.Features;

var root = Path.Combine(Path.GetTempPath(), "RR-transfer-" + Guid.NewGuid().ToString("N"));
Directory.CreateDirectory(root);
int checks = 0;
void Check(bool ok, string message) { if (!ok) throw new Exception(message); checks++; }
var logger = new RaidReviewLogger();
var sourceData = Path.Combine(root, "source");
var targetData = Path.Combine(root, "target");
if (args.Length == 3 && args[0] == "--serve")
{
    string fixture = Path.GetFullPath(args[1]);
    string previewMod = Path.Combine(root, "preview-mod");
    string complete = Path.Combine(previewMod, "data");
    Directory.CreateDirectory(Path.Combine(complete, "positions"));
    File.Copy(Path.Combine(fixture, "raid_review_mod.db"), Path.Combine(complete, "raid_review_mod.db"));
    foreach (var path in Directory.GetFiles(Path.Combine(fixture, "positions")))
        File.Copy(path, Path.Combine(complete, "positions", Path.GetFileName(path)));
    using var webDb = new DatabaseService(); await webDb.InitializeAsync(complete);
    var webFiles = new DataFileService(); webFiles.Initialize(complete);
    var webCompiler = new RaidPositionCompiler(webFiles, logger);
    var config = new RaidReview.Config.RaidReviewConfig { WebClientPort = 17829, WebSocketPort = 17828, AutoDelete = false };
    var sessions = new RaidReview.Session.SessionManager(logger, config);
    var resolver = new ItemResolver(previewMod, logger);
    var webHandler = new RaidReview.WebSocket.WsPacketHandler(webDb, sessions, webFiles, logger, resolver);
    var web = new RaidReview.Http.RaidReviewWebServer(config, webDb, webFiles, logger, webHandler, webCompiler, previewMod);
    await web.StartAsync();
    Console.WriteLine($"PREVIEW http://127.0.0.1:17829 data={complete} stopFile={args[2]}");
    while (!File.Exists(args[2])) await Task.Delay(500);
    return;
}
using var source = new DatabaseService();
using var target = new DatabaseService();
await source.InitializeAsync(sourceData);
await target.InitializeAsync(targetData);
var sourceFiles = new DataFileService(); sourceFiles.Initialize(sourceData);
var targetFiles = new DataFileService(); targetFiles.Initialize(targetData);
var sourceCompiler = new RaidPositionCompiler(sourceFiles, logger);
var targetCompiler = new RaidPositionCompiler(targetFiles, logger);
var exporter = new RaidArchiveService(source, sourceFiles, sourceCompiler, logger, sourceData);
var importer = new RaidArchiveService(target, targetFiles, targetCompiler, logger, targetData);
string raidId = Guid.NewGuid().ToString();
string localRaidId = Guid.NewGuid().ToString();

async Task Seed(DatabaseService db, string id)
{
    foreach (var table in RaidArchiveService.Tables)
    {
        var schema = await db.QueryAsync($"PRAGMA table_info(\"{table}\")");
        var values = new Dictionary<string, object?>();
        foreach (var c in schema)
        {
            string name = c["name"]!.ToString()!, type = c["type"]!.ToString()!;
            if (name == "id" || name.StartsWith("imported")) continue;
            values[name] = type == "INTEGER" ? (object)1L : type == "REAL" ? 1.25 : "recorded";
            if (name == "raidId") values[name] = id;
            if (name == "profileId") values[name] = "player-1";
            if (name == "timeInRaid") values[name] = "120000";
            if (name == "exitStatus") values[name] = "Survived";
            if (name == "created_at") values[name] = "2026-10-20 00:00:00";
            if (name == "type") values[name] = table == "raid" ? "SCAV" : "HUMAN";
            if (name == "team") values[name] = "Savage";
            if (name == "location") values[name] = "interchange";
            if (name == "locationVariant") values[name] = "interchange_rework";
            if (name == "name") values[name] = "Recker";
        }
        var names = values.Keys.ToArray();
        await db.ExecuteAsync($"INSERT INTO \"{table}\" ({string.Join(",", names.Select(n => "\"" + n + "\""))}) VALUES ({string.Join(",", names.Select((_, i) => "$v" + i))})",
            values.Values.Select((v, i) => ("$v" + i, v)).ToArray());
    }
}
await Seed(source, raidId);
await Seed(target, localRaidId);
await ProfileLoadingTests.Run(root,source,sourceFiles,logger,sourceCompiler,raidId,Check);
if (args.Contains("--profiles-only"))
{
    Console.WriteLine($"PASS {checks} profile loading checks");
    return;
}
var identity = new Dictionary<string, object?> { ["profileName"] = "Recker (headless)", ["isHeadless"] = true, ["type"] = "SCAV" };
sourceFiles.WriteFile("positions", "", "", raidId + "_positions",
    "profileId,time,x,y,z,dir,raid_id,health,maxHealth,decision,ghost,bodyYaw\n" +
    $"player-1,1000,1,2,3,45,{raidId},440,440,Search,false,80\n" +
    $"player-1,2000,4,5,6,90,{raidId},440,440,Quest,true,90\n");
var work = exporter.CreateWorkFolder();
var exported = await exporter.ExportAsync(raidId, identity, work, default);
Check(exported.Warning == null, "Positions included");
using (var z = ZipFile.OpenRead(exported.Path))
{
    Check(z.Entries.Count == 22, "All 20 tables, positions and manifest exported");
    Check(!z.Entries.Any(e => e.FullName.Contains("profile.json")), "No SPT profile files");
}
async Task<RaidArchiveService.ImportResult> Import(string path, CancellationToken ct = default)
{
    string temp = importer.CreateWorkFolder();
    try { return await importer.ImportAsync(path, temp, ct); }
    finally { importer.DeleteWorkFolder(temp); }
}
var result = await Import(exported.Path);
Check(!result.AlreadyExists && result.RaidId == raidId, "New raid imported");
foreach (string table in RaidArchiveService.Tables)
{
    var a = (await source.QueryAsync($"SELECT * FROM {table} WHERE raidId=$id", ("$id", raidId))).Single();
    var b = (await target.QueryAsync($"SELECT * FROM {table} WHERE raidId=$id", ("$id", raidId))).Single();
    Check(!Equals(a["id"], b["id"]), "Local row ID allocated: " + table);
    foreach (string key in a.Keys.Where(k => k != "id" && !k.StartsWith("imported")))
        Check(Equals(a[key], b[key]), $"Preserved {table}.{key}");
    Check((await target.QueryAsync($"SELECT * FROM {table} WHERE raidId=$id", ("$id", localRaidId))).Count == 1, "Local raid preserved");
}
string compiledName = $"{raidId}_V4_positions.json";
Check(File.ReadAllBytes(Path.Combine(sourceData, "positions", compiledName))
    .SequenceEqual(File.ReadAllBytes(Path.Combine(targetData, "positions", compiledName))), "Exact positions preserved");
var importedRow = (await target.QuerySingleAsync("SELECT * FROM raid WHERE raidId=$id", ("$id", raidId)))!;
RecordingIdentity.Apply(importedRow, "wrong local username", []);
Check(importedRow["profileName"]?.ToString() == "Recker (headless)" && importedRow["isHeadless"] is true, "Headless identity survives");
Check((await Import(exported.Path)).AlreadyExists, "Duplicate is recognized without overwriting");

string Mutation(string suffix, Action<Dictionary<string, byte[]>> edit, bool updateHashes = true)
{
    using var input = ZipFile.OpenRead(exported.Path);
    var entries = input.Entries.ToDictionary(e => e.FullName, e => { using var stream = e.Open(); using var memory = new MemoryStream(); stream.CopyTo(memory); return memory.ToArray(); });
    edit(entries);
    var manifest = JsonNode.Parse(entries["manifest.json"])!;
    if (updateHashes)
        foreach (var (name, data) in entries.Where(kv => kv.Key != "manifest.json"))
            if (manifest["files"]![name] is JsonNode part)
            {
                part["bytes"] = data.Length;
                part["sha256"] = Convert.ToHexString(SHA256.HashData(data));
            }
    entries["manifest.json"] = Encoding.UTF8.GetBytes(manifest.ToJsonString());
    string path = Path.Combine(root, suffix + ".zip");
    using var output = ZipFile.Open(path, ZipArchiveMode.Create);
    foreach (var (name, bytes) in entries) { using var stream = output.CreateEntry(name).Open(); stream.Write(bytes); }
    return path;
}
async Task Reject(string path, string description)
{
    try { await Import(path); throw new Exception("Accepted " + description); }
    catch (Exception ex) when (ex is InvalidDataException or JsonException or System.Data.Common.DbException) { checks++; }
    Check((await target.QueryAsync("SELECT * FROM raid")).Count == 2, "Failed import changed no raids: " + description);
}
await Reject(Mutation("corrupt", e => e["tables/player.json"] = "[]"u8.ToArray(), false), "bad checksum");
await Reject(Mutation("missing", e => e.Remove("positions.json")), "missing positions");
await Reject(Mutation("traversal", e => e["../escape.txt"] = "bad"u8.ToArray()), "path traversal");
await Reject(Mutation("version", e => {
    var m = JsonNode.Parse(e["manifest.json"])!; m["version"] = 100; e["manifest.json"] = Encoding.UTF8.GetBytes(m.ToJsonString());
}), "future version");
await Reject(Mutation("foreign", e => {
    var rows = JsonNode.Parse(e["tables/kills.json"])!; rows[0]!["raidId"] = localRaidId;
    e["tables/kills.json"] = Encoding.UTF8.GetBytes(rows.ToJsonString());
}), "foreign raid event");
await Reject(Mutation("bad-position", e => e["positions.json"] = "{\"player-1\":[{\"x\":\"NaN\",\"y\":2,\"z\":3,\"time\":0}]}"u8.ToArray()), "bad positions");
await Reject(Mutation("truncated-position", e => e["positions.json"] = "{\"player-1\":["u8.ToArray()), "truncated positions");
await Reject(Mutation("sql-column", e => {
    var rows = JsonNode.Parse(e["tables/kills.json"])!; rows[0]!["invalid\"; DROP TABLE raid; --"] = 1;
    e["tables/kills.json"] = Encoding.UTF8.GetBytes(rows.ToJsonString());
}), "unknown SQL column");

// A constraint violation late in the import rolls back already inserted parent/child rows.
string rollbackId = Guid.NewGuid().ToString();
var rollback = Mutation("rollback", e => {
    foreach (var name in e.Keys.ToArray()) e[name] = Encoding.UTF8.GetBytes(Encoding.UTF8.GetString(e[name]).Replace(raidId, rollbackId));
    var rows = JsonNode.Parse(e["tables/switch_state.json"])!.AsArray(); rows.Add(rows[0]!.DeepClone());
    e["tables/switch_state.json"] = Encoding.UTF8.GetBytes(rows.ToJsonString());
    var m = JsonNode.Parse(e["manifest.json"])!; m["files"]!["tables/switch_state.json"]!["rows"] = 2;
    e["manifest.json"] = Encoding.UTF8.GetBytes(m.ToJsonString());
});
await Reject(rollback, "transaction rollback");
Check(!File.Exists(Path.Combine(targetData, "positions", rollbackId + "_V4_positions.json")), "No orphan replay after rollback");
using (var cancelled = new CancellationTokenSource())
{
    cancelled.Cancel();
    try { await Import(exported.Path, cancelled.Token); throw new Exception("Cancellation ignored"); }
    catch (OperationCanceledException) { checks++; }
}

// Import/export remains usable after source CSV cleanup.
sourceFiles.DeleteFile("positions", "", "", raidId + "_positions");
string compiledWork = exporter.CreateWorkFolder();
Check((await exporter.ExportAsync(raidId, identity, compiledWork, default)).Warning == null, "Compiled-only export");
sourceFiles.DeleteFile("positions", "", "", compiledName);
string noPositionsWork = exporter.CreateWorkFolder();
var noPositions = await exporter.ExportAsync(raidId, identity, noPositionsWork, default);
Check(noPositions.Warning != null, "Missing positions explicitly reported");
source.QueueWrite("UPDATE raid SET exitName=$name WHERE raidId=$id", ("$name", "Queued final update"), ("$id", raidId));
string queuedWork = exporter.CreateWorkFolder();
var queuedExport = await exporter.ExportAsync(raidId, identity, queuedWork, default);
using (var z = ZipFile.OpenRead(queuedExport.Path))
using (var doc = await JsonDocument.ParseAsync(z.GetEntry("tables/raid.json")!.Open()))
    Check(doc.RootElement[0].GetProperty("exitName").GetString() == "Queued final update", "Export flushes pending recording events");

// Private-cache deferred snapshots must not lock out recording writes.
await using (var snapshot = await source.OpenTransferConnectionAsync(default))
{
    using var read = snapshot.CreateCommand();
    read.CommandText = "BEGIN DEFERRED; SELECT COUNT(*) FROM raid";
    await read.ExecuteScalarAsync();
    await source.ExecuteAsync("UPDATE raid SET exitName='Concurrent recording' WHERE raidId=$id", ("$id", raidId)).WaitAsync(TimeSpan.FromSeconds(2));
    Check(true, "WAL snapshot allows recording writes");
    read.CommandText = "ROLLBACK";
    await read.ExecuteNonQueryAsync();
}

string bigId = Guid.NewGuid().ToString();
await Seed(source, bigId);
string bigPosition = Path.Combine(sourceData, "positions", bigId + "_V4_positions.json");
await using (var output = File.Create(bigPosition))
await using (var writer = new Utf8JsonWriter(output))
{
    writer.WriteStartObject(); writer.WritePropertyName("player-1"); writer.WriteStartArray();
    var noise = new byte[1536];
    for (int i = 0; i < 25_000; i++)
    {
        RandomNumberGenerator.Fill(noise);
        writer.WriteStartObject();
        writer.WriteNumber("time", i); writer.WriteNumber("x", i); writer.WriteNumber("y", 1); writer.WriteNumber("z", 2);
        writer.WriteString("profileId", "player-1"); writer.WriteString("raidId", bigId);
        writer.WriteString("decision", Convert.ToBase64String(noise));
        writer.WriteEndObject();
        if (writer.BytesPending > 64 * 1024) await writer.FlushAsync();
    }
    writer.WriteEndArray(); writer.WriteEndObject();
}
string bigWork = exporter.CreateWorkFolder();
var bigArchive = await exporter.ExportAsync(bigId, identity, bigWork, default);
Check(new FileInfo(bigArchive.Path).Length > 30_000_000, "Large archive exceeds Kestrel default upload limit");

// Exercise real HTTP endpoints, including uploads larger than Kestrel's default 30 MB.
var builder = WebApplication.CreateBuilder();
builder.WebHost.UseUrls("http://127.0.0.1:0");
builder.Logging.ClearProviders();
await using var app = builder.Build();
app.MapRaidArchives(importer, async id => (await target.QuerySingleAsync("SELECT * FROM raid WHERE raidId=$id", ("$id", id)))!, logger);
await app.StartAsync();
string url = app.Services.GetRequiredService<IServer>().Features.Get<IServerAddressesFeature>()!.Addresses.Single();
using var client = new HttpClient { BaseAddress = new Uri(url), Timeout = TimeSpan.FromMinutes(3) };
using (var body = new StreamContent(File.OpenRead(exported.Path)))
{
    var response = await client.PostAsync("/api/raids/import", body);
    Check(response.IsSuccessStatusCode, "HTTP upload succeeds");
    Check((await response.Content.ReadAsStringAsync()).Contains("\"alreadyExists\":true"), "HTTP duplicate feedback");
}
var invalidZipResponse = await client.PostAsync("/api/raids/import", new StringContent("broken"));
Check(invalidZipResponse.StatusCode == System.Net.HttpStatusCode.BadRequest, "Malformed ZIP returns clear 400");
Check((await invalidZipResponse.Content.ReadAsStringAsync()).Contains("not a valid raid ZIP"), "Malformed ZIP error is understandable");
var downloaded = await client.GetAsync("/api/raids/" + raidId + "/export");
Check(downloaded.IsSuccessStatusCode && downloaded.Content.Headers.ContentType?.MediaType == "application/zip", "HTTP export download");
Check(downloaded.Content.Headers.ContentDisposition?.FileName?.Contains(raidId) == true, "Download filename");
using (var body = new StreamContent(File.OpenRead(bigArchive.Path)))
{
    var response = await client.PostAsync("/api/raids/import", body);
    Check(response.IsSuccessStatusCode, "Large HTTP upload: " + await response.Content.ReadAsStringAsync());
    Check(SHA256.HashData(File.ReadAllBytes(bigPosition)).SequenceEqual(
        SHA256.HashData(File.ReadAllBytes(Path.Combine(targetData, "positions", bigId + "_V4_positions.json")))),
        "Large replay survives HTTP import exactly");
}
await app.StopAsync();

if (args.Length == 2 && args[0] == "--real-data")
{
    // Caller supplies an isolated SQLite backup, never the live game directory.
    string realData = Path.GetFullPath(args[1]);
    Check(realData.StartsWith(Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "../../../../../work")) + Path.DirectorySeparatorChar,
        StringComparison.OrdinalIgnoreCase), "Real fixture is an isolated workspace backup");
    using var realDb = new DatabaseService();
    await realDb.InitializeAsync(realData);
    var realFiles = new DataFileService(); realFiles.Initialize(realData);
    var realCompiler = new RaidPositionCompiler(realFiles, logger);
    var realExporter = new RaidArchiveService(realDb, realFiles, realCompiler, logger, realData);
    var realRaid = (await realDb.QuerySingleAsync("SELECT * FROM raid WHERE exitStatus<>'' AND timeInRaid>10 ORDER BY id DESC LIMIT 1"))!;
    string realId = realRaid["raidId"]!.ToString()!;
    string realWork = realExporter.CreateWorkFolder();
    var archive = await realExporter.ExportAsync(realId, realRaid, realWork, default);
    Check(!(await Import(archive.Path)).AlreadyExists, "Real raid imported");
    foreach (var table in RaidArchiveService.Tables)
    {
        var before = await realDb.QueryAsync($"SELECT * FROM {table} WHERE raidId=$id ORDER BY id", ("$id", realId));
        var after = await target.QueryAsync($"SELECT * FROM {table} WHERE raidId=$id ORDER BY id", ("$id", realId));
        Check(before.Count == after.Count, "Real row count: " + table);
        for (int i = 0; i < before.Count; i++)
            foreach (var key in before[i].Keys.Where(k => k != "id" && !k.StartsWith("imported")))
                Check(Equals(before[i][key], after[i][key]), "Real data preserved: " + table + "." + key);
    }
    string realPositionName = realId + "_V4_positions.json";
    Check(SHA256.HashData(File.ReadAllBytes(Path.Combine(realData, "positions", realPositionName))).SequenceEqual(
        SHA256.HashData(File.ReadAllBytes(Path.Combine(targetData, "positions", realPositionName)))), "Real positions hash preserved");
    realExporter.DeleteWorkFolder(realWork);
    Console.WriteLine("Real round-trip: " + realId);
}

var gc = new RaidReview.DataIntegrity.GarbageCollector(target, targetFiles, logger,
    new RaidReview.Config.RaidReviewConfig { AutoDelete = true, AutoDeleteLimit = 0, AutoDeleteUnfinishedRaids = true });
await gc.CollectOldRaidsAsync();
Check(await target.QuerySingleAsync("SELECT * FROM raid WHERE raidId=$id", ("$id", raidId)) != null, "Imported raid retained by automatic cleanup");
Check(await target.QuerySingleAsync("SELECT * FROM raid WHERE raidId=$id", ("$id", localRaidId)) == null, "Normal raid retention still works");
Check(!Directory.EnumerateDirectories(Path.Combine(targetData, "transfers")).Any(), "Transfer workspaces cleaned");
Console.WriteLine($"PASS RaidTransfer: {checks} checks. Isolated data: {root}");

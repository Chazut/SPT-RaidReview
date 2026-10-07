using System.Data.Common;
using System.Reflection;
using System.Runtime.InteropServices;
using System.Runtime.Loader;
using System.Net.WebSockets;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Builder;

// Uses the real built mod and an optional second mod's SQLite distribution.
// No SPT server or mod entry point runs. All database writes go to a fresh temp folder.
if (args.Length < 3)
    throw new ArgumentException("Usage: mode RR-build-folder SPT-runtime-folder [other-mod-folder] [database-snapshot]");
var mode = args[0];
var upgrade = mode.StartsWith("upgrade-", StringComparison.Ordinal);
if (upgrade) mode = mode[8..];
var build = Path.GetFullPath(args[1]);
var server = Path.GetFullPath(args[2]);
var other = args.Length > 3 ? Path.GetFullPath(args[3]) : "";
var folder = Path.Combine(Path.GetTempPath(), "RR-SqliteIsolation-" + Guid.NewGuid().ToString("N"));
Directory.CreateDirectory(folder);
CopyTree(Path.Combine(build, "lib"), Path.Combine(folder, "lib"));
var rid = (OperatingSystem.IsWindows() ? "win" : OperatingSystem.IsMacOS() ? "osx" : "linux")
    + "-" + RuntimeInformation.ProcessArchitecture.ToString().ToLowerInvariant();
CopyTree(Path.Combine(build, "runtimes", rid), Path.Combine(folder, "runtimes", rid));
File.Copy(Path.Combine(build, "RaidReview.dll"), Path.Combine(folder, "RaidReview.dll"));
if (upgrade)
{
    var shimFolder = Directory.Exists(Path.Combine(build, "upgrade")) ? Path.Combine(build, "upgrade") : build;
    foreach (var name in new[] { "Microsoft.Data.Sqlite.dll", "SQLitePCLRaw.core.dll", "SQLitePCLRaw.provider.e_sqlite3.dll", "SQLitePCLRaw.batteries_v2.dll" })
        File.Copy(Path.Combine(shimFolder, name), Path.Combine(folder, name));
}
var checks = 0;
void Check(bool ok, string reason) { if (!ok) throw new Exception(reason); checks++; }
var host = new HostContext(server);
DbConnection? otherConnection = null;
if (mode is "other-first" or "missing-managed" or "missing-native") otherConnection = OpenOther();
if (mode == "missing-managed") File.Delete(Path.Combine(folder, "lib/sqlite/Microsoft.Data.Sqlite.dll"));
if (mode == "missing-native") Directory.Move(Path.Combine(folder, "runtimes"), Path.Combine(folder, "unused-runtimes"));
var assembly = host.LoadFromAssemblyPath(Path.Combine(folder, "RaidReview.dll"));
if (upgrade)
{
    // Match SPT's eager root scan, including metadata inspection of every module.
    var loaded = new DirectoryInfo(folder).GetFiles("*.dll")
        .OrderBy(file => file.Name, StringComparer.Ordinal)
        .Select(file => host.LoadFromAssemblyPath(file.FullName)).ToArray();
    Check(loaded.Length == 5, "Upgrade scans the main DLL and all four placeholders");
    Check(loaded.SelectMany(a => a.GetTypes()).Count(type => type.Name == "ModMetadata") == 1, "Only one mod metadata type in upgraded root");
    Check(loaded.Where(a => a != assembly).All(a => a.GetName().Name!.StartsWith("RaidReview.LegacySqlite.")), "Placeholders never occupy SQLite assembly identities");

    var configType = assembly.GetType("RaidReview.Config.RaidReviewConfig", true)!;
    var loadConfig = configType.GetMethod("Load")!;
    var configPath = Path.Combine(folder, "config/config.json");
    loadConfig.Invoke(null, [folder]);
    Check(File.Exists(configPath), "Fresh install creates its embedded default configuration");
    var customConfig = "{\"web_client_port\":18329,\"web_socket_port\":18328,\"autoDelete\":false,\"custom_future_setting\":\"preserve\"}";
    File.WriteAllText(configPath, customConfig);
    var configured = loadConfig.Invoke(null, [folder])!;
    Check((int)configType.GetProperty("WebClientPort")!.GetValue(configured)! == 18329, "Existing custom port remains effective");
    Check(File.ReadAllText(configPath) == customConfig, "Existing config is preserved byte for byte");

    var protectedData = Path.Combine(folder, "data/history.keep");
    Directory.CreateDirectory(Path.GetDirectoryName(protectedData)!);
    File.WriteAllText(protectedData, "retained recordings");
    var protectedFiles = Directory.GetFiles(Path.Combine(folder, "lib/sqlite"), "*.dll")
        .Concat(Directory.GetFiles(Path.Combine(folder, "runtimes"), "*", SearchOption.AllDirectories))
        .Append(configPath).Append(protectedData)
        .ToDictionary(path => path, File.ReadAllBytes);
    var cleanup = assembly.GetType("RaidReview.FileSystem.LegacySqliteUpgrade", true)!
        .GetMethod("ArchivePlaceholders", BindingFlags.Static | BindingFlags.NonPublic)!;
    var messages = new List<string>();
    void Clean() => cleanup.Invoke(null, [folder, new Action<string>(messages.Add)]);
    var lockedPath = Path.Combine(folder, "SQLitePCLRaw.core.dll");
    using (var held = new FileStream(lockedPath, FileMode.Open, FileAccess.Read, FileShare.Read))
    {
        Clean();
        Check(Directory.GetFiles(folder, "*.dll").Length <= 2, "Unlocked placeholders archived while a locked one remains harmless");
    }
    Clean();
    Check(Directory.GetFiles(folder, "*.dll").Select(Path.GetFileName).SequenceEqual(["RaidReview.dll"]), "Automatic cleanup leaves only RR at root");
    Check(Directory.GetFiles(Path.Combine(folder, "lib/sqlite/legacy"), "*.dll", SearchOption.AllDirectories).Length == 4, "All placeholders archived without deleting backups");
    var messageCount = messages.Count;
    Clean();
    Check(messages.Count == messageCount, "Repeated cleanup is a no-op");
    foreach (var saved in protectedFiles) Check(File.ReadAllBytes(saved.Key).SequenceEqual(saved.Value), "Protected data/config/runtime unchanged: " + Path.GetFileName(saved.Key));
    // Unrecognized files with a retired filename must not be moved by cleanup.
    File.Copy(Path.Combine(folder, "lib/sqlite/Microsoft.Data.Sqlite.dll"), Path.Combine(folder, "Microsoft.Data.Sqlite.dll"));
    Clean();
    Check(File.Exists(Path.Combine(folder, "Microsoft.Data.Sqlite.dll")), "Cleanup ignores genuine or unrelated assemblies");
    File.Delete(Path.Combine(folder, "Microsoft.Data.Sqlite.dll"));
}
Check(!assembly.GetReferencedAssemblies().Any(a => a.Name!.Contains("Sqlite", StringComparison.OrdinalIgnoreCase)
    || a.Name.StartsWith("SQLitePCLRaw")), "RR must not statically reference SQLite");
Check(assembly.GetTypes().Any(t => t.Name == "ModMetadata"), "SPT metadata discovery must succeed");
dynamic Create(string type, params object[] parameters) => Activator.CreateInstance(assembly.GetType("RaidReview." + type, true)!, parameters)!;
dynamic db = Create("Database.DatabaseService");
var data = Path.Combine(folder, "data");
var errors = new List<string>();
Action<string> log = s => { Console.WriteLine(s); if (s.Contains("error", StringComparison.OrdinalIgnoreCase)) errors.Add(s); };
if (mode.StartsWith("missing-"))
{
    try { await db.InitializeAsync(data, log); throw new Exception("Incomplete installation unexpectedly succeeded"); }
    catch (Exception ex) when (ex is FileNotFoundException or DllNotFoundException)
    {
        Check(!Directory.Exists(data), "Incomplete installation must fail before opening or creating a database");
        Check(otherConnection!.State == System.Data.ConnectionState.Open, "Other mod remains usable");
    }
    Console.WriteLine($"PASS {mode}: {checks} checks");
    return;
}

await db.InitializeAsync(data, log);
var connection = (DbConnection)db.Connection;
var sqliteContext = AssemblyLoadContext.GetLoadContext(connection.GetType().Assembly)!;
Check(sqliteContext != host && sqliteContext != AssemblyLoadContext.Default, "SQLite must live in a separate context");
Check(sqliteContext.Name == "RaidReview.SQLite", "Private context diagnostic name");
Check(connection.GetType().Assembly.GetName().Version == AssemblyName.GetAssemblyName(Path.Combine(build, "lib/sqlite/Microsoft.Data.Sqlite.dll")).Version,
    "RR uses its own SQLite version");
Check(sqliteContext.Assemblies.Where(a => a.GetName().Name!.StartsWith("SQLitePCLRaw")).All(a => a.Location.StartsWith(Path.Combine(folder, "lib"))),
    "The entire provider stack is private");
if (mode == "rr-first") otherConnection = OpenOther();
if (otherConnection != null)
{
    Check(AssemblyLoadContext.GetLoadContext(otherConnection.GetType().Assembly) == host, "Other mod keeps host context");
    Check(otherConnection.GetType().Assembly != connection.GetType().Assembly, "Both versions coexist");
    using var command = otherConnection.CreateCommand();
    command.CommandText = "select sqlite_version()";
    Console.WriteLine("Other SQLite native version: " + command.ExecuteScalar());
}
else Check(!host.Assemblies.Any(a => a.GetName().Name == "Microsoft.Data.Sqlite"
    || a.GetName().Name!.StartsWith("SQLitePCLRaw", StringComparison.Ordinal)), "RR alone does not populate the host with SQLite");

await db.ExecuteAsync("create table probe(id integer primary key, text_value text, nullable_value text, real_value real, bytes blob)", P());
await db.ExecuteAsync("insert into probe values($id,$text,$null,$real,$bytes)",
    P(("$id", 1), ("$text", "Données 'テスト'"), ("$null", null), ("$real", 1.25), ("$bytes", new byte[] { 1, 2, 255 })));
var row = (Dictionary<string, object?>)await db.QuerySingleAsync("select * from probe where id=$id", P(("$id", 1)));
Check((string)row["text_value"]! == "Données 'テスト'" && row["nullable_value"] == null, "Text and NULL parameters round trip");
Check((double)row["real_value"]! == 1.25 && ((byte[])row["bytes"]!).SequenceEqual(new byte[] { 1, 2, 255 }), "Real and blob parameters round trip");
await db.ExecuteBatchAsync("insert into probe(id) values($id)", new[] { P(("$id", 2)), P(("$id", 3)) });
try
{
    await db.ExecuteBatchAsync("insert into probe(id) values($id)", new[] { P(("$id", 4)), P(("$id", 1)) });
    throw new Exception("Duplicate key was accepted");
}
catch (DbException) { checks++; }
Check((long)((Dictionary<string, object?>)await db.QuerySingleAsync("select count(*) n from probe", P()))["n"]! == 3, "Failed batch rolls back");
await Task.WhenAll(Enumerable.Range(10, 16).Select(i => Task.Run(async () =>
    { await (Task)db.ExecuteAsync("insert into probe(id) values($id)", P(("$id", i))); })));
for (int i = 100; i < 150; i++) db.QueueWrite("insert into probe(id) values($id)", P(("$id", i)));
db.Dispose();
dynamic reopened = Create("Database.DatabaseService");
await reopened.InitializeAsync(data, log);
Check((long)((Dictionary<string, object?>)await reopened.QuerySingleAsync("select count(*) n from probe", P()))["n"]! == 69,
    "Concurrent writes and pending write-behind rows survive disposal and reopening");
Check((string)((Dictionary<string, object?>)await reopened.QuerySingleAsync("pragma integrity_check", P()))["integrity_check"]! == "ok", "Database integrity");
Check(errors.Count == 0, "No write-behind errors");
if (mode == "other-first")
{
    dynamic config = Create("Config.RaidReviewConfig");
    config.WebSocketPort = 0;
    config.WebClientPort = 0;
    config.EnableLogFiles = false;
    config.AutoDelete = false;
    dynamic logger = Create("RaidReviewLogger");
    logger.Initialize(log, log, log, log, data, config);
    dynamic files = Create("FileSystem.DataFileService");
    files.Initialize(data);
    dynamic sessions = Create("Session.SessionManager", logger, config);
    dynamic items = Create("PostRaid.ItemResolver", folder, logger);
    dynamic handler = Create("WebSocket.WsPacketHandler", reopened, sessions, files, logger, items);
    dynamic compiler = Create("PostRaid.RaidPositionCompiler", files, logger);
    dynamic web = Create("Http.RaidReviewWebServer", config, reopened, files, logger, handler, compiler, folder);
    await web.StartAsync();
    var app = (WebApplication)web.GetType().GetField("_app", BindingFlags.NonPublic | BindingFlags.Instance).GetValue(web);
    try
    {
        var url = app.Urls.First().Replace("0.0.0.0", "127.0.0.1");
        using var http = new HttpClient { BaseAddress = new Uri(url), Timeout = TimeSpan.FromSeconds(10) };
        Check((await http.GetStringAsync("/")).Contains("<html"), "Embedded frontend is served");
        using var ws = new ClientWebSocket();
        using var timeout = new CancellationTokenSource(TimeSpan.FromSeconds(10));
        await ws.ConnectAsync(new Uri(url.Replace("http:", "ws:")), timeout.Token);
        var packet = JsonSerializer.Serialize(new { Action = "START", Payload = JsonSerializer.Serialize(new {
            sessionId = "sqlite-test", profileId = "sqlite-test", location = "bigmap", locationVariant = "",
            time = "2026-01-01T12:00:00", timeInRaid = "60", type = "PMC", detectedMods = "[]"
        }) });
        await ws.SendAsync(Encoding.UTF8.GetBytes(packet), WebSocketMessageType.Text, true, timeout.Token);
        string raids = "[]";
        for (int attempt = 0; attempt < 50; attempt++)
        {
            raids = await http.GetStringAsync("/api/profile/sqlite-test/raids/all");
            if (raids.Contains("bigmap")) break;
            await Task.Delay(50);
        }
        Check(raids.Contains("bigmap"), "WebSocket START persists to private SQLite and is readable through HTTP");
        await ws.CloseOutputAsync(WebSocketCloseStatus.NormalClosure, "test finished", timeout.Token);
        Check(errors.Count == 0, "No HTTP or WebSocket processing errors");
    }
    finally { await app.StopAsync(); await app.DisposeAsync(); files.FlushAndCloseAll(); }
}
reopened.Dispose();

if (args.Length > 4)
{
    var historicalData = Path.Combine(folder, "historical-data");
    Directory.CreateDirectory(historicalData);
    File.Copy(Path.GetFullPath(args[4]), Path.Combine(historicalData, "raid_review_mod.db"));
    dynamic history = Create("Database.DatabaseService");
    await history.InitializeAsync(historicalData, log);
    var before = (List<Dictionary<string, object?>>)await history.QueryAsync("select raidId, location from raid order by id", P());
    Check(before.Count > 0, "Historical raids remain readable");
    history.Dispose();
    dynamic again = Create("Database.DatabaseService");
    await again.InitializeAsync(historicalData, log);
    var after = (List<Dictionary<string, object?>>)await again.QueryAsync("select raidId, location from raid order by id", P());
    Check(before.Select(r => r["raidId"]).SequenceEqual(after.Select(r => r["raidId"])), "Migrations preserve historical raids on repeated initialization");
    Check((string)((Dictionary<string, object?>)await again.QuerySingleAsync("pragma integrity_check", P()))["integrity_check"]! == "ok", "Historical database integrity");
    Console.WriteLine($"Historical snapshot: {before.Count} raids, last location={before.Last()["location"]}");
    again.Dispose();
}
otherConnection?.Dispose();
Console.WriteLine($"PASS {(upgrade ? "upgrade-" : "")}{mode}: {checks} checks; temporary fixture: {folder}");

DbConnection OpenOther()
{
    var core = host.LoadFromAssemblyPath(Path.Combine(other, "SQLitePCLRaw.core.dll"));
    var provider = host.LoadFromAssemblyPath(Path.Combine(other, "SQLitePCLRaw.provider.e_sqlite3.dll"));
    var nativeName = OperatingSystem.IsWindows() ? "e_sqlite3.dll" : OperatingSystem.IsMacOS() ? "libe_sqlite3.dylib" : "libe_sqlite3.so";
    var native = NativeLibrary.Load(Path.Combine(other, "runtimes", rid, "native", nativeName));
    NativeLibrary.SetDllImportResolver(provider, (name, _, _) => name == "e_sqlite3" ? native : IntPtr.Zero);
    core.GetType("SQLitePCL.raw", true)!.GetMethod("SetProvider")!.Invoke(null,
        [Activator.CreateInstance(provider.GetType("SQLitePCL.SQLite3Provider_e_sqlite3", true)!)]);
    var sql = host.LoadFromAssemblyPath(Path.Combine(other, "Microsoft.Data.Sqlite.dll"));
    var result = (DbConnection)Activator.CreateInstance(sql.GetType("Microsoft.Data.Sqlite.SqliteConnection", true)!, ["Data Source=:memory:"])!;
    result.Open();
    return result;
}

static (string name, object? value)[] P(params (string name, object? value)[] values) => values;
static void CopyTree(string from, string to)
{
    Directory.CreateDirectory(to);
    foreach (var file in Directory.EnumerateFiles(from, "*", SearchOption.AllDirectories))
    {
        var target = Path.Combine(to, Path.GetRelativePath(from, file));
        Directory.CreateDirectory(Path.GetDirectoryName(target)!);
        File.Copy(file, target);
    }
}

sealed class HostContext(string server) : AssemblyLoadContext("SPT-host-test")
{
    protected override Assembly? Load(AssemblyName name)
    {
        var path = Path.Combine(server, name.Name + ".dll");
        return File.Exists(path) && !name.Name!.StartsWith("System.") && !name.Name.StartsWith("Microsoft.")
            ? LoadFromAssemblyPath(path) : null;
    }
}

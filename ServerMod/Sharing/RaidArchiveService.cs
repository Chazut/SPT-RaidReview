using System.Data.Common;
using System.Globalization;
using System.IO.Compression;
using System.Security.Cryptography;
using System.Text.Json;
using RaidReview.Database;
using RaidReview.FileSystem;
using RaidReview.PostRaid;

namespace RaidReview.Sharing;

internal sealed class RaidArchiveService(
    DatabaseService db, DataFileService files, RaidPositionCompiler compiler,
    RaidReviewLogger logger, string dataFolder)
{
    internal const long MaxUploadBytes = 512L * 1024 * 1024;
    private const long MaxExpandedBytes = 2L * 1024 * 1024 * 1024;
    private const long MaxTableBytes = 128L * 1024 * 1024;
    internal static readonly string[] Tables = [
        "raid", "player", "kills", "looting", "player_status", "ballistic",
        "loose_loot", "player_inventory", "bot_quest", "bot_objective", "phobos_field",
        "orbit_field", "orbit_bot_objective", "orbit_main_objectives", "orbit_ghost_fight",
        "orbit_ghost_hearing", "orbit_ghost_wake", "airdrop_landing", "airdrop_flight", "switch_state"
    ];
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);
    private readonly SemaphoreSlim gate = new(1, 1);

    internal sealed class Manifest
    {
        public string Format { get; set; } = "";
        public int Version { get; set; }
        public string RaidId { get; set; } = "";
        public string RaidReviewVersion { get; set; } = "";
        public string PositionVersion { get; set; } = "";
        public string ProfileName { get; set; } = "";
        public bool IsHeadless { get; set; }
        public Dictionary<string, Part> Files { get; set; } = new();
    }
    internal sealed record Part(long Bytes, string Sha256, long Rows);
    internal sealed record ImportResult(string RaidId, bool AlreadyExists, string? Warning);
    internal sealed record ExportResult(string Path, string FileName, string? Warning);
    private static string TableFile(string table) => $"tables/{table}.json";
    private static bool PortableColumn(string name) => name != "id" && !name.StartsWith("imported", StringComparison.Ordinal);
    private static string Q(string name) => "\"" + name.Replace("\"", "\"\"") + "\"";

    // All scratch paths are generated here, never derived from ZIP names.
    internal string CreateWorkFolder()
    {
        string path = Path.Combine(dataFolder, "transfers", Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(path);
        return path;
    }

    internal void DeleteWorkFolder(string path)
    {
        var root = Path.GetFullPath(Path.Combine(dataFolder, "transfers")) + Path.DirectorySeparatorChar;
        if (!Path.GetFullPath(path).StartsWith(root, StringComparison.OrdinalIgnoreCase))
            throw new InvalidOperationException("Invalid transfer workspace.");
        try { Directory.Delete(path, true); }
        catch (IOException ex) { logger.Warn($"[RAID_TRANSFER] Temporary file cleanup failed: {ex.Message}"); }
    }

    internal async Task<IDisposable> EnterAsync(CancellationToken ct)
    {
        if (!await gate.WaitAsync(0, ct)) throw new InvalidOperationException("Another raid transfer is running. Please try again when it finishes.");
        return new Release(gate);
    }
    private sealed class Release(SemaphoreSlim semaphore) : IDisposable
    {
        public void Dispose() => semaphore.Release();
    }

    internal async Task<ExportResult> ExportAsync(string raidId, Dictionary<string, object?> identity,
        string work, CancellationToken ct)
    {
        if (!Guid.TryParseExact(raidId, "D", out _)) throw new InvalidDataException("Invalid raid ID.");
        var manifest = new Manifest {
            Format = "raid-review", Version = 1, PositionVersion = compiler.ActiveVersion,
            RaidId = raidId,
            RaidReviewVersion = typeof(RaidArchiveService).Assembly.GetName().Version?.ToString() ?? "",
            ProfileName = identity.GetValueOrDefault("profileName")?.ToString() ?? "",
            IsHeadless = identity.GetValueOrDefault("isHeadless") is true
        };
        string positionsPath = Path.Combine(dataFolder, "positions", $"{raidId}_{compiler.ActiveVersion}_positions.json");
        string rawPath = Path.Combine(dataFolder, "positions", $"{raidId}_positions");
        // Export only completed recordings. The existing compiler can materialize
        // a recording whose delayed post-raid job has not run yet.
        await db.FlushWritesAsync(ct);
        var raid = await db.QuerySingleAsync("SELECT * FROM raid WHERE raidId = $id", ("$id", raidId));
        if (raid == null) throw new KeyNotFoundException("Raid not found.");
        if (string.IsNullOrEmpty(raid["exitStatus"]?.ToString()))
            throw new InvalidOperationException("Finish the raid before exporting it.");
        files.FlushAll();
        if (File.Exists(rawPath) && (!File.Exists(positionsPath)
            || File.GetLastWriteTimeUtc(rawPath) > File.GetLastWriteTimeUtc(positionsPath)))
            compiler.Compile(raidId);

        await using (var conn = await db.OpenTransferConnectionAsync(ct))
        {
            long totalRows = 0;
            // DbConnection.BeginTransaction uses SQLite BEGIN IMMEDIATE. A read
            // snapshot needs DEFERRED so recordings can keep writing through WAL.
            using (var begin = conn.CreateCommand())
            {
                begin.CommandText = "BEGIN DEFERRED";
                await begin.ExecuteNonQueryAsync(ct);
            }
            foreach (var table in Tables)
            {
                using var command = conn.CreateCommand();
                command.CommandText = $"SELECT * FROM {Q(table)} WHERE raidId = $id ORDER BY id";
                Add(command, "$id", raidId);
                await using var reader = await command.ExecuteReaderAsync(ct);
                string name = TableFile(table);
                string path = Path.Combine(work, table + ".json");
                long rows = 0;
                await using (var stream = File.Create(path))
                await using (var writer = new Utf8JsonWriter(stream))
                {
                    writer.WriteStartArray();
                    while (await reader.ReadAsync(ct))
                    {
                        writer.WriteStartObject();
                        for (int i = 0; i < reader.FieldCount; i++)
                        {
                            string column = reader.GetName(i);
                            if (!PortableColumn(column)) continue;
                            writer.WritePropertyName(column);
                            var value = reader.IsDBNull(i) ? null : reader.GetValue(i);
                            if (table == "raid" && column == "type" && identity.TryGetValue("type", out var type))
                                value = type;
                            JsonSerializer.Serialize(writer, value, Json);
                        }
                        writer.WriteEndObject();
                        rows++;
                        if (++totalRows > 2_000_000)
                            throw new InvalidDataException("This raid contains too many events for one archive.");
                        if (writer.BytesPending >= 64 * 1024) await writer.FlushAsync(ct);
                        if (stream.Length + writer.BytesPending > MaxTableBytes)
                            throw new InvalidDataException("This raid has too many events for one archive.");
                    }
                    writer.WriteEndArray();
                    await writer.FlushAsync(ct);
                }
                if (table == "raid" && rows != 1) throw new InvalidOperationException("Raid was removed during export.");
                manifest.Files.Add(name, await DescribeAsync(path, rows, ct));
            }
            using var end = conn.CreateCommand();
            end.CommandText = "ROLLBACK";
            await end.ExecuteNonQueryAsync(ct);
        }

        if (File.Exists(positionsPath))
        {
            string copy = Path.Combine(work, "positions.json");
            await using (var input = File.OpenRead(positionsPath))
            await using (var output = File.Create(copy))
                await CopyLimitedAsync(input, output, MaxExpandedBytes, ct);
            var validator = new PositionArchiveValidator(raidId);
            await using (var input = File.OpenRead(copy)) await validator.ValidateAsync(input, ct);
            manifest.Files.Add("positions.json", await DescribeAsync(copy, validator.Samples, ct));
        }
        if (manifest.Files.Values.Sum(p => p.Bytes) > MaxExpandedBytes)
            throw new InvalidDataException("This raid exceeds the 2 GB uncompressed archive limit.");

        string zipPath = Path.Combine(work, "raid.zip");
        using (var zip = ZipFile.Open(zipPath, ZipArchiveMode.Create))
        {
            foreach (var part in manifest.Files)
            {
                string source = Path.Combine(work, Path.GetFileName(part.Key));
                await using var input = File.OpenRead(source);
                await using var output = zip.CreateEntry(part.Key, CompressionLevel.Fastest).Open();
                await input.CopyToAsync(output, ct);
            }
            await using var metadata = zip.CreateEntry("manifest.json").Open();
            await JsonSerializer.SerializeAsync(metadata, manifest, Json, ct);
        }
        if (new FileInfo(zipPath).Length > MaxUploadBytes)
            throw new InvalidDataException("The compressed raid exceeds the 512 MB archive limit.");
        logger.Log($"[RAID_EXPORT] raid={raidId} files={manifest.Files.Count} bytes={new FileInfo(zipPath).Length} positions={manifest.Files.GetValueOrDefault("positions.json")?.Rows ?? 0}");
        return new(zipPath, $"RR-raid-{raidId}.zip", PositionWarning(manifest));
    }

    internal async Task<ImportResult> ImportAsync(string zipPath, string work, CancellationToken ct)
    {
        if (new FileInfo(zipPath).Length > MaxUploadBytes) throw new InvalidDataException("Raid archives must be 512 MB or smaller.");
        Manifest manifest;
        using (var zip = OpenArchive(zipPath))
        {
            var entry = zip.GetEntry("manifest.json");
            if (entry == null || entry.Length > 64 * 1024) throw new InvalidDataException("This is not a Raid Review export ZIP.");
            await using (var input = entry.Open())
                manifest = await JsonSerializer.DeserializeAsync<Manifest>(input, Json, ct)
                    ?? throw new InvalidDataException("Missing archive manifest.");
            if (manifest.Format != "raid-review" || manifest.Version != 1 || manifest.PositionVersion != "V4")
                throw new InvalidDataException("Unsupported raid archive version. Update Raid Review and try again.");
            if (!Guid.TryParseExact(manifest.RaidId, "D", out _) || manifest.ProfileName == null
                || manifest.ProfileName.Length > 512 || manifest.Files == null)
                throw new InvalidDataException("Invalid archive metadata.");
            var required = Tables.Select(TableFile).ToHashSet(StringComparer.Ordinal);
            var allowed = required.Append("positions.json").ToHashSet(StringComparer.Ordinal);
            if (!required.IsSubsetOf(manifest.Files.Keys) || manifest.Files.Keys.Any(k => !allowed.Contains(k))
                || zip.Entries.Count != manifest.Files.Count + 1
                || zip.Entries.Select(e => e.FullName).Distinct(StringComparer.Ordinal).Count() != zip.Entries.Count
                || zip.Entries.Any(e => e.FullName != "manifest.json" && !manifest.Files.ContainsKey(e.FullName)))
                throw new InvalidDataException("The archive contains missing, duplicate or unexpected files.");
            long total = 0;
            foreach (var part in manifest.Files)
            {
                if (part.Value == null || part.Value.Bytes < 0 || part.Value.Rows < 0)
                    throw new InvalidDataException("Invalid archive file metadata.");
                long limit = part.Key == "positions.json" ? MaxExpandedBytes : MaxTableBytes;
                entry = zip.GetEntry(part.Key)!;
                if (entry.Length != part.Value.Bytes || entry.Length > limit || entry.Length > MaxExpandedBytes - total)
                    throw new InvalidDataException("Archive size is invalid or exceeds the 2 GB uncompressed limit.");
                total += entry.Length;
                string path = Path.Combine(work, Path.GetFileName(part.Key));
                await using (var input = entry.Open())
                await using (var output = File.Create(path))
                    await CopyLimitedAsync(input, output, entry.Length, ct);
                var actual = await DescribeAsync(path, 0, ct);
                if (actual.Bytes != entry.Length || !string.Equals(actual.Sha256, part.Value.Sha256, StringComparison.OrdinalIgnoreCase))
                    throw new InvalidDataException($"Archive integrity check failed for {part.Key}.");
            }
        }

        // Full validation precedes the write transaction, including replay data.
        // No SQL or file path from the archive is ever executed or extracted.
        if (manifest.Files.TryGetValue("positions.json", out var positions))
        {
            var validator = new PositionArchiveValidator(manifest.RaidId);
            await using var input = File.OpenRead(Path.Combine(work, "positions.json"));
            await validator.ValidateAsync(input, ct);
            if (validator.Samples != positions.Rows) throw new InvalidDataException("Replay sample count does not match the manifest.");
        }
        var columns = new Dictionary<string, string[]>();
        await using var conn = await db.OpenTransferConnectionAsync(ct);
        long totalRows = 0;
        foreach (var table in Tables)
        {
            var schema = await SchemaAsync(conn, table, ct);
            string[]? selected = null;
            long count = 0;
            await foreach (var row in Rows(Path.Combine(work, table + ".json"), ct))
            {
                if (++totalRows > 2_000_000) throw new InvalidDataException("The archive contains too many events.");
                ValidateRow(row, schema, manifest.RaidId, table);
                selected ??= row.Keys.Order(StringComparer.Ordinal).ToArray();
                if (selected.Length != row.Count || selected.Any(c => !row.ContainsKey(c)))
                    throw new InvalidDataException($"Inconsistent columns in {table}.");
                count++;
            }
            if (count != manifest.Files[TableFile(table)].Rows || (table == "raid" && count != 1))
                throw new InvalidDataException($"Invalid row count in {table}.");
            columns[table] = selected ?? [];
        }

        await using var tx = await conn.BeginTransactionAsync(ct);
        using (var existing = conn.CreateCommand())
        {
            existing.Transaction = tx;
            existing.CommandText = "SELECT 1 FROM raid WHERE raidId = $id";
            Add(existing, "$id", manifest.RaidId);
            if (await existing.ExecuteScalarAsync(ct) != null)
                return new(manifest.RaidId, true, "This raid is already in your library. Nothing was replaced.");
        }
        string? publishedPositions = null;
        bool committed = false;
        try
        {
            foreach (var table in Tables)
            {
                var names = columns[table];
                if (names.Length == 0) continue;
                using var insert = conn.CreateCommand();
                insert.Transaction = tx;
                insert.CommandText = $"INSERT INTO {Q(table)} ({string.Join(",", names.Select(Q))}) VALUES ({string.Join(",", names.Select((_, i) => "$v" + i))})";
                for (int i = 0; i < names.Length; i++) Add(insert, "$v" + i, null);
                await insert.PrepareAsync(ct);
                await foreach (var row in Rows(Path.Combine(work, table + ".json"), ct))
                {
                    for (int i = 0; i < names.Length; i++) insert.Parameters[i].Value = Value(row[names[i]]);
                    await insert.ExecuteNonQueryAsync(ct);
                }
            }
            using (var origin = conn.CreateCommand())
            {
                origin.Transaction = tx;
                origin.CommandText = "UPDATE raid SET importedAt=$at, importedProfileName=$name, importedIsHeadless=$headless WHERE raidId=$id";
                Add(origin, "$at", DateTimeOffset.UtcNow.ToString("O"));
                Add(origin, "$name", manifest.ProfileName);
                Add(origin, "$headless", manifest.IsHeadless ? 1 : 0);
                Add(origin, "$id", manifest.RaidId);
                await origin.ExecuteNonQueryAsync(ct);
            }
            if (positions != null)
            {
                string destination = Path.Combine(dataFolder, "positions", $"{manifest.RaidId}_{compiler.ActiveVersion}_positions.json");
                Directory.CreateDirectory(Path.GetDirectoryName(destination)!);
                File.Move(Path.Combine(work, "positions.json"), destination, overwrite: false);
                publishedPositions = destination;
            }
            await tx.CommitAsync(ct);
            committed = true;
        }
        finally
        {
            if (!committed && publishedPositions != null) File.Delete(publishedPositions);
        }
        logger.Log($"[RAID_IMPORT] raid={manifest.RaidId} rows={totalRows} positions={positions?.Rows ?? 0} sourceVersion={manifest.RaidReviewVersion}");
        return new(manifest.RaidId, false, PositionWarning(manifest));
    }

    private static string? PositionWarning(Manifest manifest) =>
        manifest.Files.GetValueOrDefault("positions.json")?.Rows is > 0 ? null
            : "This recording has no positions. Events are available, but movement replay is unavailable.";

    private static ZipArchive OpenArchive(string path)
    {
        try { return ZipFile.OpenRead(path); }
        catch (InvalidDataException ex)
        {
            throw new InvalidDataException("This file is not a valid raid ZIP, or the download is incomplete.", ex);
        }
    }

    private static async Task<Part> DescribeAsync(string path, long rows, CancellationToken ct)
    {
        await using var input = File.OpenRead(path);
        return new(input.Length, Convert.ToHexString(await SHA256.HashDataAsync(input, ct)), rows);
    }

    internal static async Task CopyLimitedAsync(Stream input, Stream output, long limit, CancellationToken ct)
    {
        var buffer = new byte[64 * 1024];
        long total = 0;
        int count;
        while ((count = await input.ReadAsync(buffer, ct)) != 0)
        {
            total += count;
            if (total > limit) throw new InvalidDataException("Raid archive exceeds the allowed size.");
            await output.WriteAsync(buffer.AsMemory(0, count), ct);
        }
    }

    private static async IAsyncEnumerable<Dictionary<string, JsonElement>> Rows(string path,
        [System.Runtime.CompilerServices.EnumeratorCancellation] CancellationToken ct)
    {
        await using var stream = File.OpenRead(path);
        await foreach (var row in JsonSerializer.DeserializeAsyncEnumerable<Dictionary<string, JsonElement>>(stream, Json, ct))
            yield return row ?? throw new InvalidDataException("Null event in archive.");
    }

    private sealed record Column(string Type, bool Required, bool NotNull);
    private static async Task<Dictionary<string, Column>> SchemaAsync(DbConnection conn, string table, CancellationToken ct)
    {
        using var cmd = conn.CreateCommand();
        cmd.CommandText = $"PRAGMA table_info({Q(table)})";
        await using var reader = await cmd.ExecuteReaderAsync(ct);
        var result = new Dictionary<string, Column>(StringComparer.Ordinal);
        while (await reader.ReadAsync(ct))
        {
            string name = reader["name"].ToString()!;
            if (PortableColumn(name)) result.Add(name, new(reader["type"].ToString()!,
                Convert.ToInt64(reader["notnull"]) != 0 && reader["dflt_value"] is DBNull,
                Convert.ToInt64(reader["notnull"]) != 0));
        }
        return result;
    }

    private static void ValidateRow(Dictionary<string, JsonElement> row, Dictionary<string, Column> schema,
        string raidId, string table)
    {
        if (!row.TryGetValue("raidId", out var id) || id.ValueKind != JsonValueKind.String || id.GetString() != raidId)
            throw new InvalidDataException($"An event in {table} belongs to a different raid.");
        foreach (var (name, column) in schema)
            if (column.Required && (!row.TryGetValue(name, out var value) || value.ValueKind == JsonValueKind.Null))
                throw new InvalidDataException($"Missing required {table} field: {name}.");
        foreach (var (name, value) in row)
        {
            if (!schema.TryGetValue(name, out var column))
                throw new InvalidDataException($"Unsupported field in {table}: {name}. Update Raid Review and try again.");
            if (value.ValueKind == JsonValueKind.Null)
            {
                if (column.NotNull) throw new InvalidDataException($"Missing required {table} field: {name}.");
                continue;
            }
            bool valid = column.Type switch
            {
                "INTEGER" => value.ValueKind == JsonValueKind.Number && value.TryGetInt64(out _),
                "REAL" => value.ValueKind == JsonValueKind.Number && value.TryGetDouble(out double n) && double.IsFinite(n),
                _ => value.ValueKind == JsonValueKind.String && value.GetString()!.Length <= 2 * 1024 * 1024
            };
            if (!valid) throw new InvalidDataException($"Invalid {table} field: {name}.");
        }
        if (table == "raid" && (string.IsNullOrEmpty(row["exitStatus"].GetString())
            || !double.TryParse(row["timeInRaid"].GetString(), NumberStyles.Float, CultureInfo.InvariantCulture, out var duration)
            || !double.IsFinite(duration) || duration <= 10))
            throw new InvalidDataException("Only completed raids can be imported.");
    }

    private static object Value(JsonElement value) => value.ValueKind switch
    {
        JsonValueKind.Null => DBNull.Value,
        JsonValueKind.String => value.GetString()!,
        JsonValueKind.Number when value.TryGetInt64(out long n) => n,
        JsonValueKind.Number => value.GetDouble(),
        _ => throw new InvalidDataException("Unsupported event value.")
    };

    private static void Add(DbCommand cmd, string name, object? value)
    {
        var p = cmd.CreateParameter(); p.ParameterName = name; p.Value = value ?? DBNull.Value;
        cmd.Parameters.Add(p);
    }
}

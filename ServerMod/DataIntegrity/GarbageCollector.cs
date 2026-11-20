using RaidReview.Config;
using RaidReview.Database;
using RaidReview.FileSystem;

namespace RaidReview.DataIntegrity;

public class GarbageCollector
{
    private readonly DatabaseService _db;
    private readonly DataFileService _fileService;
    private readonly RaidReviewLogger _logger;
    private readonly RaidReviewConfig _config;
    private const string ActiveVersion = "V4";

    public GarbageCollector(DatabaseService db, DataFileService fileService, RaidReviewLogger logger, RaidReviewConfig config)
    {
        _db = db;
        _fileService = fileService;
        _logger = logger;
        _config = config;
    }

    public async Task CollectOldRaidsAsync()
    {
        _logger.Debug($"'config.autoDelete' is set to: '{_config.AutoDelete}'");

        if (!_config.AutoDelete)
        {
            _logger.Warn("Garbage collector for 'old raids' is disabled, watch storage space!");
            return;
        }

        _logger.Log($"Garbage collector deleting old raids, only keeping data for the last '{_config.AutoDeleteLimit}' raids.");

        var oldRaids = await _db.QueryAsync(
            $"SELECT * FROM raid WHERE timeInRaid > 10 AND importedAt = '' ORDER BY created_at DESC LIMIT 1000000 OFFSET {_config.AutoDeleteLimit}");

        if (oldRaids.Count == 0)
        {
            _logger.Log("All good, no old raids to purge.");
            return;
        }

        _logger.Log($"Found '{oldRaids.Count}' raids to delete.");
        foreach (var raid in oldRaids)
        {
            var raidId = raid["raidId"]?.ToString() ?? "";
            await DeleteRaidDataAsync(raidId);
        }
        _logger.Log("Garbage collector is done deleting old raids.");
    }

    /// <param name="minimumAge">
    /// Only raids started at least this long ago. Null: every unfinished raid, which is only safe while no raid can be
    /// running, at server start.
    /// </param>
    public async Task CollectUnfinishedRaidsAsync(TimeSpan? minimumAge = null)
    {
        _logger.Debug($"'config.autoDeleteUnfinishedRaids' is set to: '{_config.AutoDeleteUnfinishedRaids}'");

        if (!_config.AutoDeleteUnfinishedRaids)
        {
            _logger.Warn("Garbage collector for 'unfinished raids' is disabled.");
            return;
        }

        // Unfinished raids have an empty exitStatus (END packet never arrived to update it). A raid still in progress
        // has none yet either: its row is written at START, so only its age tells an abandoned raid from a running one.
        var sql = "SELECT raidId FROM raid WHERE importedAt = '' AND (exitStatus = '' OR exitStatus IS NULL)";
        var parameters = new List<(string, object?)>();
        if (minimumAge is { } age)
        {
            _logger.Log($"Garbage collector deleting unfinished raids started over {age.TotalHours:0.#} hours ago.");
            // created_at is CURRENT_TIMESTAMP: UTC, in the same 'YYYY-MM-DD HH:MM:SS' form as datetime().
            sql += " AND created_at < datetime('now', $age)";
            parameters.Add(("$age", $"-{(long)age.TotalSeconds} seconds"));
        }
        else
        {
            _logger.Log("Garbage collector deleting unfinished raids.");
        }

        var unfinishedRaids = await _db.QueryAsync(sql, parameters.ToArray());

        var raidCounts = unfinishedRaids
            .Select(r => r["raidId"]?.ToString() ?? "")
            .Where(id => !string.IsNullOrEmpty(id))
            .ToList();

        if (raidCounts.Count == 0)
        {
            _logger.Log("All good, no unfinished raids to purge.");
            return;
        }

        _logger.Log($"Found '{raidCounts.Count}' raids to delete.");
        foreach (var raidId in raidCounts)
            await DeleteRaidDataAsync(raidId);

        _logger.Log("Garbage collector is done deleting unfinished raids.");
    }

    private async Task DeleteRaidDataAsync(string raidId)
    {
        var tables = new[] { "kills", "looting", "player", "player_status", "ballistic", "loose_loot", "player_inventory", "bot_quest", "bot_objective", "phobos_field", "orbit_field", "orbit_bot_objective", "orbit_main_objectives", "orbit_ghost_fight", "orbit_ghost_hearing", "orbit_ghost_wake", "airdrop_landing", "airdrop_flight", "switch_state", "comet_decision", "raid" };

        // FK enforcement off during GC: legacy DBs can carry orphan rows
        // in tables that were dropped/renamed across past migrations, and
        // those would block delete on commit otherwise. PRAGMA foreign_keys
        // is a connection-level toggle and is a no-op inside a transaction.
        await _db.ExecuteAsync("PRAGMA foreign_keys = OFF");
        try
        {
            foreach (var table in tables)
            {
                try
                {
                    await _db.ExecuteAsync($"DELETE FROM {table} WHERE raidId = $raidId",
                        ("$raidId", raidId));
                }
                catch (Exception ex)
                {
                    _logger.Warn($"Failed to clean {table} for raid {raidId}: {ex.Message}");
                }
            }
        }
        finally
        {
            await _db.ExecuteAsync("PRAGMA foreign_keys = ON");
        }

        _fileService.DeleteFile("positions", "", "", $"{raidId}_positions");
        _fileService.DeleteFile("positions", "", "", $"{raidId}_{ActiveVersion}_positions.json");
    }
}

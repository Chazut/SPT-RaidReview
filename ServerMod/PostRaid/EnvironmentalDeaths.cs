using System.Text.Json;

namespace RaidReview.PostRaid;

internal static class EnvironmentalDeaths
{
    // Bounded lookup through the raid/profile/time index, only for confirmed deaths
    // that lack a kill event. Never infer gas from proximity or an old nonfatal hit.
    internal const string LegacyQuery = """
        SELECT s.profileId, MIN(CAST(s.time AS INTEGER)) AS time,
          (SELECT c.detail FROM comet_decision c
           WHERE c.raidId = s.raidId AND c.profileId = s.profileId
             AND c.time BETWEEN CAST(s.time AS INTEGER) - 500 AND CAST(s.time AS INTEGER)
             AND c.feature = 'T01' AND c.reason = 'health-loss-observed'
           ORDER BY c.time DESC, c.id DESC LIMIT 1) AS detail
        FROM player_status s
        WHERE s.raidId = $id AND s.status IN ('Dead', '1')
          AND NOT EXISTS (SELECT 1 FROM kills k WHERE k.raidId = s.raidId AND k.killedId = s.profileId)
        GROUP BY s.profileId
        """;

    internal static List<Dictionary<string, object?>> FromLegacy(IEnumerable<Dictionary<string, object?>> rows)
    {
        var result = new List<Dictionary<string, object?>>();
        foreach (var row in rows)
        {
            try
            {
                using var doc = JsonDocument.Parse(row.GetValueOrDefault("detail")?.ToString() ?? "null");
                if (!doc.RootElement.TryGetProperty("combatJournal", out var hit)
                    || hit.GetProperty("kind").GetString() != "hit-taken"
                    || hit.GetProperty("damageType").GetString() != "HotGases"
                    || !string.IsNullOrEmpty(hit.GetProperty("other").GetString())) continue;
                result.Add(new() { ["profileId"] = row["profileId"], ["time"] = row["time"], ["type"] = "HotGases" });
            }
            catch (Exception ex) when (ex is JsonException or InvalidOperationException or KeyNotFoundException) { }
        }
        return result;
    }
}

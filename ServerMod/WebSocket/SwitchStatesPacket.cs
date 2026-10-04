using System.Text.Json;

namespace RaidReview.WebSocket;

internal static class SwitchStatesPacket
{
    internal const string InsertSql = @"INSERT OR IGNORE INTO switch_state (raidId, sequence, switchId, time, name, state, x, y, z)
        VALUES ($raidId, $sequence, $switchId, $time, $name, $state, $x, $y, $z)";

    internal static List<(string name, object? value)[]> Parse(JsonElement payload, string raidId)
    {
        var rows = new List<(string, object?)[]>();
        if (payload.ValueKind != JsonValueKind.Object || !payload.TryGetProperty("changes", out var changes)
            || changes.ValueKind != JsonValueKind.Array || changes.GetArrayLength() > 32) return rows;
        foreach (var change in changes.EnumerateArray())
        {
            if (change.ValueKind != JsonValueKind.Object
                || !Text(change, "switchId", out var id) || string.IsNullOrEmpty(id)
                || !Text(change, "name", out var name) || !Text(change, "state", out var state)
                || !Integer(change, "time", out var time) || time < 0
                || !Integer(change, "sequence", out var sequence) || sequence < 1
                || !Number(change, "x", out var x) || !Number(change, "y", out var y) || !Number(change, "z", out var z)) continue;
            rows.Add(new (string, object?)[] { ("$raidId", raidId), ("$sequence", sequence), ("$switchId", id),
                ("$time", time), ("$name", name), ("$state", state), ("$x", x), ("$y", y), ("$z", z) });
        }
        return rows;
    }

    private static bool Text(JsonElement row, string key, out string value)
    {
        value = "";
        if (!row.TryGetProperty(key, out var field) || field.ValueKind != JsonValueKind.String) return false;
        value = field.GetString()!;
        return value.Length <= 256;
    }

    private static bool Integer(JsonElement row, string key, out long value)
    {
        value = 0;
        return row.TryGetProperty(key, out var field) && field.ValueKind == JsonValueKind.Number && field.TryGetInt64(out value);
    }

    private static bool Number(JsonElement row, string key, out double value)
    {
        value = 0;
        return row.TryGetProperty(key, out var field) && field.ValueKind == JsonValueKind.Number
            && field.TryGetDouble(out value) && double.IsFinite(value);
    }
}

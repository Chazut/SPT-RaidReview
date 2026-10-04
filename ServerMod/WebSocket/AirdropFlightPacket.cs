using System.Text.Json;

namespace RaidReview.WebSocket;

internal static class AirdropFlightPacket
{
    internal const string InsertSql = @"INSERT OR IGNORE INTO airdrop_flight (raidId, flightId, time, kind, dropId, x, y, z, heading)
        VALUES ($raidId, $flightId, $time, $kind, $dropId, $x, $y, $z, $heading)";

    internal static List<(string name, object? value)[]> Parse(JsonElement payload, string raidId)
    {
        var rows = new List<(string, object?)[]>();
        if (payload.ValueKind != JsonValueKind.Object || !payload.TryGetProperty("points", out var points)
            || points.ValueKind != JsonValueKind.Array || points.GetArrayLength() > 32) return rows;
        foreach (var point in points.EnumerateArray())
        {
            if (point.ValueKind != JsonValueKind.Object
                || !Text(point, "flightId", out var flight) || string.IsNullOrEmpty(flight)
                || !Text(point, "kind", out var kind) || kind is not ("sample" or "end" or "release" or "airborne")
                || !Text(point, "dropId", out var drop)
                || !point.TryGetProperty("time", out var time) || time.ValueKind != JsonValueKind.Number || !time.TryGetInt64(out var ms) || ms < 0
                || !Number(point, "x", out var x) || !Number(point, "y", out var y) || !Number(point, "z", out var z)
                || !Number(point, "heading", out var heading)) continue;
            if ((kind == "release" || kind == "airborne") && string.IsNullOrEmpty(drop)) continue;
            rows.Add(new (string, object?)[] { ("$raidId", raidId), ("$flightId", flight), ("$time", ms),
                ("$kind", kind), ("$dropId", drop), ("$x", x), ("$y", y), ("$z", z), ("$heading", heading) });
        }
        return rows;
    }

    private static bool Text(JsonElement point, string key, out string value)
    {
        value = "";
        if (!point.TryGetProperty(key, out var field) || field.ValueKind != JsonValueKind.String) return false;
        value = field.GetString()!;
        return value.Length <= 128;
    }

    private static bool Number(JsonElement point, string key, out double value)
    {
        value = 0;
        return point.TryGetProperty(key, out var field) && field.ValueKind == JsonValueKind.Number
            && field.TryGetDouble(out value) && double.IsFinite(value);
    }
}

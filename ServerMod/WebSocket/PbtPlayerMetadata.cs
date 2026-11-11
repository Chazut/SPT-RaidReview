using System.Text.Json;

namespace RaidReview.WebSocket;

internal static class PbtPlayerMetadata
{
    // Legacy clients and delayed SAIN snapshots must not erase confirmed identity.
    internal const string UpdateSql = "mod_PBT_cheater = MAX(mod_PBT_cheater, $pbt), "
        + "mod_PBT_personality = CASE WHEN $pbt = 1 AND $pbtType <> '' THEN $pbtType ELSE mod_PBT_personality END, "
        + "mod_PBT_cheats = CASE WHEN $pbt = 1 AND $pbtCheats <> '' THEN $pbtCheats ELSE mod_PBT_cheats END";

    // Periodic roster checks should not rewrite every unchanged participant.
    internal const string UpdateRequiredSql = " WHERE $pbt = 1 AND (mod_PBT_cheater = 0"
        + " OR ($pbtType <> '' AND mod_PBT_personality <> $pbtType)"
        + " OR ($pbtCheats <> '' AND mod_PBT_cheats <> $pbtCheats))";

    internal static int IsCheater(JsonElement player)
    {
        if (Read(player, "type") == "HUMAN" || Read(player, "mod_SAIN_brain") == "PLAYER") return 0;
        var value = Read(player, "mod_PBT_cheater");
        return value == "1" || value.Equals("true", System.StringComparison.OrdinalIgnoreCase) ? 1 : 0;
    }

    internal static string Text(JsonElement player, string key)
    {
        if (IsCheater(player) == 0) return "";
        var value = Read(player, key);
        return value.Length > 512 ? value[..512] : value;
    }

    private static string Read(JsonElement player, string key)
        => player.ValueKind == JsonValueKind.Object && player.TryGetProperty(key, out var value)
            && value.ValueKind is JsonValueKind.String or JsonValueKind.True or JsonValueKind.False or JsonValueKind.Number
            ? value.ToString() : "";
}

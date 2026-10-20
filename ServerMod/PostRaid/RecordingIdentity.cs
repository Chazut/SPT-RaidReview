using System.Text.RegularExpressions;

namespace RaidReview.PostRaid;

internal static class RecordingIdentity
{
    internal static void Apply(Dictionary<string, object?> raid, string? username, IEnumerable<Dictionary<string, object?>> players)
    {
        if (!string.IsNullOrEmpty(raid.GetValueOrDefault("importedAt")?.ToString()))
        {
            raid["profileName"] = raid.GetValueOrDefault("importedProfileName")?.ToString() ?? "";
            raid["isHeadless"] = Convert.ToInt64(raid.GetValueOrDefault("importedIsHeadless") ?? 0) != 0;
            return;
        }
        var headless = Regex.IsMatch(username ?? "", "^Headless_[0-9a-f]{24}$", RegexOptions.IgnoreCase);
        var humans = players.Where(p => p.GetValueOrDefault("type")?.ToString() == "HUMAN").ToArray();
        var names = humans.Select(p => p.GetValueOrDefault("name")?.ToString())
            .Where(name => !string.IsNullOrWhiteSpace(name)).Distinct().ToArray();
        raid["isHeadless"] = headless;
        raid["profileName"] = headless
            ? names.Length > 0 ? string.Join(", ", names) + " (headless)" : "Headless"
            : username ?? "";

        // START has no local player on a headless host and defaults to PMC.
        // Use recorded humans, including late joiners, for presentation. AI factions
        // and ambiguous/missing human metadata must not change the recorded type.
        if (headless && humans.Length > 0)
        {
            var types = humans.Select(p => RaidType(p.GetValueOrDefault("team")?.ToString())).Distinct().ToArray();
            if (types.Length == 1 && types[0] != null) raid["type"] = types[0];
        }
    }

    private static string? RaidType(string? side) => side switch
    {
        "Savage" or "4" => "SCAV",
        "Usec" or "Bear" or "1" or "2" => "PMC",
        _ => null
    };
}

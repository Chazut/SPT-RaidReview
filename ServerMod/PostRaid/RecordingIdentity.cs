using System.Text.RegularExpressions;

namespace RaidReview.PostRaid;

internal static class RecordingIdentity
{
    internal static void Apply(Dictionary<string, object?> raid, string? username, IEnumerable<string> humanNames)
    {
        var headless = Regex.IsMatch(username ?? "", "^Headless_[0-9a-f]{24}$", RegexOptions.IgnoreCase);
        var names = humanNames.Where(name => !string.IsNullOrWhiteSpace(name)).Distinct().ToArray();
        raid["isHeadless"] = headless;
        raid["profileName"] = headless
            ? names.Length > 0 ? string.Join(", ", names) + " (headless)" : "Headless"
            : username ?? "";
    }
}

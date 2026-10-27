using System.Text.Json;

namespace RaidReview.Http;

internal static class ProfileNames
{
    internal static async Task<Dictionary<string, string>> ReadAsync(string directory)
    {
        var names = new Dictionary<string, string>();
        if (!Directory.Exists(directory)) return names;
        try
        {
            foreach (var path in Directory.EnumerateFiles(directory, "*.json"))
            {
                try
                {
                    using var document = JsonDocument.Parse(await File.ReadAllTextAsync(path));
                    var root = document.RootElement;
                    // Other mods can keep non-profile JSON files in this directory.
                    // Valid JSON is not necessarily an object or a usable SPT profile.
                    if (root.ValueKind != JsonValueKind.Object
                        || !root.TryGetProperty("info", out var info) || info.ValueKind != JsonValueKind.Object
                        || !info.TryGetProperty("id", out var id) || id.ValueKind != JsonValueKind.String
                        || !info.TryGetProperty("username", out var username) || username.ValueKind != JsonValueKind.String)
                        continue;
                    var key = id.GetString();
                    var name = username.GetString();
                    if (!string.IsNullOrWhiteSpace(key) && !string.IsNullOrWhiteSpace(name)) names[key] = name;
                }
                catch (IOException) { }
                catch (UnauthorizedAccessException) { }
                catch (JsonException) { }
            }
        }
        // Profile names are optional decoration; unreadable files must not hide recorded raids.
        catch (IOException) { }
        catch (UnauthorizedAccessException) { }
        return names;
    }
}

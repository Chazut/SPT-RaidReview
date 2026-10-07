using System.Reflection;

namespace RaidReview.FileSystem;

internal static class LegacySqliteUpgrade
{
    private static readonly Dictionary<string, string> Placeholders = new(StringComparer.OrdinalIgnoreCase)
    {
        ["Microsoft.Data.Sqlite.dll"] = "RaidReview.LegacySqlite.MicrosoftData",
        ["SQLitePCLRaw.core.dll"] = "RaidReview.LegacySqlite.Core",
        ["SQLitePCLRaw.provider.e_sqlite3.dll"] = "RaidReview.LegacySqlite.Provider",
        ["SQLitePCLRaw.batteries_v2.dll"] = "RaidReview.LegacySqlite.Batteries"
    };

    internal static void ArchivePlaceholders(string modFolder, Action<string> log)
    {
        // SPT scans every root DLL before it calls mod code. The ZIP must overwrite
        // the legacy files with uniquely named managed placeholders first. Moving
        // genuine SQLite here alone would be too late to prevent a loader conflict.
        var root = Path.GetFullPath(modFolder);
        string? archive = null;
        foreach (var entry in Placeholders)
        {
            var path = Path.Combine(root, entry.Key);
            if (!File.Exists(path)) continue;
            var isPlaceholder = false;
            try
            {
                if (!string.Equals(AssemblyName.GetAssemblyName(path).Name, entry.Value, StringComparison.Ordinal))
                    continue;
                isPlaceholder = true;
                archive ??= Path.Combine(root, "lib", "sqlite", "legacy", "upgrade-" + Guid.NewGuid().ToString("N"));
                Directory.CreateDirectory(archive);
                File.Move(path, Path.Combine(archive, entry.Key));
                log($"[RAID-REVIEW] Upgrade: archived {entry.Key} under lib/sqlite/legacy.");
            }
            catch (Exception error) when (error is IOException or UnauthorizedAccessException or BadImageFormatException)
            {
                // A locked placeholder has no SQLite identity and is harmless for
                // this session. Retry archiving on the next start, without a restart.
                var detail = isPlaceholder ? "The placeholder is safe to leave in place." : "The file was left unchanged.";
                log($"[RAID-REVIEW] Upgrade: could not archive {entry.Key}: {error.Message} {detail}");
            }
        }
    }
}

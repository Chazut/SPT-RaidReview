using RAID_REVIEW;
using PBT.Client.Cheaters;
using System.Text.Json;
using RaidReview.WebSocket;

var checks = 0;
void Check(bool ok, string name) { if (!ok) throw new Exception(name); checks++; }
var reader = new PbtCheaterReader(typeof(CheaterRoster));
Check(reader.Supported, "Known roster contract");
Check(!new PbtCheaterReader(null).Supported, "Absent PBT");
Check(!new PbtCheaterReader(typeof(string)).Supported, "Changed contract");
Check(reader.Read(42) == null && reader.Read(0) == null, "Not a cheater");
CheaterRoster.accounts.Add(42);
Check(reader.Read(42)?.Personality == "" && CheaterRoster.rolled.Count == 0, "No forced PBT roll");
CheaterRoster.rolled[42] = new Rolled { Type = CheaterType.Rage, Cheats = Cheat.Aimbot | Cheat.Fly };
Check(reader.Read(42).Personality == "Rage" && reader.Read(42).Cheats == "Aimbot,Fly", "Existing roll read");
CheaterRoster.forced = new Config<Cheat> { Value = Cheat.Godmode };
Check(reader.Read(42).Cheats == "Aimbot,Godmode,Fly", "Forced flags included without reroll");
CheaterRoster.rolled[42].Cheats = Cheat.All;
Check(!reader.Read(42).Cheats.Contains("All"), "Composite enum expanded");
CheaterRoster.rolled[42].Cheats = (Cheat)4096;
Check(reader.Read(42).Cheats == "Godmode,Unknown", "Unknown flag retained as unknown");
CheaterRoster.forced = null; CheaterRoster.rolled[42].Cheats = Cheat.None;
Check(reader.Read(42).Cheats == "None", "Known zero differs from not yet rolled");

BepInEx.Bootstrap.Chainloader.PluginInfos["com.local.pbt.client"] = new BepInEx.Bootstrap.PluginInfo();
var player = new EFT.Player { IsAI = true, Profile = new EFT.Profile { AccountId = "42" } };
var data = new TrackingPlayer { profileId = "bot" };
Check(PbtIntegration.Capture(player, data) && data.mod_PBT_cheater, "Persistent identity even without active layer");
CheaterRoster.rolled[42].Cheats = Cheat.Aimbot;
Check(!PbtIntegration.Capture(player, data) && data.mod_PBT_cheats == "None", "At most one read per second");
UnityEngine.Time.unscaledTime = 1;
Check(PbtIntegration.Capture(player, data) && data.mod_PBT_cheats == "Aimbot", "Later details updated");
UnityEngine.Time.unscaledTime = 2;
Check(!PbtIntegration.Capture(player, data), "No duplicate snapshot");
CheaterRoster.rolled.Remove(42); UnityEngine.Time.unscaledTime = 3;
Check(!PbtIntegration.Capture(player, data) && data.mod_PBT_personality == "Rage", "Temporary missing roll preserves observed identity");
player.IsAI = false; player.AIData.BotOwner.Brain.Layer = "PbtCheater";
Check(!PbtIntegration.Capture(player, new TrackingPlayer { profileId = "human" }), "Human excluded");
player.IsAI = true; player.Profile.AccountId = "bad";
var layerOnly = new TrackingPlayer { profileId = "layerOnly" };
Check(PbtIntegration.Capture(player, layerOnly) && layerOnly.mod_PBT_cheater && layerOnly.mod_PBT_cheats == null, "Exact active layer fallback, no invented cheats");
player.AIData.BotOwner.Brain.Layer = "SAIN PbtCheater";
Check(!PbtIntegration.Capture(player, new TrackingPlayer { profileId = "lookalike" }), "Similar name is not evidence");
PbtIntegration.Reset(); player.Profile.AccountId = "42";
Check(PbtIntegration.Capture(player, new TrackingPlayer { profileId = "bot" }), "New raid can reuse profile ID immediately");

foreach (var stale in new[] { "SAIN:Search", "COMET:Push", "Orbit:Exfil", "9999" })
    Check(BehaviorOwnership.ResolvePbt(stale, "PbtCheater", true, false) == "PBT:Cheating", "PBT active layer owns behavior");
Check(BehaviorOwnership.ResolvePbt("SAIN:Search", "SAIN", true, false) == "SAIN:Search", "Identity alone does not override SAIN");
Check(BehaviorOwnership.ResolvePbt("Orbit:Exfil", "PbtCheater", true, true) == "Orbit:Exfil", "Ghost cannot own active PBT action");
Check(BehaviorOwnership.ResolvePbt("", "PbtCheater", false, false) == "", "Human action excluded");
foreach (var value in new[] { "true", "1", "\"True\"" })
{
    using var doc = JsonDocument.Parse("{\"mod_PBT_cheater\":" + value + "}");
    Check(PbtPlayerMetadata.IsCheater(doc.RootElement) == 1, "Wire flag supported");
}
foreach (var json in new[] { "{}", "[]", "{\"mod_PBT_cheater\":2}", "{\"type\":\"HUMAN\",\"mod_PBT_cheater\":true}", "{\"mod_SAIN_brain\":\"PLAYER\",\"mod_PBT_cheater\":true}" })
{
    using var doc = JsonDocument.Parse(json);
    Check(PbtPlayerMetadata.IsCheater(doc.RootElement) == 0, "Unknown/malformed/human metadata rejected");
}
Console.WriteLine($"PASS PBT compatibility: {checks} checks");

namespace PBT.Client.Cheaters
{
    [Flags] internal enum Cheat { None = 0, Aimbot = 1, Godmode = 2, Fly = 64, All = 67 }
    internal enum CheaterType { Rage }
    internal sealed class Rolled { public CheaterType Type { get; set; } public Cheat Cheats { get; set; } }
    internal class Config<T> { public T Value { get; set; } }
    internal static class CheaterRoster
    {
        public static HashSet<int> accounts = new();
        public static Dictionary<int, Rolled> rolled = new();
        public static Config<Cheat> forced;
        public static object Roll(object player) => throw new Exception("Recorder must never roll!");
        public static object TypeOf(object player) => Roll(player);
        public static object CheatsOf(object player) => Roll(player);
    }
}
namespace BepInEx.Bootstrap
{
    class PluginMarker { }
    class PluginInfo { public object Instance = new PluginMarker(); }
    static class Chainloader { public static Dictionary<string, PluginInfo> PluginInfos = new(); }
}
namespace UnityEngine { static class Time { public static float unscaledTime; } }
namespace EFT
{
    class Player { public bool IsAI; public Profile Profile; public Ai AIData = new(); }
    class Profile { public string AccountId; }
    class Ai { public Bot BotOwner = new(); }
    class Bot { public Brain Brain = new(); }
    class Brain { public string Layer = "SAIN"; public string ActiveLayerName() => Layer; }
}
namespace RAID_REVIEW
{
    class TrackingPlayer { public string profileId, mod_PBT_personality, mod_PBT_cheats; public bool mod_PBT_cheater; }
    static class RAID_REVIEW { public static List<string> RAID_REVIEW__DETECTED_MODS = new(); }
    static class LoggerInstance { public static Log Log = new(); }
    class Log { public void LogInfo(string s) {} public void LogWarning(string s) {} }
}

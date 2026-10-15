using System.Text.Json;
using RaidReview.PostRaid;

var checks = 0;
void Check(bool condition, string message) { checks++; if (!condition) throw new Exception(message); }
var locale = new Dictionary<string,string>();
var resolver = new ItemResolver(Path.Combine(Path.GetTempPath(), "rr-locale-test", "user", "mods", "RR"), new(), () => locale);
Check(resolver.ResolveName("", "later") == "Unknown item (later)", "unknown is identified, not blank");
locale["later ShortName"] = "Mod item";
foreach (var missing in new[] { null, "", " ", "undefined", "NULL" })
    Check(resolver.ResolveName(missing, "later") == "Mod item", "late locale entries resolve missing names");
Check(resolver.ResolveName("Recorded name", "later") == "Recorded name", "valid recorded names retained");
Check(resolver.ResolveName(null, null) == "Unknown item", "missing id fallback");
locale["long Name"] = "Full mod item name";
Check(resolver.ResolveName(null, "long") == "Full mod item name", "full name fallback");
const string duffle = "578f87a3245977356274f2cb";
locale[duffle + " Name"] = "Duffle bag";
locale[duffle + " ShortName"] = "Duffle";
foreach (var missing in new[] { null, "", " ", "undefined", "NULL", "Container", " container " })
    Check(resolver.ResolveContainerName(missing, duffle) == "Duffle bag", "headless container resolves its own full name");
Check(resolver.ResolveContainerName("Custom bag", duffle) == "Custom bag", "valid client container names retained");
Check(resolver.ResolveContainerName("", "later") == "Mod item", "mod container short name fallback");
Check(resolver.ResolveContainerName("", "missing") == "Container", "unknown container stays generic");
var containers = new List<Dictionary<string,object?>> {
    new() { ["itemName"]="Contents", ["templateId"]="later", ["inContainer"]=1, ["containerName"]="", ["containerTemplateId"]=duffle },
    new() { ["itemName"]="Contents", ["templateId"]="later", ["inContainer"]=true, ["containerName"]="" },
    new() { ["itemName"]="Ground item", ["inContainer"]=0, ["containerName"]="" }
};
resolver.ResolveRows(containers);
Check((string?)containers[0]["containerName"] == "Duffle bag", "container root resolved separately from content template");
Check((string?)containers[0]["itemName"] == "Contents" && (string?)containers[0]["containerTemplateId"] == duffle, "contents and root identity preserved");
Check((string?)containers[1]["containerName"] == "Container", "legacy missing root never inferred from contents");
Check((string?)containers[2]["containerName"] == "", "ground loot gets no invented container");
var identity = new Dictionary<string,object?> { ["profileId"] = "headless-id" };
RecordingIdentity.Apply(identity, "Headless_6acf7c122b70675b98bf862a", new[] {"Chazut", "Chazut"});
Check((string?)identity["profileName"] == "Chazut (headless)" && (bool)identity["isHeadless"]!, "readable recording owner");
Check((string?)identity["profileId"] == "headless-id", "session identity never rewritten");
RecordingIdentity.Apply(identity, "Headless_6acf7c122b70675b98bf862a", Array.Empty<string>());
Check((string?)identity["profileName"] == "Headless", "headless without participants");
RecordingIdentity.Apply(identity, "Headless_6acf7c122b70675b98bf862a", new[] {"Alice", "Bob"});
Check((string?)identity["profileName"] == "Alice, Bob (headless)", "multiple humans retained");
RecordingIdentity.Apply(identity, "Chazut", new[] {"Remote"});
Check((string?)identity["profileName"] == "Chazut" && !(bool)identity["isHeadless"]!, "ordinary recording unchanged");
RecordingIdentity.Apply(identity, "Headless_fan", new[] {"Remote"});
Check(!(bool)identity["isHeadless"]!, "ordinary username beginning Headless is not a host");
if (args.Length == 2)
{
    locale = JsonSerializer.Deserialize<Dictionary<string,string>>(File.ReadAllText(args[0]))!;
    var rows = JsonSerializer.Deserialize<List<Dictionary<string,object?>>>(File.ReadAllText(args[1]))!;
    var missing = rows.Count(r => !ItemResolver.HasName(r["itemName"]?.ToString()));
    var originals = rows.Select(r => r["templateId"]?.ToString()).ToArray();
    resolver.ResolveRows(rows);
    for (var i = 0; i < rows.Count; i++)
    {
        Check(ItemResolver.HasName(rows[i]["itemName"]?.ToString()), "recorded item always has a display name");
        Check(rows[i]["templateId"]?.ToString() == originals[i], "template ids preserved");
    }
    Console.WriteLine($"Replayed {rows.Count} item rows: {missing} missing names, {rows.Count(r => r["itemName"]?.ToString()?.StartsWith("Unknown item") == true)} explicit unknown fallbacks");
}
Console.WriteLine($"PASS {checks} item resolution and recording identity checks");

namespace RaidReview
{
    public class RaidReviewLogger
    {
        public void Log(string message) { }
        public void Warn(string message) { }
        public void Error(string message, Exception exception) => throw exception;
    }
}

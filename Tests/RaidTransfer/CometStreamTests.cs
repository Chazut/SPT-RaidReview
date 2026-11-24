using System.Text.Json;
using RaidReview.Database;

internal static class CometStreamTests
{
    internal static async Task Run(HttpClient client, DatabaseService db, string raidId, Action<bool,string> check)
    {
        foreach (string detail in new[] {
            """{"name":"Енот","weaponConfig":{"text":"}💫","nested":[1.00,null]},"after":42}""",
            """{ "firstConfig" : {"v":1}, "secondConfig" : {"v":2} }""",
            """{"weaponConfig":null,"noConfig":{"changed":true}}""",
            """{"nested":{"weaponConfig":{"other":true}}}""",
            "legacy opaque detail"
        })
        {
            var parts = CometDecisionStorage.Split(detail);
            check(parts.Prefix + parts.Config + parts.Tail == detail, "config splitting preserves every character");
        }

        const string profile = "cursor-test";
        for (int i = 0; i < 7; i++)
            await db.ExecuteAsync("INSERT INTO comet_decision (raidId,time,cometSession,sequence,profileId,name,feature,decision,stage,reason,detail) VALUES ($raid,$time,'cursor-fixture',$n,$profile,'Test','S01','Crossfire','evaluated','test','{}')",
                ("$raid", raidId), ("$time", i < 4 ? 123.5 : 124), ("$n", i), ("$profile", profile));
        string path = $"/api/raids/{raidId}/comet_map_events?profileId={profile}&limit=2";
        var ids = new HashSet<long>(); string seek = ""; int pages = 0;
        for (;;)
        {
            using var doc = JsonDocument.Parse(await client.GetStringAsync(path + seek));
            var root = doc.RootElement; var rows = root.GetProperty("events"); pages++;
            check(rows.GetArrayLength() is > 0 and <= 2, "cursor respects page bound");
            check(!root.TryGetProperty("total", out _), "map stream does not recount rows");
            foreach (var row in rows.EnumerateArray()) {
                check(ids.Add(row.GetProperty("id").GetInt64()), "same-time events are neither repeated nor skipped");
                check(row.GetProperty("profileId").GetString() == profile, "cursor remains scoped to the selected bot");
                check(row.GetProperty("detail").ValueKind == JsonValueKind.Object, "cursor retains compact projection");
            }
            var next = root.GetProperty("next");
            seek = "&afterTime=" + next.GetProperty("time").GetRawText() + "&afterId=" + next.GetProperty("id").GetRawText();
            if (!root.GetProperty("hasMore").GetBoolean()) break;
        }
        check(ids.Count == 7 && pages == 4, "cursor returns the entire stream including timestamp ties");
        using var end = JsonDocument.Parse(await client.GetStringAsync(path + seek));
        check(end.RootElement.GetProperty("events").GetArrayLength() == 0 && !end.RootElement.GetProperty("hasMore").GetBoolean(), "resume at end terminates");
        using var missing = JsonDocument.Parse(await client.GetStringAsync($"/api/raids/{raidId}/comet_map_events?profileId=missing"));
        check(missing.RootElement.GetProperty("events").GetArrayLength() == 0, "unknown profile is empty");
        foreach (var invalid in new[]{"&afterTime=1", "&afterId=1", "&afterTime=-1&afterId=2"})
            check((int)(await client.GetAsync(path + invalid)).StatusCode == 400, "invalid cursor rejected");
        var plan = await db.QueryAsync("EXPLAIN QUERY PLAN SELECT * FROM comet_decision WHERE raidId=$raid AND profileId=$profile AND (time,id)>($time,$id) ORDER BY time,id LIMIT 3", ("$raid",raidId),("$profile",profile),("$time",123.5),("$id",1));
        check(plan.Any(row => row.Values.Any(value => value?.ToString()?.Contains("idx_comet_raid_profile_time_id") == true)), "seek uses the profile index");
        foreach (var (seq,feature,stage) in new[]{(10,"T01","summary"),(11,"T02","summary"),(12,"T03","summary"),
                     (13,"T04","summary"),(14,"T01","evaluated"),(15,"X99","summary")})
            await db.ExecuteAsync("INSERT INTO comet_decision (raidId,time,cometSession,sequence,profileId,name,feature,decision,stage,reason,detail) VALUES ($raid,100,'cursor-fixture',$seq,'','T01',$feature,'test',$stage,'test','{}')",
                ("$raid",raidId),("$seq",seq),("$feature",feature),("$stage",stage));
        using var summaries = JsonDocument.Parse(await client.GetStringAsync($"/api/raids/{raidId}/comet_summaries"));
        var selected = summaries.RootElement.GetProperty("events").EnumerateArray()
            .Where(row => row.GetProperty("cometSession").GetString()=="cursor-fixture")
            .Select(row => row.GetProperty("sequence").GetInt32());
        check(selected.SequenceEqual(new[]{10,11,12,13}), "report endpoint returns only supported summary pages and preserves timestamp ties");
        await db.ExecuteAsync("DELETE FROM comet_decision WHERE cometSession='cursor-fixture'");
    }
}

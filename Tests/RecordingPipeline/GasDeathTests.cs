using EFT;
using RAID_REVIEW;
using RaidReview.PostRaid;
using System.Reflection;

internal static class GasDeathTests
{
    internal static void Run(Action<bool,string> check)
    {
        RecordingRoster.Reset(); Telemetry.Packets.Clear();
        var p=new Player{ProfileId="gas-victim"};
        var patch=new RecordingGasDeathPatch();
        check(typeof(RecordingGasDeathPatch).GetMethod("GetTargetMethod",BindingFlags.Instance|BindingFlags.NonPublic)!.Invoke(patch,null) is MethodInfo,"gas hook targets native death signature");
        var capture=typeof(RecordingGasDeathPatch).GetMethod("CaptureGas",BindingFlags.Static|BindingFlags.NonPublic)!;
        capture.Invoke(null,new object?[]{p,EDamageType.HotGases,null});
        RecordingGasDeaths.Capture(p,EDamageType.HotGases,null);
        check(Telemetry.Packets.Count==1,"environmental gas recorded once");
        var death=(TrackingRaidKill)Telemetry.Packets[0].Payload;
        check(death.type=="HotGases"&&death.profileId==death.killedId&&death.positionKilled.X==p.Position.x,"gas has location and no invented attacker");
        foreach(var damage in new[]{EDamageType.Fall,EDamageType.Landmine,EDamageType.Undefined})
            RecordingGasDeaths.Capture(new Player{ProfileId=damage.ToString()},damage,null);
        RecordingGasDeaths.Capture(new Player{ProfileId="attributed"},EDamageType.HotGases,p);
        check(Telemetry.Packets.Count==1,"other damage and attributed deaths stay on their existing path");
        RAID_REVIEW.RAID_REVIEW.KillTracking.Value=false;
        RecordingGasDeaths.Capture(new Player{ProfileId="disabled"},EDamageType.HotGases,null);
        RAID_REVIEW.RAID_REVIEW.KillTracking.Value=true;
        RAID_REVIEW.RAID_REVIEW.CanCapture=false;
        RecordingGasDeaths.Capture(new Player{ProfileId="not-recording"},EDamageType.HotGases,null);
        RAID_REVIEW.RAID_REVIEW.CanCapture=true;
        check(Telemetry.Packets.Count==1,"recording and kill-tracking switches respected");
        RecordingRoster.Reset(); RecordingGasDeaths.Capture(p,EDamageType.HotGases,null);
        check(Telemetry.Packets.Count==2,"next raid resets death deduplication");
        const string hit="""{"combatJournal":{"kind":"hit-taken","damageType":"HotGases","other":""}}""";
        var rows=new List<Dictionary<string,object?>>();
        foreach(var detail in new[]{hit,hit.Replace("HotGases","Bullet"),hit.Replace("\"other\":\"\"","\"other\":\"attacker\""),"null","{}","bad json"})
            rows.Add(new(){["profileId"]="victim",["time"]=1014659,["detail"]=detail});
        var legacy=EnvironmentalDeaths.FromLegacy(rows);
        check(legacy.Count==1&&(string)legacy[0]["type"]! == "HotGases","legacy evidence requires explicit gas without attacker; malformed rows ignored");
        RecordingRoster.Reset();Telemetry.Packets.Clear();
    }
}

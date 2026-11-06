using Newtonsoft.Json.Linq;
using RAID_REVIEW;

int checks=0;void Check(bool value,string why){checks++;if(!value)throw new Exception(why);}
var warnings=new List<string>();
RAID_REVIEW.RAID_REVIEW.stopwatch.Start();RAID_REVIEW.RAID_REVIEW.stopwatch.ElapsedMilliseconds=5000;UnityEngine.Time.realtimeSinceStartup=20;
CometIntegration.Bind(warnings.Add);
for(int i=0;i<207;i++)FakeComet.Pending.Enqueue($"{{\"schema\":1,\"session\":\"comet\",\"realtime\":19,\"sequence\":{i},\"feature\":\"A01\",\"stage\":\"selected\",\"name\":\"bot\"}}");
CometIntegration.FinishRecording();
Check(FakeComet.Pending.Count==0&&FakeComet.FlushedWhileOpen,"RR flushes COMET before stopping its clock and capture");
Check(Telemetry.Events.Count(x=>x.Kind=="COMET_DECISION")==207,"every event in a deferred burst reaches RR");
var rows=Telemetry.Events.Where(x=>x.Kind=="COMET_DECISION").Select(x=>JObject.FromObject(x.Data)).ToArray();
Check(rows.Select(x=>(int)x["sequence"]).SequenceEqual(Enumerable.Range(0,207)),"original order and sequence survive flush");
Check(rows.All(x=>(string)x["sessionId"]=="rr"&&(string)x["cometSession"]=="comet"),"raid identity is preserved");
Check(rows.All(x=>(long)x["time"]==4000),"deferred delivery records original event time, not delivery time");
RAID_REVIEW.RAID_REVIEW.CanCapture=false;
FakeComet.Emit("{\"schema\":1,\"session\":\"comet\",\"realtime\":21,\"feature\":\"C13\",\"stage\":\"cleanup\"}");
Check(Telemetry.Events.Count(x=>x.Kind=="COMET_DECISION")==208,"late cleanup stays attached to the ended raid");
CometIntegration.Unbind();Check(warnings.Count==0,"optional integration remains healthy");
// Older COMET has no flush method; binding and ordinary recording remain supported.
HarmonyLib.AccessTools.Type=typeof(LegacyComet);RAID_REVIEW.RAID_REVIEW.CanCapture=true;
CometIntegration.Bind(warnings.Add);CometIntegration.FinishRecording();CometIntegration.Unbind();
Check(warnings.Count==0,"legacy COMET remains compatible without FlushPending");
Console.WriteLine($"COMET deferred recording: {checks} production integration checks passed.");

public static class FakeComet
{
    public const int SchemaVersion=1;public static event Action<string> Published;
    public static Queue<string> Pending=new();public static bool FlushedWhileOpen;
    public static string GetCurrentDecision(string id)=>"";
    public static string GetRaidSession()=>"comet";
    public static void Emit(string json)=>Published?.Invoke(json);
    public static void FlushPending(){FlushedWhileOpen=RAID_REVIEW.RAID_REVIEW.CanCapture&&RAID_REVIEW.RAID_REVIEW.stopwatch.IsRunning;while(Pending.Count>0)Emit(Pending.Dequeue());}
}
public static class LegacyComet
{
    public const int SchemaVersion=1;public static event Action<string> Published;
    public static string GetCurrentDecision(string id)=>"";
    public static string GetRaidSession()=>"legacy";
}
namespace HarmonyLib {public static class AccessTools {public static Type Type=typeof(FakeComet);public static Type TypeByName(string name)=>Type;}}
namespace UnityEngine {public static class Time {public static float realtimeSinceStartup;}}
namespace RAID_REVIEW
{
    public sealed class Clock {public bool IsRunning;public long ElapsedMilliseconds;public void Start()=>IsRunning=true;}
    public static class RAID_REVIEW {public static bool CanCapture=true;public static string sessionId="rr";public static Clock stopwatch=new();}
    public static class Telemetry {public static List<(string Kind,object Data)> Events=new();public static Task SendSnapshot(string kind,object data){Events.Add((kind,data));return Task.CompletedTask;}}
    public static class CometBehaviorDecision
    {
        public static string Resolve(string a,string b)=>b;
        public static string ResolveCrossfire(string a,string b,string c,bool d)=>c;
        public static string ResolvePostCombat(string a,string b,string c,bool d)=>c;
    }
}

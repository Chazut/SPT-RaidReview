using RAID_REVIEW;
using Newtonsoft.Json.Linq;
using System.Diagnostics;
using System.Globalization;
int checks=0;
void Check(bool ok,string why){checks++;if(!ok)throw new Exception(why);}
void Compare(string json)
{
 var expected=JObject.Parse(json);var h=CometEventHeader.Read(json);
 Check(h.Schema==(int?)expected["schema"] && h.Realtime==(double?)expected["realtime"],"schema/clock preserved");
 Check(h.Sequence==((long?)expected["sequence"]??0),"sequence preserved");
 Check(h.Session==(string)expected["session"]&&h.ProfileId==(string)expected["profileId"]&&h.Name==(string)expected["name"],"identity preserved");
 Check(h.Feature==(string)expected["feature"]&&h.Decision==(string)expected["decision"]&&h.Stage==(string)expected["stage"]&&h.Reason==(string)expected["reason"],"decision preserved");
}
Compare("{\"schema\":1,\"realtime\":12.25,\"sequence\":9223372036854775806,\"name\":\"a\\\"b\\n한글\",\"session\":\"one\",\"detail\":{\"schema\":9,\"name\":\"wrong\",\"x\":[1,{},null]},\"stage\":\"cleanup\",\"feature\":\"C13\"}");
Compare("{\"schema\":1,\"realtime\":1.2,\"name\":\"old\",\"name\":\"new\",\"profileId\":null}");
var culture=CultureInfo.CurrentCulture;CultureInfo.CurrentCulture=CultureInfo.GetCultureInfo("fr-FR");
Compare("{\"schema\":1,\"realtime\":1.25e2}");CultureInfo.CurrentCulture=culture;
foreach(string bad in new[]{"[]","{}","{\"schema\":2,\"realtime\":1}","{\"schema\":1,\"realtime\":NaN}","{\"schema\":1,\"realtime\":Infinity}","{\"schema\":1,\"realtime\":1,\"sequence\":{}}","{\"schema\":1,\"realtime\":1,\"name\":[]}","{\"schema\":1,\"realtime\":1,\"detail\":[","{\"schema\":1,\"realtime\":1} {}",new string(' ',32769)})
{bool rejected=false;try{CometEventHeader.Read(bad);}catch{rejected=true;}Check(rejected,"reject malformed/oversized/nonfinite envelope");}
if(args.Length>0)
{
 var lines=File.ReadLines(args[0]).Where(x=>x.Length<=32768).Where(x=>{var j=JObject.Parse(x);return (int?)j["schema"]==1&&j["realtime"]!=null;}).ToArray();
 foreach(var line in lines)Compare(line);
 // Warm up both paths. Report medians to avoid attributing JIT to either implementation.
 foreach(var line in lines.Take(100)){CometEventHeader.Read(line);JObject.Parse(line);}
 (double ms,long bytes) Measure(bool streaming)
 {
  GC.Collect();long bytes=GC.GetAllocatedBytesForCurrentThread();var sw=Stopwatch.StartNew();
  foreach(var line in lines){if(streaming)CometEventHeader.Read(line);else JObject.Parse(line);}
  return(sw.Elapsed.TotalMilliseconds,GC.GetAllocatedBytesForCurrentThread()-bytes);
 }
 var old=new List<(double ms,long bytes)>();var next=new List<(double ms,long bytes)>();
 for(int i=0;i<5;i++){old.Add(Measure(false));next.Add(Measure(true));}
 Console.WriteLine(System.Text.Json.JsonSerializer.Serialize(new{events=lines.Length,oldMilliseconds=old.OrderBy(x=>x.ms).ElementAt(2).ms,newMilliseconds=next.OrderBy(x=>x.ms).ElementAt(2).ms,oldAllocatedBytes=old[2].bytes,newAllocatedBytes=next[2].bytes}));
}
Console.WriteLine($"COMET envelope: {checks} checks passed.");

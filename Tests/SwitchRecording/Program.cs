using System.Text.Json;
using EFT;
using EFT.Interactive;
using RAID_REVIEW;
using RaidReview.WebSocket;

class Program
{
    static int checks;
    static void Check(bool value, string why) { checks++; if (!value) throw new Exception(why); }
    static void Main()
    {
        var sw = new Switch { Id = "power", name = "Power", DoorState = EDoorState.Shut };
        var world = new GameWorld();
        LocationScene.Objects = new WorldInteractiveObject[] { sw, new WorldInteractiveObject(), sw, null };
        SwitchRecorder.Start(world);
        Check(Telemetry.Packets.Count == 1 && Telemetry.Packets[0].GetProperty("changes").GetArrayLength() == 1, "initial snapshot and duplicate object filtered");
        Check(sw.Subscriptions == 1, "one subscription");
        sw.Set(EDoorState.Interacting); sw.Set(EDoorState.Open); sw.Set(EDoorState.Open);
        SwitchRecorder.Flush();
        var rows = SwitchStatesPacket.Parse(Telemetry.Packets[1], "raid");
        Check(rows.Count == 2, "two same-time changes and no unchanged duplicate");
        Check((string)rows[1].Single(p => p.name == "$state").value == "Open", "real resulting state recorded");
        Check((long)rows[1].Single(p => p.name == "$sequence").value == 3, "stable ordering");
        var before = Telemetry.Packets.Count;
        RAID_REVIEW.RAID_REVIEW.CanCapture = false; sw.Set(EDoorState.Shut); SwitchRecorder.Flush();
        Check(Telemetry.Packets.Count == before, "disabled recording ignores changes");
        SwitchRecorder.FinishRaid(); Check(sw.Subscriptions == 0, "teardown unsubscribes");
        RAID_REVIEW.RAID_REVIEW.CanCapture = true;
        Telemetry.Packets.Clear(); SwitchRecorder.Start(world);
        Check(Telemetry.Packets[0].GetProperty("changes")[0].GetProperty("state").GetString() == "Shut", "new raid gets fresh initial state");
        Check(Telemetry.Packets[0].GetProperty("changes")[0].GetProperty("sequence").GetInt64() == 1, "raid sequence reset");
        sw.Set(EDoorState.Open); SwitchRecorder.FinishRaid();
        Check(Telemetry.Packets.Count == 2 && sw.Subscriptions == 0, "end flushes outstanding events");
        sw.Set(EDoorState.Shut); SwitchRecorder.Flush(); Check(Telemetry.Packets.Count == 2, "no capture after teardown");
        Telemetry.Packets.Clear();
        var switches = Enumerable.Range(0, 70).Select(i => new Switch { Id = "s" + i }).ToArray();
        LocationScene.Objects = switches;
        SwitchRecorder.Start(new GameWorld());
        Check(Telemetry.Packets.Count == 3, "initial scan chunked");
        Check(Telemetry.Packets.All(p => p.GetProperty("changes").GetArrayLength() <= 32), "bounded packet size");
        Check(Telemetry.Packets.Sum(p => SwitchStatesPacket.Parse(p, "raid").Count) == 70, "all initial switches reach parser");
        SwitchRecorder.Reset(); Check(switches.All(s => s.Subscriptions == 0), "all detached");
        var valid = "{\"changes\":[{\"switchId\":\"a\",\"name\":\"n\",\"state\":\"Shut\",\"time\":0,\"sequence\":1,\"x\":0,\"y\":1,\"z\":2}]}";
        foreach (var input in new[] { "null", "[]", "{}", valid.Replace("\"time\":0", "\"time\":-1"), valid.Replace("\"sequence\":1", "\"sequence\":0"), valid.Replace("\"x\":0", "\"x\":\"0\""), valid.Replace("\"a\"", "\"\"") })
            Check(SwitchStatesPacket.Parse(JsonDocument.Parse(input).RootElement, "raid").Count == 0, "malformed packet rejected");
        Check(SwitchStatesPacket.Parse(JsonDocument.Parse(valid).RootElement, "raid").Count == 1, "valid packet accepted");
        Console.WriteLine($"PASS {checks} switch capture and packet checks");
    }
}

public static class LocationScene {
    public static IEnumerable<WorldInteractiveObject> Objects;
    public static IEnumerable<T> GetAllObjects<T>(bool withDisabled=false) {
        if (typeof(T) != typeof(WorldInteractiveObject) || !withDisabled) throw new Exception("Query the registered base type, including initially disabled switches");
        return Objects.Cast<T>();
    }
}
namespace EFT {
    public class GameWorld { public IEnumerable<WorldInteractiveObject> WorldInteractiveObjects() => throw new NullReferenceException("Offline World registry is absent"); }
}
namespace EFT.Interactive {
    public enum EDoorState { Shut, Open, Locked, Interacting }
    public class WorldInteractiveObject { public string Id; public EDoorState DoorState; public event Action<WorldInteractiveObject,EDoorState,EDoorState> OnDoorStateChanged; public int Subscriptions => OnDoorStateChanged?.GetInvocationList().Length ?? 0; public void Set(EDoorState state) { var before=DoorState; DoorState=state; OnDoorStateChanged?.Invoke(this,before,state); } }
    public class Switch : WorldInteractiveObject { public string name="Switch"; public Transform transform=new(); public int GetInstanceID()=>GetHashCode(); }
    public class Transform { public Position position=new(); }
    public class Position { public float x=1,y=2,z=3; }
}
namespace RAID_REVIEW {
    public static class RAID_REVIEW { public static bool CanCapture=true; public static string sessionId="profile"; public static System.Diagnostics.Stopwatch stopwatch=new(); }
    public static class Telemetry { public static bool Faulted=false; public static List<JsonElement> Packets=new(); public static void SendSnapshot(string action, object payload) { if(action!="SWITCH_STATES") throw new Exception(action); Packets.Add(JsonSerializer.SerializeToElement(payload,new JsonSerializerOptions{IncludeFields=true})); } }
    public static class LoggerInstance { public static Logger Log=new(); public class Logger { public void LogInfo(string s) {} public void LogWarning(string s)=>throw new Exception(s); } }
    internal static class RecordingPerformance { internal enum Stage { Switch } internal static IDisposable Measure(Stage s)=>new Sample(); class Sample:IDisposable { public void Dispose() {} } }
}

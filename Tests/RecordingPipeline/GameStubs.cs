// Runtime boundaries only. Sender, DTOs, roster and server packet dispatch use their production sources.
namespace EFT
{
    public enum EPlayerSide { Savage = 4, Usec = 1, Bear = 2 }
    public enum ExitStatus { Survived, Killed }
    public interface IPlayer { }
    public class Health { public bool IsAlive = true; }
    public class Player : IPlayer
    {
        public string ProfileId, KillerId;
        public bool IsAI;
        public InventoryLogic.Inventory Inventory = new();
        public string Location = "bigmap";
        public UnityEngine.Vector3 Position = new(1,2,3);
        [System.Runtime.CompilerServices.MethodImpl(System.Runtime.CompilerServices.MethodImplOptions.NoInlining)]
        public virtual void OnItemAddedOrRemoved(InventoryLogic.Item item, InventoryLogic.ItemAddress location, bool added) { }
        public bool Destroyed;
        public Health HealthController = new();
        public void OnDead(EDamageType damage) { HealthController.IsAlive=false; }
        // Unity compares a destroyed component equal to null although its CLR reference survives.
        public static bool operator ==(Player a, Player b)
        {
            if (ReferenceEquals(a, null)) return ReferenceEquals(b, null) || b.Destroyed;
            if (ReferenceEquals(b, null)) return a.Destroyed;
            return ReferenceEquals(a, b);
        }
        public static bool operator !=(Player a, Player b) => !(a == b);
        public override bool Equals(object obj) => ReferenceEquals(this, obj);
        public override int GetHashCode() => System.Runtime.CompilerServices.RuntimeHelpers.GetHashCode(this);
    }
    public class BotOwner { public Player GetPlayer; }
    public class GameWorld
    {
        public List<Player> AllPlayersEverExisted = new();
        public void RegisterPlayer(IPlayer iPlayer) { }
        public void UnregisterPlayer(IPlayer iPlayer) { }
    }
}
public enum EDamageType { Undefined, Landmine, Fall }
public class LeaveBase { protected EFT.BotOwner bot; public LeaveBase(EFT.BotOwner bot) { this.bot=bot; } }
public class BotLeaveData : LeaveBase { public bool LeaveComplete; public BotLeaveData(EFT.BotOwner bot):base(bot) { } public void RemoveFromMap() { LeaveComplete=true; } }
namespace EFT.HealthSystem { public class Unused { } }
namespace BepInEx { public class Unused { } }
namespace Comfort.Common { public static class Singleton<T> { public static T Instance { get; set; } } }
namespace UnityEngine { public struct Vector3 { public float x, y, z; public Vector3(float x, float y, float z) { this.x=x; this.y=y; this.z=z; } } }
namespace SPT.Reflection.Patching
{
    public abstract class ModulePatch { protected abstract System.Reflection.MethodBase GetTargetMethod(); protected static RAID_REVIEW.TestLog Logger = new(); }
    public class PatchPrefix : Attribute { }
    public class PatchPostfix : Attribute { }
}
namespace RAID_REVIEW
{
    public static class RAID_REVIEW
    {
        private static bool captureEnabled = true;
        public static bool CanCapture { get => captureEnabled && !RecordingRoster.IsEnding; set => captureEnabled=value; }
        public static Setting<bool> LootTracking = new() {Value=true};
        public static int GetHandbookPrice(EFT.InventoryLogic.Item item) => item.Price;
        public static string sessionId = "session";
        public static System.Diagnostics.Stopwatch stopwatch = System.Diagnostics.Stopwatch.StartNew();
    }
    public static class Telemetry
    {
        public static List<(string Action, object Payload)> Packets = new();
        public static bool SendSnapshot(string action, object payload) { Packets.Add((action,payload)); return true; }
    }
}
namespace EFT.InventoryLogic
{
    public enum EPlayerItems { Equipment }
    public class Inventory {
        public List<Item> Items = new(); public bool Fail; public int Reads;
        public IEnumerable<Item> GetPlayerItems(EPlayerItems kind) { Reads++; if(Fail) throw new InvalidOperationException("not ready"); return Items; }
    }
    public class Item { public string Id="item", TemplateId="template"; public int StackObjectsCount=1, Price=100; public bool QuestItem; public ItemAddress Parent=new(); public string LocalizedShortName()=>"Loot"; }
    public class ItemAddress { public Container Container = new(); }
    public class Container { public string ID="backpack"; }
}
namespace RAID_REVIEW
{
    public class Setting<T> { public T Value; }
    public class TestLog { public List<string> Errors=new(); public void LogError(string text)=>Errors.Add(text); public void LogWarning(string text)=>Errors.Add(text); }
    public static class LoggerInstance { public static TestLog Log=new(); }
    internal static class RecordingPerformance
    {
        internal enum Stage {Loot}
        internal struct Sample : IDisposable { public void Dispose() {} }
        internal static Sample Measure(Stage stage)=>new();
    }
}

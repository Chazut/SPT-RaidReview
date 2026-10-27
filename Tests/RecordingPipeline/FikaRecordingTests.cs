using EFT;
using EFT.InventoryLogic;
using RAID_REVIEW;
using HarmonyLib;
using System.Reflection;
using Fika.Core.Main.Players;
using Fika.Core.Networking;
using Fika.Core.Networking.Packets.Generic.SubPackets;
using Comfort.Common;

internal static class FikaRecordingTests
{
    internal static void Run(Action<bool,string> check)
    {
        FikaRecording.Initialize(null);
        check(!FikaRecording.HandlesLoot(new Player()), "solo has no Fika dependency");
        var basePatch = new Harmony("rr.test.base-loot");
        basePatch.Patch(typeof(Player).GetMethod(nameof(Player.OnItemAddedOrRemoved)),
            postfix:new HarmonyMethod(typeof(RAID_REVIEW_Player_OnItemAddedOrRemovedPatch), "PatchPostFix"));
        FikaRecording.Initialize(typeof(ObservedPlayer).Assembly);
        check(LoggerInstance.Log.Errors.Count==0, "Fika hooks installed successfully");
        foreach(var side in Enum.GetValues<EPlayerSide>())
            check(RecordingPlayerIdentity.Brain(false, side)=="PLAYER", "all human factions use PLAYER brain");
        check(RecordingPlayerIdentity.Brain(true,EPlayerSide.Bear)=="PMC", "bot PMC brain unchanged");
        check(RecordingPlayerIdentity.Brain(true,EPlayerSide.Savage)=="SCAV", "bot Scav brain unchanged");

        var remote = new ObservedPlayer{ProfileId="remote"};
        var local = new Player{ProfileId="local"};
        var item = new Item{Id="key", Price=12000, StackObjectsCount=3};
        var address = new ItemAddress();
        Telemetry.Packets.Clear();
        remote.OnItemAddedOrRemoved(item,address,true);
        var loot = (TrackingLootItem)Telemetry.Packets.Single().Payload;
        check(loot.profileId=="remote" && loot.added && loot.qty==3 && loot.price==12000
            && loot.x==1 && loot.z==3 && loot.sessionId==RAID_REVIEW.RAID_REVIEW.sessionId,
            "empty observed override records remote pickup with value, quantity and position");
        local.OnItemAddedOrRemoved(item,address,true);
        check(Telemetry.Packets.Count==2 && ((TrackingLootItem)Telemetry.Packets.Last().Payload).profileId=="local",
            "solo and host loot still captured");
        remote.CallBase=true;
        remote.OnItemAddedOrRemoved(item,address,true);
        check(Telemetry.Packets.Count==3, "observed override calling base never duplicates loot");
        remote.OnItemAddedOrRemoved(item,address,false);
        remote.OnItemAddedOrRemoved(item,address,true);
        RAID_REVIEW_Player_OnItemAddedOrRemovedPatch.FlushPending(true);
        check(Telemetry.Packets.Count==3, "internal inventory moves do not count as new loot");
        remote.OnItemAddedOrRemoved(item,address,false);
        local.OnItemAddedOrRemoved(item,address,true);
        RAID_REVIEW_Player_OnItemAddedOrRemovedPatch.FlushPending(true);
        check(Telemetry.Packets.Count==5 && !((TrackingLootItem)Telemetry.Packets.Last().Payload).added,
            "transfer between players records both sides");
        var count=Telemetry.Packets.Count;
        address.Container.ID="cartridges"; remote.OnItemAddedOrRemoved(item,address,true);
        address.Container.ID="backpack";
        RAID_REVIEW.RAID_REVIEW.LootTracking.Value=false; remote.OnItemAddedOrRemoved(item,address,true);
        RAID_REVIEW.RAID_REVIEW.LootTracking.Value=true;
        RAID_REVIEW.RAID_REVIEW.CanCapture=false; remote.OnItemAddedOrRemoved(item,address,true);
        RAID_REVIEW.RAID_REVIEW.CanCapture=true;
        remote.Location="hideout"; remote.OnItemAddedOrRemoved(item,address,true);remote.Location="bigmap";
        check(Telemetry.Packets.Count==count, "magazines, disabled logging, menu and hideout ignored");

        var manager = new TestNetworkManager();
        Singleton<IFikaNetworkManager>.Instance=manager;
        foreach(var complete in new[]{false,true})
        foreach(var die in new[]{false,true})
        foreach(var tickDuringDispose in new[]{false,true})
        {
            RecordingRoster.Reset();Telemetry.Packets.Clear();
            remote=new(){ProfileId="remote"};
            manager.CoopHandler=new();manager.CoopHandler.Players[42]=remote;
            manager.CoopHandler.Complete=complete;
            manager.CoopHandler.TickDuringDispose=tickDuringDispose;
            manager.CoopHandler.DieDuringExtract=die;
            RecordingRoster.Add(remote);RecordingRoster.Observe(remote);
            new ClientExtractPacket(42).Execute();
            foreach(var player in RecordingRoster.Snapshot()) RecordingRoster.Observe(player);
            var expected=die?PlayerStatus.Dead:complete?PlayerStatus.Extracted:PlayerStatus.Unspawned;
            var last=(TrackingPlayerDeadOrUnspawned)Telemetry.Packets.Last().Payload;
            check(last.status==expected && last.profileId=="remote", "native confirmation survives disposal, death or intermediate removal");
            count=Telemetry.Packets.Count;
            new ClientExtractPacket(42).Execute();RecordingRoster.Finish();
            check(Telemetry.Packets.Count==count, "duplicate extraction packet emits no duplicate transition");
        }
        RecordingRoster.Reset();Telemetry.Packets.Clear();
        remote=new(){ProfileId="disconnect"};RecordingRoster.Add(remote);RecordingRoster.Depart(remote);RecordingRoster.Observe(remote);
        check(((TrackingPlayerDeadOrUnspawned)Telemetry.Packets.Last().Payload).status==PlayerStatus.Unspawned,
            "ordinary disconnect remains Removed");
        foreach(var excluded in new[]{"disabled","dead","bot","new-session","throws"})
        {
            RecordingRoster.Reset();Telemetry.Packets.Clear();
            remote=new(){ProfileId=excluded,IsAI=excluded=="bot"};
            if(excluded=="dead") remote.HealthController.IsAlive=false;
            manager.CoopHandler=new();manager.CoopHandler.Players[42]=remote;
            manager.CoopHandler.ChangeSession=excluded=="new-session";
            manager.CoopHandler.Fail=excluded=="throws";
            RecordingRoster.Add(remote);
            RAID_REVIEW.RAID_REVIEW.CanCapture=excluded!="disabled";
            try {new ClientExtractPacket(42).Execute();} catch(InvalidOperationException) {}
            RAID_REVIEW.RAID_REVIEW.CanCapture=true;
            foreach(var player in RecordingRoster.Snapshot()) RecordingRoster.Observe(player);
            check(!Telemetry.Packets.Any(p=>p.Payload is TrackingPlayerDeadOrUnspawned s && s.status==PlayerStatus.Extracted),
                "no fabricated extraction for "+excluded);
        }
        Singleton<IFikaNetworkManager>.Instance=null;new ClientExtractPacket(42).Execute();
        Singleton<IFikaNetworkManager>.Instance=new TestNetworkManager{CoopHandler=null};new ClientExtractPacket(42).Execute();
        check(LoggerInstance.Log.Errors.Count==0,"missing network context is harmless");
        RecordingRoster.Reset();Telemetry.Packets.Clear();RAID_REVIEW.RAID_REVIEW.sessionId="session";
        TeardownTests(check);
    }

    private static void TeardownTests(Action<bool,string> check)
    {
        foreach(var entry in new[]{"Stop", "StopFromCancel", "CleanUp", "Dispose"})
        {
            RecordingRoster.Reset();Telemetry.Packets.Clear();
            var bots=Enumerable.Range(0,12).Select(i=>new Player{ProfileId="bot-"+i,IsAI=true}).ToArray();
            foreach(var bot in bots) { RecordingRoster.Add(bot);RecordingRoster.Observe(bot); }
            var dead=new Player{ProfileId="dead"};
            var extracted=new Player{ProfileId="extracted"};
            var disconnected=new Player{ProfileId="disconnected"};
            foreach(var p in new[]{dead,extracted,disconnected}) { RecordingRoster.Add(p);RecordingRoster.Observe(p); }
            // Real events immediately before raid end must survive the final sample.
            dead.HealthController.IsAlive=false;
            RecordingRoster.Confirm(extracted,PlayerStatus.Extracted);
            RecordingRoster.Depart(disconnected);
            var game=new Fika.Core.Main.GameMode.CoopGame();
            game.Cleanup=()=>
            {
                check(!RAID_REVIEW.RAID_REVIEW.CanCapture,"capture closes before native "+entry);
                foreach(var bot in bots)
                {
                    RecordingRoster.Depart(bot);
                    bot.Destroyed=true;bot.HealthController=null;
                    RecordingRoster.Observe(bot);
                    // Teardown callbacks must not invent deaths/extractions either.
                    RecordingRoster.Confirm(bot.ProfileId,PlayerStatus.Dead);
                    RecordingRoster.Confirm(bot.ProfileId,PlayerStatus.Extracted);
                }
                new ObservedPlayer{ProfileId="remote"}.OnItemAddedOrRemoved(new Item(),new ItemAddress(),true);
                check(RecordingRoster.Snapshot().Count==0,"no disposed players returned to capture loop");
            };
            switch(entry)
            {
                case "Stop": game.Stop("host",ExitStatus.Survived,"exit");break;
                case "StopFromCancel": game.StopFromCancel("host",ExitStatus.Killed);break;
                case "CleanUp": game.CleanUp();break;
                default: game.Dispose();break;
            }
            check(game.CleanupCalls==1,"native teardown still executes");
            RecordingRoster.Finish();RecordingRoster.Finish(false);RecordingRoster.BeginTeardown();
            var statuses=Telemetry.Packets.Select(p=>p.Payload).OfType<TrackingPlayerDeadOrUnspawned>().ToArray();
            foreach(var bot in bots)
                check(statuses.Single(s=>s.profileId==bot.ProfileId).status==PlayerStatus.Alive,"Snoops survivor remains Alive");
            check(statuses.Last(s=>s.profileId=="dead").status==PlayerStatus.Dead,"actual death before cleanup retained");
            check(statuses.Last(s=>s.profileId=="extracted").status==PlayerStatus.Extracted,"actual extraction before cleanup retained");
            check(statuses.Last(s=>s.profileId=="disconnected").status==PlayerStatus.Unspawned,"actual disconnect before cleanup retained");
            check(!Telemetry.Packets.Any(p=>p.Action=="LOOT"),"inventory destruction is not raid loot");
            RecordingRoster.Reset();
            check(RAID_REVIEW.RAID_REVIEW.CanCapture,"next raid resumes capture");
            RAID_REVIEW.RAID_REVIEW.CanCapture=false;
            new Fika.Core.Main.GameMode.CoopGame().Dispose();
            check(!RecordingRoster.IsEnding,"menu disposal cannot freeze next recording");
            RAID_REVIEW.RAID_REVIEW.CanCapture=true;
        }
        RecordingRoster.Reset();Telemetry.Packets.Clear();
    }
}

// Fika runtime doubles: keep the real struct, virtual override and disposal order.
namespace Fika.Core.Main.Players
{
    public class ObservedPlayer : Player
    {
        public bool CallBase;
        [System.Runtime.CompilerServices.MethodImpl(System.Runtime.CompilerServices.MethodImplOptions.NoInlining)]
        public override void OnItemAddedOrRemoved(Item item, ItemAddress location, bool added)
        { if(CallBase) base.OnItemAddedOrRemoved(item,location,added); }
    }
}
namespace Fika.Core.Main.GameMode
{
    public class CoopGame
    {
        public Action Cleanup=()=>{};
        public int CleanupCalls;
        [System.Runtime.CompilerServices.MethodImpl(System.Runtime.CompilerServices.MethodImplOptions.NoInlining)]
        public void Stop(string profileId,ExitStatus exitStatus,string exitName,float delay=0f) { CleanupCalls++;Cleanup(); }
        [System.Runtime.CompilerServices.MethodImpl(System.Runtime.CompilerServices.MethodImplOptions.NoInlining)]
        public void StopFromCancel(string profileId,ExitStatus exitStatus) { CleanupCalls++;Cleanup(); }
        [System.Runtime.CompilerServices.MethodImpl(System.Runtime.CompilerServices.MethodImplOptions.NoInlining)]
        public void CleanUp() { CleanupCalls++;Cleanup(); }
        [System.Runtime.CompilerServices.MethodImpl(System.Runtime.CompilerServices.MethodImplOptions.NoInlining)]
        public void Dispose() { CleanupCalls++;Cleanup(); }
    }
}
namespace Fika.Core.Networking
{
    public interface IFikaNetworkManager { TestCoopHandler CoopHandler {get;} }
    public class TestNetworkManager : IFikaNetworkManager { public TestCoopHandler CoopHandler {get;set;}=new(); }
    public class TestCoopHandler
    {
        public Dictionary<int,ObservedPlayer> Players {get;}=new();
        public List<int> ExtractedPlayers {get;}=new();
        public bool Complete=true, TickDuringDispose, DieDuringExtract, ChangeSession, Fail;
    }
}
namespace Fika.Core.Networking.Packets.Generic.SubPackets
{
    public readonly struct ClientExtractPacket(int netId)
    {
        public readonly int NetId=netId;
        [System.Runtime.CompilerServices.MethodImpl(System.Runtime.CompilerServices.MethodImplOptions.NoInlining)]
        public void Execute()
        {
            var handler=Singleton<IFikaNetworkManager>.Instance?.CoopHandler;
            if(handler==null || !handler.Players.Remove(NetId,out var player)) return;
            if(handler.Fail) throw new InvalidOperationException("native operation failed");
            if(handler.Complete) handler.ExtractedPlayers.Add(NetId);
            if(handler.DieDuringExtract) RecordingRoster.Confirm(player,PlayerStatus.Dead);
            RecordingRoster.Depart(player);
            player.Destroyed=true;player.HealthController=null;player.ProfileId="reused-object";
            if(handler.TickDuringDispose) RecordingRoster.Snapshot();
            if(handler.ChangeSession) RAID_REVIEW.RAID_REVIEW.sessionId+="-next";
        }
    }
}

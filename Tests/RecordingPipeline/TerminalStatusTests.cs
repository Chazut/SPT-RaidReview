using EFT;
using RAID_REVIEW;
using System.Reflection;

internal static class TerminalStatusTests
{
    static object Invoke(Type type, string method, object instance, params object[] args) =>
        type.GetMethod(method, BindingFlags.NonPublic | BindingFlags.Instance | BindingFlags.Static)!.Invoke(instance, args);
    static PlayerStatus Last() => ((TrackingPlayerDeadOrUnspawned)Telemetry.Packets.Last().Payload).status;
    internal static void Run(Action<bool,string> check)
    {
        foreach(var name in new[]{"Alex", "Kita"})
        {
            RecordingRoster.Reset(); Telemetry.Packets.Clear();
            var player=new Player{ProfileId=name};player.HealthController.IsAlive=false;
            RecordingRoster.Seed(new GameWorld{AllPlayersEverExisted=new(){player}});
            check(!RecordingRoster.Observe(player)&&Last()==PlayerStatus.Dead,"early death without killer: "+name);
            player.HealthController=null;RecordingRoster.Depart(player);RecordingRoster.Observe(player);
            check(Last()==PlayerStatus.Dead&&Telemetry.Packets.Count==1,"disposal cannot erase confirmed death");
        }
        RecordingRoster.Reset();Telemetry.Packets.Clear();
        var p=new Player{ProfileId="death-before-capture"};RecordingRoster.Add(p);
        check(Invoke(typeof(RecordingDeathPatch),"GetTargetMethod",new RecordingDeathPatch()) is MethodInfo,"death patch binds actual signature");
        Invoke(typeof(RecordingDeathPatch),"Prefix",null,p);p.HealthController=null;
        RecordingRoster.Depart(p);RecordingRoster.Observe(p);
        check(Last()==PlayerStatus.Dead,"death callback survives health disposal before capture");
        foreach(var completed in new[]{false,true})
        foreach(var destroyed in new[]{false,true})
        foreach(var death in new[]{false,true})
        {
            RecordingRoster.Reset();Telemetry.Packets.Clear();p=new Player{ProfileId="exfil"};RecordingRoster.Add(p);
            RecordingRoster.Observe(p);
            var leave=new BotLeaveData(new BotOwner{GetPlayer=p});
            check(Invoke(typeof(RecordingExtractPatch),"GetTargetMethod",new RecordingExtractPatch()) is MethodInfo,"exfil finds inherited owner field");
            object[] prefix={leave,null};Invoke(typeof(RecordingExtractPatch),"Prefix",null,prefix);
            check((string)prefix[1]=="exfil","live exfil identity captured before teardown");
            if(death) Invoke(typeof(RecordingDeathPatch),"Prefix",null,p);
            RecordingRoster.Depart(p);p.HealthController=null;leave.LeaveComplete=completed;
            p.Destroyed=destroyed;
            Invoke(typeof(RecordingExtractPatch),"Postfix",null,leave,prefix[1]);
            foreach(var current in RecordingRoster.Snapshot()) RecordingRoster.Observe(current);
            var expected=death?PlayerStatus.Dead:completed?PlayerStatus.Extracted:PlayerStatus.Unspawned;
            check(Last()==expected,"death/success/failure preserved after live or destroyed component");
            var packet=(TrackingPlayerDeadOrUnspawned)Telemetry.Packets.Last().Payload;
            check(packet.profileId=="exfil","status retains original profile identity");
            var count=Telemetry.Packets.Count;
            RecordingRoster.Finish();RecordingRoster.Finish(false);
            check(Telemetry.Packets.Count==count,"terminal status emitted once including headless finish");
        }
        RecordingRoster.Reset();Telemetry.Packets.Clear();
        p=new Player{ProfileId="before-pool"};RecordingRoster.Add(p);
        var pooledLeave=new BotLeaveData(new BotOwner{GetPlayer=p});
        object[] pooledPrefix={pooledLeave,null};Invoke(typeof(RecordingExtractPatch),"Prefix",null,pooledPrefix);
        RecordingRoster.Depart(p);p.Destroyed=true;p.ProfileId="recycled-profile";pooledLeave.LeaveComplete=true;
        Invoke(typeof(RecordingExtractPatch),"Postfix",null,pooledLeave,pooledPrefix[1]);RecordingRoster.Snapshot();
        check(Last()==PlayerStatus.Extracted && ((TrackingPlayerDeadOrUnspawned)Telemetry.Packets.Last().Payload).profileId=="before-pool",
            "pool identity changes cannot redirect confirmation");
        foreach(var alive in new[]{false,true})
        {
            RecordingRoster.Reset();Telemetry.Packets.Clear();
            p=new Player{ProfileId="no-success"};p.HealthController.IsAlive=alive;RecordingRoster.Add(p);
            var leave=new BotLeaveData(new BotOwner{GetPlayer=p});object[] prefix={leave,null};
            RAID_REVIEW.RAID_REVIEW.CanCapture=false;
            Invoke(typeof(RecordingExtractPatch),"Prefix",null,prefix);
            check(prefix[1]==null,"extraction outside capture has no identity");
            RAID_REVIEW.RAID_REVIEW.CanCapture=true;
            Invoke(typeof(RecordingExtractPatch),"Prefix",null,prefix);
            check((prefix[1]!=null)==alive,"only living players qualify for extraction");
            // No postfix represents a native exception, so no success may be inferred.
            RecordingRoster.Depart(p);RecordingRoster.Observe(p);
            check(Last()==(alive?PlayerStatus.Unspawned:PlayerStatus.Dead),"failed extraction or dead entrant never becomes Extracted");
        }
        RecordingRoster.Reset();Telemetry.Packets.Clear();p=new Player{ProfileId="missing-health",HealthController=null};
        RecordingRoster.Add(p);RecordingRoster.Observe(p);check(Last()==PlayerStatus.Unknown,"missing health alone is unknown");
        RecordingRoster.Reset();Telemetry.Packets.Clear();p.HealthController=new();RecordingRoster.Add(p);RecordingRoster.Observe(p);
        check(Last()==PlayerStatus.Alive,"terminal evidence resets between raids");
        RAID_REVIEW.RAID_REVIEW.CanCapture=false;
        Invoke(typeof(RecordingDeathPatch),"Prefix",null,p);RecordingRoster.Observe(p);
        check(Last()==PlayerStatus.Alive,"callbacks outside recording ignored");
        RAID_REVIEW.RAID_REVIEW.CanCapture=true;
        RecordingRoster.Reset();Telemetry.Packets.Clear();
    }
}

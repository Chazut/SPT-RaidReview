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
        {
            RecordingRoster.Reset();Telemetry.Packets.Clear();p=new Player{ProfileId="exfil"};RecordingRoster.Add(p);
            var leave=new BotLeaveData(new BotOwner{GetPlayer=p});
            check(Invoke(typeof(RecordingExtractPatch),"GetTargetMethod",new RecordingExtractPatch()) is MethodInfo,"exfil finds inherited owner field");
            object[] prefix={leave,null};Invoke(typeof(RecordingExtractPatch),"Prefix",null,prefix);
            check(ReferenceEquals(prefix[1],p),"only living exfil entrant retained");
            RecordingRoster.Depart(p);p.HealthController=null;leave.LeaveComplete=completed;
            Invoke(typeof(RecordingExtractPatch),"Postfix",null,leave,prefix[1]);RecordingRoster.Observe(p);
            check(Last()==(completed?PlayerStatus.Extracted:PlayerStatus.Unspawned),"only completed native extraction is Extracted");
            RecordingRoster.Confirm(p,PlayerStatus.Dead);RecordingRoster.Confirm(p,PlayerStatus.Extracted);RecordingRoster.Observe(p);
            check(Last()==PlayerStatus.Dead,"confirmed death takes precedence over extraction");
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

using System.Collections.Concurrent;
using System.Text;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using RAID_REVIEW;
using RaidReview.WebSocket;
using RaidReview.Database;
using RaidReview.Session;
using RaidReview.FileSystem;

class Program
{
    private static int checks;
    static void Check(bool condition, string description)
    {
        if (!condition) throw new Exception(description);
        checks++;
    }
    static void Wait(Func<bool> condition) => Check(SpinWait.SpinUntil(condition, 5000), "worker timed out");
    static string Serialize(string action, object payload) => JsonConvert.SerializeObject(new WsPayload
        { Action=action, Payload=JsonConvert.SerializeObject(payload) });

    static async Task Main()
    {
        var owner = Environment.CurrentManagedThreadId;
        var output = new ConcurrentQueue<string>();
        using (var worker = new OrderedPacketSender(2048, (action,payload) =>
        {
            if (Environment.CurrentManagedThreadId == owner) throw new Exception("serialized on capture thread");
            return Serialize(action,payload);
        }, output.Enqueue, reason=>throw new Exception(reason)))
        {
            Check(worker.BeginRaid(), "start first raid");
            for (int i=0;i<500;i++) Check(worker.Enqueue(i==0 ? "START" : "POSITION_BATCH", new { n=i }), "accepted");
            worker.Enqueue("AIRDROP_FLIGHT", new { n=500 });
            worker.Enqueue("END", new { n=501 });
            Check(worker.BeginRaid(), "new raid may queue behind prior END");
            worker.Enqueue("START", new { n=502 });
            Wait(()=>worker.Snapshot().Sent==503);
            var packets=output.ToArray();
            Check(packets.Length==503,"all packets retained");
            for(int i=0;i<packets.Length;i++)
                Check(JObject.Parse(JObject.Parse(packets[i])["Payload"].Value<string>())["n"].Value<int>()==i,"FIFO order");
            Check(worker.Snapshot().Bytes>0 && worker.Snapshot().SerializeMs>0,"sender metrics");
            Check(!worker.Faulted && worker.Snapshot().Dropped==0,"normal stream complete");
        }
        using (var entered = new ManualResetEventSlim())
        using (var release = new ManualResetEventSlim())
        {
            int errors=0;
            using var worker = new OrderedPacketSender(2, Serialize, s=>{ entered.Set(); release.Wait(5000); }, _=>Interlocked.Increment(ref errors));
            worker.Enqueue("START", 0); Check(entered.Wait(5000),"transport blocked");
            worker.Enqueue("PLAYER", 1); worker.Enqueue("POSITION_BATCH", 2);
            Check(!worker.Enqueue("END",3),"overflow rejected");
            Check(worker.Faulted && errors==1,"overflow surfaced once");
            Check(worker.Snapshot().Dropped==3,"overflow counts queued loss");
            Check(!worker.BeginRaid(),"cannot reset while failed transport busy");
            release.Set(); Wait(()=>worker.Snapshot().Pending==0);
            Check(worker.BeginRaid(),"next raid can recover after drain");
            worker.Enqueue("START",4); Wait(()=>worker.Snapshot().Sent==2);
        }
        int failures=0;
        using (var failed = new OrderedPacketSender(4, Serialize, _=>throw new IOException("offline"), _=>Interlocked.Increment(ref failures)))
        {
            failed.Enqueue("START", 0); Wait(()=>failed.Faulted);
            Check(!failed.Enqueue("END",1),"no successful END after failure");
            Wait(()=>failures==1); Check(failed.Snapshot().Dropped>=1,"failed packet counted");
        }
        using (var badJson = new OrderedPacketSender(4, (_,__)=>throw new Exception("serialize"), _=>throw new Exception("must not send"), _=>{}))
        {
            badJson.Enqueue("START",0); Wait(()=>badJson.Faulted); Check(badJson.Snapshot().Sent==0,"serialization failure cannot send");
        }
        // Mutable records are cloned before queueing; vectors remain JSON strings for the database.
        var player=new TrackingPlayer { sessionId="s",profileId="p", name="Before" };
        var copy=player.Snapshot(); player.name="After"; Check(copy.name=="Before","player detached");
        var raid=new TrackingRaid { sessionId="s",exitName="Before" };var raidCopy=raid.Snapshot();raid.exitName="After";
        Check(raidCopy.exitName=="Before","raid detached");
        var ballistic=new TrackingBallistic { source=new JsonPosition(new UnityEngine.Vector3(1,2,3)) };
        var vector=JObject.Parse(JsonConvert.SerializeObject(ballistic))["source"];
        Check(vector.Type==JTokenType.String && JObject.Parse(vector.Value<string>())["x"].Value<float>()==1,"nested vector schema");

        // Ghosts remain registered and alive. Death/despawn retire records after one final observation.
        RecordingRoster.Reset(); Telemetry.Packets.Clear();
        var alive=new EFT.Player {ProfileId="ghost"}; var dead=new EFT.Player {ProfileId="dead",KillerId="killer"};dead.HealthController.IsAlive=false;
        var world=new EFT.GameWorld();world.AllPlayersEverExisted.AddRange(new[]{alive,dead});RecordingRoster.Seed(world);
        Check(RecordingRoster.Snapshot().Count==2,"initial historical seed");
        Check(RecordingRoster.Observe(alive),"alive ghost retained");Check(!RecordingRoster.Observe(dead),"dead retired");
        Check(RecordingRoster.Snapshot().Count==1,"history excluded from next tick");
        RecordingRoster.Observe(alive);Check(Telemetry.Packets.Count==2,"unchanged statuses coalesced");
        RecordingRoster.Depart(alive);Check(!RecordingRoster.Observe(alive),"live despawn retired");
        Check(((TrackingPlayerDeadOrUnspawned)Telemetry.Packets.Last().Payload).status==PlayerStatus.Unspawned,"despawn status");
        Check(RecordingRoster.Snapshot().Count==0,"empty active roster");
        var replacement=new EFT.Player {ProfileId="ghost"};RecordingRoster.Add(replacement);RecordingRoster.Depart(alive);
        Check(RecordingRoster.Observe(replacement),"late removal cannot retire replacement");
        RecordingRoster.Reset();Check(RecordingRoster.Snapshot().Count==0,"raid teardown releases players");

        await ServerCompatibility();
        Console.WriteLine($"PASS {checks} recording pipeline checks");
    }
    static async Task ServerCompatibility()
    {
        var db=new DatabaseService();var sessions=new SessionManager();var files=new DataFileService();var log=new RaidReview.RaidReviewLogger();
        var handler=new WsPacketHandler(db,sessions,files,log,new RaidReview.PostRaid.ItemResolver());
        async Task Packet(string action,object payload)=>await handler.HandleMessageAsync(Encoding.UTF8.GetBytes(Serialize(action,payload)));
        await Packet("START",new {sessionId="s",profileId="s"});
        Check(sessions.GetProfile("s").RaidId!=null,"server START session");
        var positions=new[]{new TrackingPlayerData("s","a",200,1,2,3,0,100,100,"Orbit:Guarding",true),new TrackingPlayerData("s","b",200,4,5,6,90,90,100)};
        await Packet("POSITION_BATCH",positions);
        Check(files.Writes.Count==1,"one buffered write per batch");
        var batch=files.Writes[0];
        await Packet("POSITION",positions[0]);await Packet("POSITION",positions[1]);
        Check(files.Writes[1].Header==batch.Header,"old and new header match");
        Check(files.Writes[1].Rows+files.Writes[2].Rows==batch.Rows,"sample schema, timestamps and ghost flag preserved");
        await Packet("POSITION_BATCH",Array.Empty<TrackingPlayerData>());
        Check(files.Writes.Count==3,"empty batch ignored");
        var other=new TrackingPlayerData("other","c",200,0,0,0,0,1,1);
        await Packet("POSITION_BATCH",new[]{positions[0],other});
        Check(files.Writes.Last().Rows==files.Writes[1].Rows,"cross session sample rejected");
        await Packet("AIRDROP_FLIGHT",new {sessionId="s",points=new[]{new {flightId="f",kind="end",dropId="",time=201,x=0,y=1,z=2,heading=3}}});
        Check(db.Sql.Any(s=>s.Contains("airdrop_flight")),"flight tail before END");
        foreach (var stage in new[] { "approach", "waiting", "loot" })
        {
            await Packet("ORBIT_MAIN_OBJECTIVES", new TrackingOrbitMainObjectives { sessionId="s", time=202,
                squads=new() { new() { squadId=3, memberProfileIds=new() { "a" }, mainObjectives=new() {
                    new() { type="Airdrop", airdropId="drop-1", airdropStage=stage, airdropLanded=stage=="loot",
                        campElapsed=20, campTargetDuration=60, x=10, y=2, z=30 } } } } });
            var wire=JArray.Parse((string)db.LastArgs.Single(a=>a.Item1=="$squads").Item2);
            var main=wire[0]["mainObjectives"][0];
            Check((string)main["type"]=="Airdrop" && (string)main["airdropStage"]==stage && (string)main["airdropId"]=="drop-1",
                "temporary objective stage and identity survive client serialization and server handler");
            Check((bool)main["airdropLanded"]==(stage=="loot") && (int)main["campTargetDuration"]==60,
                "landing gate and hold duration survive wire");
        }
        await Packet("ORBIT_MAIN_OBJECTIVES", new TrackingOrbitMainObjectives { sessionId="s", time=203, squads=new() });
        Check((string)db.LastArgs.Single(a=>a.Item1=="$squads").Item2=="[]","empty snapshot persisted to clear last temporary objective");
        var postProcess=false;handler.SetPostProcessingCallbacks(_=>{Check(files.Flushed,"flush before post processing");postProcess=true;},()=>{});
        await Packet("END",new {sessionId="s"});
        Check(postProcess && sessions.GetProfile("s").RaidId==null,"END closes first raid");
        await Packet("START",new {sessionId="s",profileId="s"});
        await Packet("POSITION_BATCH",positions);
        Check(files.Writes.Last().File!=batch.File,"next raid has own position stream");
        Check(log.Errors.Count==0,"no handler errors");
    }
}
